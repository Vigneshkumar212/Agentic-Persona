import { FormEvent, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

export default function TrialWizardScreen(): JSX.Element {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [explanation, setExplanation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!projectId) return
    setSubmitting(true)
    setError(null)

    try {
      const trial = await window.api.trials.create({ projectId, name, explanation })
      navigate(`/project/${projectId}/trial/${trial.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="screen">
      <header className="page-header">
        <h1>New trial</h1>
        <button className="btn-secondary" onClick={() => navigate(`/project/${projectId}`)}>
          Cancel
        </button>
      </header>

      <form className="setup-content" onSubmit={handleSubmit}>
        <label htmlFor="name">Trial name</label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Pricing page v2"
          autoFocus
          disabled={submitting}
        />

        <label htmlFor="explanation">What are you testing? (optional)</label>
        <textarea
          id="explanation"
          rows={4}
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="e.g. A redesigned pricing page with three tiers instead of two. Focus on whether the new tier structure is confusing."
          disabled={submitting}
        />
        <p className="muted small">
          You'll upload supporting documents and confirm the feedback schema on the next screen.
        </p>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={submitting || name.trim().length === 0}>
          {submitting ? 'Creating…' : 'Create trial'}
        </button>
      </form>
    </div>
  )
}
