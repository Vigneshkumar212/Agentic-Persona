import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@renderer/store/useAppStore'
import ModelSelect from '@renderer/components/ModelSelect'

export default function SettingsScreen(): JSX.Element {
  const { apiKeyStatus, refreshApiKeyStatus } = useAppStore()
  const [model, setModel] = useState('')
  const [newKey, setNewKey] = useState('')
  const [showKeyForm, setShowKeyForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    window.api.settings.getDefaultModel().then(setModel)
  }, [])

  async function handleModelChange(next: string): Promise<void> {
    setModel(next)
    await window.api.settings.setDefaultModel(next)
  }

  async function handleKeyUpdate(e: FormEvent): Promise<void> {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const result = await window.api.settings.setApiKey(newKey)
    setSubmitting(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setNewKey('')
    setShowKeyForm(false)
    await refreshApiKeyStatus()
  }

  async function handleRemoveKey(): Promise<void> {
    if (!confirm('Remove your saved API key? You will need to re-enter it to use the app again.')) {
      return
    }
    await window.api.settings.clearApiKey()
    await refreshApiKeyStatus()
    navigate('/setup', { replace: true })
  }

  return (
    <div className="screen">
      <header className="page-header">
        <h1>Settings</h1>
        <button className="btn-secondary" onClick={() => navigate('/')}>
          Back
        </button>
      </header>

      <div className="card" style={{ maxWidth: 480 }}>
        <h2>API key</h2>
        <p className="muted small">Current key: {apiKeyStatus?.maskedKey ?? 'none'}</p>

        {!showKeyForm ? (
          <div className="button-row">
            <button className="btn-secondary" onClick={() => setShowKeyForm(true)}>
              Change key
            </button>
            <button className="btn-danger" onClick={handleRemoveKey}>
              Remove key
            </button>
          </div>
        ) : (
          <form onSubmit={handleKeyUpdate}>
            <label htmlFor="newKey">New Gemini API key</label>
            <input
              id="newKey"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="AIza..."
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              disabled={submitting}
            />
            {error && <p className="error">{error}</p>}
            <div className="button-row">
              <button type="submit" disabled={submitting || newKey.trim().length === 0}>
                {submitting ? 'Validating…' : 'Save key'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowKeyForm(false)
                  setError(null)
                  setNewKey('')
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="card" style={{ maxWidth: 480, marginTop: 16 }}>
        <h2>Default model</h2>
        <p className="muted small">Used for new projects unless overridden in the project wizard.</p>
        <ModelSelect value={model} onChange={handleModelChange} />
      </div>
    </div>
  )
}
