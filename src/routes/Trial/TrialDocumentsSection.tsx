import { useEffect, useState } from 'react'
import type { TrialDocument } from '@shared/types'

export default function TrialDocumentsSection({ trialId }: { trialId: string }): JSX.Element {
  const [documents, setDocuments] = useState<TrialDocument[] | null>(null)
  const [picking, setPicking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load(): Promise<void> {
    setDocuments(await window.api.trials.listDocuments(trialId))
  }

  useEffect(() => {
    load()
  }, [trialId])

  async function handleAdd(): Promise<void> {
    setPicking(true)
    setError(null)
    try {
      const result = await window.api.trials.pickAndAddDocuments(trialId)
      if (result.skipped.length > 0) {
        setError(`Skipped unsupported or oversized files: ${result.skipped.join(', ')}`)
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setPicking(false)
    }
  }

  async function handleRemove(id: string): Promise<void> {
    await window.api.trials.removeDocument(id)
    await load()
  }

  return (
    <section className="detail-section">
      <h2>Product context documents</h2>
      <p className="muted small">
        Text, Markdown, PDF, or images — sent to personas as context for their feedback.
      </p>
      <button className="btn-secondary" onClick={handleAdd} disabled={picking}>
        {picking ? 'Adding…' : 'Add documents'}
      </button>
      {error && <p className="error">{error}</p>}
      {documents && documents.length > 0 && (
        <ul className="schema-field-list" style={{ marginTop: 12 }}>
          {documents.map((d) => (
            <li key={d.id}>
              {d.filename}{' '}
              <span className="muted small">
                ({(d.size / 1024).toFixed(0)} KB, ~{d.tokensEst.toLocaleString()} tokens)
              </span>{' '}
              <button className="btn-danger btn-small" onClick={() => handleRemove(d.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
