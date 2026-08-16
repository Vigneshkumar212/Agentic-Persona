import { useEffect, useMemo, useRef, useState } from 'react'
import type { Feedback, FeedbackField, FieldAggregate, Persona, Project, Trial } from '@shared/types'
import { computeAllAggregates, latestRoundFeedback } from '@shared/aggregate'
import { runCooldown } from '@renderer/lib/cooldown'

type RunMode = 'oneByOne' | 'allAtOnce'

interface FeedbackCollectionSectionProps {
  project: Project
  trial: Trial
  personas: Persona[]
  onTrialUpdate: (trial: Trial) => void
}

function renderAggregate(agg: FieldAggregate): JSX.Element {
  switch (agg.type) {
    case 'rating':
      return (
        <p className="small">
          Average <strong>{agg.average}</strong> (n={agg.count}, range {agg.min}–{agg.max})
        </p>
      )
    case 'boolean':
      return (
        <p className="small">
          {agg.trueCount} yes · {agg.falseCount} no
        </p>
      )
    case 'enum':
    case 'tags': {
      const total = Object.values(agg.counts).reduce((a, b) => a + b, 0) || 1
      return (
        <div>
          {Object.entries(agg.counts).map(([label, count]) => (
            <div key={label} className="bar-row">
              <span className="bar-label small">
                {label} ({count})
              </span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${(count / total) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )
    }
    case 'text':
      return <p className="muted small">{agg.count} responses — see individual feedback below.</p>
  }
}

export default function FeedbackCollectionSection({
  project,
  trial,
  personas,
  onTrialUpdate
}: FeedbackCollectionSectionProps): JSX.Element {
  const [feedbackList, setFeedbackList] = useState<Feedback[] | null>(null)
  const [runMode, setRunMode] = useState<RunMode>('oneByOne')
  const [collecting, setCollecting] = useState(false)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const [extraInstructions, setExtraInstructions] = useState('')
  const [summarizing, setSummarizing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportedPath, setExportedPath] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const stopRef = useRef(false)

  useEffect(() => {
    window.api.trials.listFeedback(trial.id).then(setFeedbackList)
  }, [trial.id])

  const latestRound = useMemo(() => {
    if (!feedbackList || feedbackList.length === 0) return 0
    return Math.max(...feedbackList.map((f) => f.round))
  }, [feedbackList])

  const respondedPersonaIds = useMemo(() => {
    if (!feedbackList) return new Set<string>()
    return new Set(feedbackList.filter((f) => f.round === latestRound).map((f) => f.personaId))
  }, [feedbackList, latestRound])

  const remainingPersonas = personas.filter((p) => !respondedPersonaIds.has(p.id))
  const roundComplete = personas.length > 0 && remainingPersonas.length === 0

  async function generateOne(personaId: string): Promise<boolean> {
    const budget = await window.api.personas.getBudgetStatus(project.id, trial.id)
    if (!budget.withinBudget) {
      setError(
        `Per-trial budget exceeded (${budget.usedTokens.toLocaleString()} / ${budget.budgetTokens.toLocaleString()} tokens used). Raise the project's budget to continue.`
      )
      return false
    }
    try {
      const feedback = await window.api.trials.collectFeedback(
        trial.id,
        personaId,
        extraInstructions.trim() || undefined
      )
      setFeedbackList((prev) => [...(prev ?? []), feedback])
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return false
    }
  }

  async function handleOneByOne(): Promise<void> {
    const targets = roundComplete ? personas : remainingPersonas
    if (targets.length === 0) return
    setError(null)
    setCollecting(true)
    const ok = await generateOne(targets[0].id)
    setCollecting(false)
    if (ok && project.cooldownSeconds > 0) {
      stopRef.current = false
      await runCooldown(project.cooldownSeconds, setCooldownRemaining, stopRef)
    }
  }

  async function handleAllAtOnce(): Promise<void> {
    const targets = roundComplete ? personas : remainingPersonas
    setError(null)
    setCollecting(true)
    stopRef.current = false

    for (let i = 0; i < targets.length; i++) {
      if (stopRef.current) break
      const ok = await generateOne(targets[i].id)
      if (!ok) break
      if (i < targets.length - 1 && project.cooldownSeconds > 0 && !stopRef.current) {
        await runCooldown(project.cooldownSeconds, setCooldownRemaining, stopRef)
      }
    }

    setCooldownRemaining(0)
    setCollecting(false)
  }

  function handleStop(): void {
    stopRef.current = true
  }

  async function handleSummarize(): Promise<void> {
    setSummarizing(true)
    setError(null)
    try {
      const summary = await window.api.trials.generateSummary(trial.id)
      onTrialUpdate({ ...trial, summary, status: 'complete' })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSummarizing(false)
    }
  }

  async function handleExport(): Promise<void> {
    setExporting(true)
    setError(null)
    setExportedPath(null)
    try {
      const path = await window.api.trials.exportMarkdown(trial.id)
      setExportedPath(path)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setExporting(false)
    }
  }

  if (feedbackList === null) {
    return (
      <section className="detail-section">
        <h2>Feedback</h2>
        <p className="muted">Loading…</p>
      </section>
    )
  }

  if (personas.length === 0) {
    return (
      <section className="detail-section">
        <h2>Feedback</h2>
        <p className="muted">Generate the persona panel above before collecting feedback.</p>
      </section>
    )
  }

  const latest = latestRoundFeedback(feedbackList)
  const aggregates = trial.feedbackSchema ? computeAllAggregates(trial.feedbackSchema, latest) : {}
  const personaById = new Map(personas.map((p) => [p.id, p]))

  return (
    <section className="detail-section">
      <h2>Feedback{latestRound > 0 ? ` — round ${latestRound}` : ''}</h2>

      {error && <p className="error">{error}</p>}

      {!roundComplete && (
        <div className="button-row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
          {feedbackList.length === 0 && (
            <div className="button-row" style={{ marginRight: 16 }}>
              <label className="small">
                <input
                  type="radio"
                  checked={runMode === 'oneByOne'}
                  onChange={() => setRunMode('oneByOne')}
                  disabled={collecting}
                />{' '}
                One by one
              </label>
              <label className="small">
                <input
                  type="radio"
                  checked={runMode === 'allAtOnce'}
                  onChange={() => setRunMode('allAtOnce')}
                  disabled={collecting}
                />{' '}
                All at once
              </label>
            </div>
          )}

          {runMode === 'oneByOne' ? (
            <button onClick={handleOneByOne} disabled={collecting || cooldownRemaining > 0}>
              {collecting
                ? 'Collecting…'
                : cooldownRemaining > 0
                  ? `Wait ${cooldownRemaining}s…`
                  : `Collect feedback (${personas.length - remainingPersonas.length + 1} of ${personas.length})`}
            </button>
          ) : (
            <>
              <button onClick={handleAllAtOnce} disabled={collecting}>
                {collecting
                  ? cooldownRemaining > 0
                    ? `Cooling down (${cooldownRemaining}s)…`
                    : 'Collecting…'
                  : `Collect feedback from ${remainingPersonas.length} persona${remainingPersonas.length === 1 ? '' : 's'}`}
              </button>
              {collecting && (
                <button className="btn-secondary" onClick={handleStop}>
                  Stop
                </button>
              )}
            </>
          )}
        </div>
      )}

      {roundComplete && (
        <>
          <p className="muted small" style={{ marginTop: 12 }}>
            All {personas.length} personas have responded for round {latestRound}.
          </p>

          {trial.feedbackSchema && (
            <div className="results-grid">
              {trial.feedbackSchema.fields.map((f: FeedbackField) => (
                <div key={f.key}>
                  <h3>{f.label}</h3>
                  {renderAggregate(aggregates[f.key])}
                </div>
              ))}
            </div>
          )}

          {trial.summary ? (
            <div className="callout" style={{ marginTop: 16 }}>
              <h3>Summary</h3>
              <p>{trial.summary.narrative}</p>
            </div>
          ) : (
            <button onClick={handleSummarize} disabled={summarizing} style={{ marginTop: 16 }}>
              {summarizing ? 'Summarizing…' : 'Generate narrative summary'}
            </button>
          )}

          <div className="button-row" style={{ marginTop: 16 }}>
            <button className="btn-secondary" onClick={handleExport} disabled={exporting}>
              {exporting ? 'Exporting…' : 'Export as Markdown'}
            </button>
          </div>
          {exportedPath && <p className="muted small">Saved to {exportedPath}</p>}

          <div className="detail-section" style={{ marginTop: 24 }}>
            <h3>Follow-up round</h3>
            <p className="muted small">
              Update the documents above or add notes, then re-run to see how feedback changes.
            </p>
            <textarea
              rows={2}
              placeholder="e.g. We simplified the pricing tiers based on round 1 feedback — re-evaluate"
              value={extraInstructions}
              onChange={(e) => setExtraInstructions(e.target.value)}
              disabled={collecting}
            />
            <div className="button-row" style={{ marginTop: 8 }}>
              <button onClick={handleOneByOne} disabled={collecting || cooldownRemaining > 0}>
                {collecting ? 'Collecting…' : 'Run follow-up, one by one'}
              </button>
              <button className="btn-secondary" onClick={handleAllAtOnce} disabled={collecting}>
                {collecting ? 'Collecting…' : 'Run follow-up, all at once'}
              </button>
              {collecting && (
                <button className="btn-secondary" onClick={handleStop}>
                  Stop
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {latest.length > 0 && (
        <div className="detail-section">
          <h3>Individual feedback</h3>
          <div className="persona-grid">
            {latest.map((f) => {
              const persona = personaById.get(f.personaId)
              return (
                <div key={f.id} className="persona-card">
                  <h3>{persona?.name ?? 'Unknown persona'}</h3>
                  {trial.feedbackSchema?.fields.map((field) => {
                    const value = f.structured[field.key]
                    if (value === undefined) return null
                    return (
                      <p key={field.key} className="small">
                        <strong>{field.label}:</strong> {Array.isArray(value) ? value.join(', ') : String(value)}
                      </p>
                    )
                  })}
                  {f.freeformText && <p className="small">{f.freeformText}</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
