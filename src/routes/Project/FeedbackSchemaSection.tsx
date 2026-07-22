import { useState } from 'react'
import type { FeedbackSchema, Project } from '@shared/types'
import FeedbackSchemaEditor from '@renderer/components/FeedbackSchemaEditor'

interface FeedbackSchemaSectionProps {
  project: Project
  onProjectUpdate: (project: Project) => void
}

export default function FeedbackSchemaSection({
  project,
  onProjectUpdate
}: FeedbackSchemaSectionProps): JSX.Element {
  const [instructions, setInstructions] = useState('')
  const [draftSchema, setDraftSchema] = useState<FeedbackSchema | null>(null)
  const [editing, setEditing] = useState(false)
  const [drafting, setDrafting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const savedSchema = project.defaultFeedbackSchema

  async function handleDraft(): Promise<void> {
    setDrafting(true)
    setError(null)
    try {
      const schema = await window.api.feedbackSchema.draft(project.id, instructions)
      setDraftSchema(schema)
      setEditing(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setDrafting(false)
    }
  }

  async function handleSave(): Promise<void> {
    if (!draftSchema) return
    setSaving(true)
    setError(null)
    try {
      await window.api.projects.setDefaultFeedbackSchema(project.id, draftSchema)
      onProjectUpdate({ ...project, defaultFeedbackSchema: draftSchema })
      setEditing(false)
      setDraftSchema(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  function cancelEditing(): void {
    setEditing(false)
    setDraftSchema(null)
    setError(null)
  }

  if (editing && draftSchema) {
    return (
      <section className="card" style={{ marginTop: 16 }}>
        <h2>Feedback schema</h2>
        <FeedbackSchemaEditor schema={draftSchema} onChange={setDraftSchema} disabled={saving} />
        {error && <p className="error">{error}</p>}
        <div className="button-row" style={{ marginTop: 12 }}>
          <button onClick={handleSave} disabled={saving || draftSchema.fields.length === 0}>
            {saving ? 'Saving…' : 'Save schema'}
          </button>
          <button className="btn-secondary" onClick={handleDraft} disabled={drafting || saving}>
            {drafting ? 'Redrafting…' : 'Regenerate from instructions'}
          </button>
          <button className="btn-secondary" onClick={cancelEditing} disabled={saving}>
            Cancel
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="card" style={{ marginTop: 16 }}>
      <h2>Feedback schema</h2>
      {savedSchema ? (
        <>
          <p className="muted small">
            Personas will be asked these fields during trials, plus freeform comments.
          </p>
          <ul className="schema-field-list">
            {savedSchema.fields.map((f) => (
              <li key={f.key}>
                <strong>{f.label}</strong>{' '}
                <span className="muted small">
                  ({f.type}
                  {f.required ? ', required' : ''})
                </span>
              </li>
            ))}
          </ul>
          <button
            className="btn-secondary"
            onClick={() => {
              setDraftSchema(savedSchema)
              setEditing(true)
            }}
          >
            Edit schema
          </button>
        </>
      ) : (
        <>
          <p className="muted small">
            Describe what you want feedback on and a lead agent will draft a structured schema — you
            confirm or edit it before it's used in trials.
          </p>
          <textarea
            rows={2}
            placeholder="e.g. Ask about likelihood to buy, price sensitivity, and biggest point of confusion"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            disabled={drafting}
          />
          {error && <p className="error">{error}</p>}
          <button onClick={handleDraft} disabled={drafting} style={{ marginTop: 8 }}>
            {drafting ? 'Drafting…' : 'Draft feedback schema'}
          </button>
        </>
      )}
    </section>
  )
}
