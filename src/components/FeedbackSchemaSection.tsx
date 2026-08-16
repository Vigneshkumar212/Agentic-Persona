import { useState } from 'react'
import type { FeedbackSchema } from '@shared/types'
import FeedbackSchemaEditor from '@renderer/components/FeedbackSchemaEditor'

interface FeedbackSchemaSectionProps {
  title: string
  description: string
  savedSchema: FeedbackSchema | null
  /** Prefills the editor when starting fresh (e.g. a trial seeding from its project's default schema). */
  seedSchema?: FeedbackSchema | null
  onDraft: (instructions: string) => Promise<FeedbackSchema>
  onSave: (schema: FeedbackSchema) => Promise<void>
}

export default function FeedbackSchemaSection({
  title,
  description,
  savedSchema,
  seedSchema,
  onDraft,
  onSave
}: FeedbackSchemaSectionProps): JSX.Element {
  const [instructions, setInstructions] = useState('')
  const [draftSchema, setDraftSchema] = useState<FeedbackSchema | null>(null)
  const [editing, setEditing] = useState(false)
  const [drafting, setDrafting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDraft(): Promise<void> {
    setDrafting(true)
    setError(null)
    try {
      const schema = await onDraft(instructions)
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
      await onSave(draftSchema)
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
      <section className="detail-section">
        <h2>{title}</h2>
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
    <section className="detail-section">
      <h2>{title}</h2>
      {savedSchema ? (
        <>
          <p className="muted small">{description}</p>
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
      ) : seedSchema ? (
        <>
          <p className="muted small">
            Starting from this project's default schema — edit it for this trial, or regenerate from
            scratch below.
          </p>
          <button
            onClick={() => {
              setDraftSchema(seedSchema)
              setEditing(true)
            }}
          >
            Use and edit project's default schema
          </button>
          <p className="muted small" style={{ marginTop: 16 }}>
            Or describe what's different for this trial and draft a fresh one:
          </p>
          <textarea
            rows={2}
            placeholder="e.g. This trial is specifically about the new pricing page — ask about price fairness"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            disabled={drafting}
          />
          {error && <p className="error">{error}</p>}
          <button onClick={handleDraft} disabled={drafting} style={{ marginTop: 8 }}>
            {drafting ? 'Drafting…' : 'Draft new schema'}
          </button>
        </>
      ) : (
        <>
          <p className="muted small">
            Describe what you want feedback on and a lead agent will draft a structured schema — you
            confirm or edit it before it's used.
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
