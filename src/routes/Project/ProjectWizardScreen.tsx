import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { PersonaMode } from '@shared/types'
import { buildCostEstimate, estimatePersonaGenerationTokens } from '@shared/cost'
import { DEFAULT_MODEL } from '@shared/models'
import { COMMON_COUNTRIES, COMMON_LANGUAGES } from '@shared/locales'
import ModelSelect from '@renderer/components/ModelSelect'
import MultiSelectTags from '@renderer/components/MultiSelectTags'

export default function ProjectWizardScreen(): JSX.Element {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [personaMode, setPersonaMode] = useState<PersonaMode>('project')
  const [personaCount, setPersonaCount] = useState(5)
  const [variance, setVariance] = useState(50)
  const [generationInstructions, setGenerationInstructions] = useState('')
  const [countries, setCountries] = useState<string[]>([])
  const [languages, setLanguages] = useState<string[]>([])
  const [audience, setAudience] = useState('')
  const [model, setModel] = useState(DEFAULT_MODEL)
  const [budgetTokens, setBudgetTokens] = useState(0)
  const [chatTokenLimit, setChatTokenLimit] = useState(0)
  const [cooldownSeconds, setCooldownSeconds] = useState(2)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.api.settings.getDefaultModel().then(setModel)
  }, [])

  const estimate = useMemo(() => {
    const { inputTokens, outputTokens } = estimatePersonaGenerationTokens(personaCount)
    return buildCostEstimate(model, inputTokens, outputTokens)
  }, [personaCount, model])

  const estimatedTotalTokens = estimate.estimatedInputTokens + estimate.estimatedOutputTokens
  const overBudget = budgetTokens > 0 && estimatedTotalTokens > budgetTokens

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const project = await window.api.projects.create({
        name,
        description,
        personaMode,
        personaCount,
        variance,
        generationInstructions,
        defaultCountries: countries,
        defaultLanguages: languages,
        defaultAudience: audience,
        model,
        budgetTokens,
        chatTokenLimit,
        cooldownSeconds
      })
      navigate(`/project/${project.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="screen">
      <header className="page-header">
        <h1>New project</h1>
        <button className="btn-secondary" onClick={() => navigate('/')}>
          Cancel
        </button>
      </header>

      <div className="wizard-layout">
        <form className="card wizard-form" onSubmit={handleSubmit}>
          <section>
            <h2>Basics</h2>
            <label htmlFor="name">Project name</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Checkout redesign"
              autoFocus
              disabled={submitting}
            />
            <label htmlFor="description">Description (optional)</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              disabled={submitting}
            />
          </section>

          <section>
            <h2>Persona panel</h2>

            <label>Persona scope</label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="personaMode"
                  checked={personaMode === 'project'}
                  onChange={() => setPersonaMode('project')}
                  disabled={submitting}
                />
                <div>
                  <strong>Shared panel</strong>
                  <p className="muted small">
                    Personas are generated once and reused across every trial. Cheaper, and lets you
                    compare product iterations with the same panel.
                  </p>
                </div>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="personaMode"
                  checked={personaMode === 'trial'}
                  onChange={() => setPersonaMode('trial')}
                  disabled={submitting}
                />
                <div>
                  <strong>Fresh per trial</strong>
                  <p className="muted small">
                    A new panel is generated for every trial. More tokens, but personas can be more
                    targeted to that specific trial's context.
                  </p>
                </div>
              </label>
            </div>

            <label htmlFor="personaCount">Persona count: {personaCount}</label>
            <input
              id="personaCount"
              type="range"
              min={1}
              max={30}
              value={personaCount}
              onChange={(e) => setPersonaCount(Number(e.target.value))}
              disabled={submitting}
            />

            <label htmlFor="variance">
              Variance: {variance} — {variance < 33 ? 'similar personas' : variance < 67 ? 'balanced' : 'highly varied'}
            </label>
            <input
              id="variance"
              type="range"
              min={0}
              max={100}
              value={variance}
              onChange={(e) => setVariance(Number(e.target.value))}
              disabled={submitting}
            />

            <label htmlFor="instructions">Custom instructions (optional)</label>
            <textarea
              id="instructions"
              value={generationInstructions}
              onChange={(e) => setGenerationInstructions(e.target.value)}
              rows={3}
              placeholder="e.g. Keep personas similar in age but vary income level. Focus on busy parents."
              disabled={submitting}
            />
          </section>

          <section>
            <h2>Audience defaults</h2>
            <p className="muted small">Leave blank for "any" — these seed persona generation, not a hard filter.</p>

            <label>Countries</label>
            <MultiSelectTags
              options={COMMON_COUNTRIES}
              selected={countries}
              onChange={setCountries}
              placeholder="Add a country…"
              disabled={submitting}
            />

            <label>Languages</label>
            <MultiSelectTags
              options={COMMON_LANGUAGES}
              selected={languages}
              onChange={setLanguages}
              placeholder="Add a language…"
              disabled={submitting}
            />

            <label htmlFor="audience">Target audience (optional)</label>
            <input
              id="audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g. B2B SaaS buyers, young parents, gamers"
              disabled={submitting}
            />
          </section>

          <section>
            <h2>Model &amp; budget</h2>

            <label htmlFor="model">Model</label>
            <ModelSelect id="model" value={model} onChange={setModel} disabled={submitting} />

            <label htmlFor="budget">Project token budget (0 = unlimited)</label>
            <input
              id="budget"
              type="number"
              min={0}
              step={1000}
              value={budgetTokens}
              onChange={(e) => setBudgetTokens(Math.max(0, Number(e.target.value)))}
              disabled={submitting}
            />

            <label htmlFor="chatLimit">Per-chat token limit (0 = unlimited)</label>
            <input
              id="chatLimit"
              type="number"
              min={0}
              step={1000}
              value={chatTokenLimit}
              onChange={(e) => setChatTokenLimit(Math.max(0, Number(e.target.value)))}
              disabled={submitting}
            />

            <label htmlFor="cooldown">Cooldown between persona generations: {cooldownSeconds}s</label>
            <input
              id="cooldown"
              type="range"
              min={0}
              max={15}
              value={cooldownSeconds}
              onChange={(e) => setCooldownSeconds(Number(e.target.value))}
              disabled={submitting}
            />
            <p className="muted small">
              Applies during "all at once" generation, and gates the "create another" button during
              one-by-one generation, to stay friendly to rate limits.
            </p>
          </section>

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={submitting || name.trim().length === 0}>
            {submitting ? 'Creating…' : 'Create project'}
          </button>
        </form>

        <aside className="card wizard-sidebar">
          <h2>Estimated panel cost</h2>
          <p className="muted small">Generating the initial {personaCount}-persona panel with {model}.</p>
          <dl className="detail-list">
            <dt>Input tokens</dt>
            <dd>~{estimate.estimatedInputTokens.toLocaleString()}</dd>
            <dt>Output tokens</dt>
            <dd>~{estimate.estimatedOutputTokens.toLocaleString()}</dd>
            <dt>Estimated cost</dt>
            <dd>${estimate.estimatedCostUsd.toFixed(4)}</dd>
          </dl>
          {overBudget && (
            <p className="error small">
              This exceeds your {budgetTokens.toLocaleString()}-token budget. Lower the persona count
              or raise the budget.
            </p>
          )}
          <p className="muted small">
            Rough estimate before any generation. Trial feedback and chat usage are billed and tracked
            separately.
          </p>
        </aside>
      </div>
    </div>
  )
}
