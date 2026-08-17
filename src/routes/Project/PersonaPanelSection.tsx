import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Persona, Project } from '@shared/types'
import PersonaCard from '@renderer/components/PersonaCard'
import { runCooldown } from '@renderer/lib/cooldown'

type RunMode = 'oneByOne' | 'allAtOnce'

interface PersonaPanelSectionProps {
  project: Project
  /** null = the project's shared panel; a trial id = that trial's own fresh panel. */
  trialId?: string | null
  /** Notified whenever the persona list changes, so a parent (e.g. a trial workspace) can react. */
  onPersonasChanged?: (personas: Persona[]) => void
}

export default function PersonaPanelSection({
  project,
  trialId = null,
  onPersonasChanged
}: PersonaPanelSectionProps): JSX.Element {
  const navigate = useNavigate()
  const [personas, setPersonas] = useState<Persona[] | null>(null)
  const [runMode, setRunMode] = useState<RunMode>('oneByOne')
  const [generating, setGenerating] = useState(false)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [summarizing, setSummarizing] = useState(false)
  const stopRef = useRef(false)

  async function load(): Promise<void> {
    const [list, sum] = await Promise.all([
      window.api.personas.list(project.id, trialId),
      window.api.personas.getPanelSummary(project.id, trialId)
    ])
    setPersonas(list)
    setSummary(sum)
    onPersonasChanged?.(list)
  }

  useEffect(() => {
    load()
  }, [project.id, trialId])

  async function generateOne(): Promise<boolean> {
    const budget = await window.api.personas.getBudgetStatus(project.id, trialId)
    if (!budget.withinBudget) {
      setError(
        `Budget exceeded (${budget.usedTokens.toLocaleString()} / ${budget.budgetTokens.toLocaleString()} tokens used). Raise the budget to generate more.`
      )
      return false
    }
    try {
      const persona = await window.api.personas.generateNext(project.id, trialId)
      setPersonas((prev) => {
        const next = [...(prev ?? []), persona]
        onPersonasChanged?.(next)
        return next
      })
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return false
    }
  }

  async function handleOneByOne(): Promise<void> {
    setError(null)
    setGenerating(true)
    const ok = await generateOne()
    setGenerating(false)

    if (ok && project.cooldownSeconds > 0) {
      stopRef.current = false
      await runCooldown(project.cooldownSeconds, setCooldownRemaining, stopRef)
    }
  }

  async function handleAllAtOnce(): Promise<void> {
    setError(null)
    setGenerating(true)
    stopRef.current = false

    const remaining = project.personaCount - (personas?.length ?? 0)
    for (let i = 0; i < remaining; i++) {
      if (stopRef.current) break
      const ok = await generateOne()
      if (!ok) break
      if (i < remaining - 1 && project.cooldownSeconds > 0 && !stopRef.current) {
        await runCooldown(project.cooldownSeconds, setCooldownRemaining, stopRef)
      }
    }

    setCooldownRemaining(0)
    setGenerating(false)
  }

  function handleStop(): void {
    stopRef.current = true
  }

  async function handleSummarize(): Promise<void> {
    setSummarizing(true)
    setError(null)
    try {
      const text = await window.api.personas.generatePanelSummary(project.id, trialId)
      setSummary(text)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSummarizing(false)
    }
  }

  if (personas === null) {
    return (
      <section className="detail-section">
        <h2>Persona panel</h2>
        <p className="muted">Loading…</p>
      </section>
    )
  }

  const remaining = project.personaCount - personas.length

  return (
    <section className="detail-section">
      <h2>Persona panel</h2>

      {personas.length > 0 && (
        <div className="persona-grid">
          {personas.map((p) => (
            <PersonaCard
              key={p.id}
              persona={p}
              onChat={() =>
                navigate(
                  trialId
                    ? `/project/${project.id}/trial/${trialId}/chat/${p.id}`
                    : `/project/${project.id}/chat/${p.id}`
                )
              }
            />
          ))}
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {remaining > 0 && (
        <div className="button-row" style={{ marginTop: 16, flexWrap: 'wrap' }}>
          {personas.length === 0 && (
            <div className="button-row" style={{ marginRight: 16 }}>
              <label className="small">
                <input
                  type="radio"
                  checked={runMode === 'oneByOne'}
                  onChange={() => setRunMode('oneByOne')}
                  disabled={generating}
                />{' '}
                One by one
              </label>
              <label className="small">
                <input
                  type="radio"
                  checked={runMode === 'allAtOnce'}
                  onChange={() => setRunMode('allAtOnce')}
                  disabled={generating}
                />{' '}
                All at once
              </label>
            </div>
          )}

          {runMode === 'oneByOne' ? (
            <button onClick={handleOneByOne} disabled={generating || cooldownRemaining > 0}>
              {generating
                ? 'Generating…'
                : cooldownRemaining > 0
                  ? `Wait ${cooldownRemaining}s…`
                  : `Create persona ${personas.length + 1} of ${project.personaCount}`}
            </button>
          ) : (
            <>
              <button onClick={handleAllAtOnce} disabled={generating}>
                {generating
                  ? cooldownRemaining > 0
                    ? `Cooling down (${cooldownRemaining}s)…`
                    : 'Generating…'
                  : `Generate remaining ${remaining} persona${remaining === 1 ? '' : 's'}`}
              </button>
              {generating && (
                <button className="btn-secondary" onClick={handleStop}>
                  Stop
                </button>
              )}
            </>
          )}
        </div>
      )}

      {remaining <= 0 && personas.length > 0 && (
        <p className="muted small" style={{ marginTop: 12 }}>
          Panel target reached ({project.personaCount} personas).
        </p>
      )}

      {personas.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {summary ? (
            <div className="callout">
              <h3>Panel summary</h3>
              <p>{summary}</p>
            </div>
          ) : (
            <button onClick={handleSummarize} disabled={summarizing || generating}>
              {summarizing
                ? 'Summarizing…'
                : `Generate panel summary (${personas.length} persona${personas.length === 1 ? '' : 's'})`}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
