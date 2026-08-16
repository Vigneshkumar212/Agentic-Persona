import { FormEvent, useState } from 'react'
import type { ApiKeyStatus } from '@shared/types'

interface ProviderKeyManagerProps {
  providerId: string
  label: string
  available: boolean
  status: ApiKeyStatus | undefined
  onChanged: () => Promise<void>
  helpUrl?: string
}

export default function ProviderKeyManager({
  providerId,
  label,
  available,
  status,
  onChanged,
  helpUrl
}: ProviderKeyManagerProps): JSX.Element {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(e: FormEvent): Promise<void> {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const result = await window.api.settings.setApiKey(providerId, value)
    setSubmitting(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setValue('')
    setEditing(false)
    await onChanged()
  }

  async function handleRemove(): Promise<void> {
    if (!confirm(`Remove your ${label} key?`)) return
    await window.api.settings.clearApiKey(providerId)
    await onChanged()
  }

  if (!available) {
    return (
      <div className="provider-key-row">
        <h3>{label}</h3>
        <p className="muted small">Coming soon.</p>
      </div>
    )
  }

  const hasKey = status?.hasKey ?? false

  return (
    <div className="provider-key-row">
      <h3>{label}</h3>

      {hasKey && !editing ? (
        <>
          <p className="muted small">Key saved: {status!.maskedKey}</p>
          <div className="button-row">
            <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
              Change
            </button>
            <button type="button" className="btn-danger" onClick={handleRemove}>
              Remove
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={handleSave}>
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="Paste your API key"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={submitting}
          />
          {error && <p className="error">{error}</p>}
          <div className="button-row">
            <button type="submit" disabled={submitting || value.trim().length === 0}>
              {submitting ? 'Validating…' : 'Save key'}
            </button>
            {editing && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setEditing(false)
                  setError(null)
                  setValue('')
                }}
              >
                Cancel
              </button>
            )}
            {helpUrl && (
              <a href={helpUrl} target="_blank" rel="noreferrer" className="small">
                Get a key
              </a>
            )}
          </div>
        </form>
      )}
    </div>
  )
}
