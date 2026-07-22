import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@renderer/store/useAppStore'
import ModelSelect from '@renderer/components/ModelSelect'
import { DEFAULT_MODEL } from '@shared/models'

export default function SetupScreen(): JSX.Element {
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState(DEFAULT_MODEL)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const refreshApiKeyStatus = useAppStore((s) => s.refreshApiKeyStatus)
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const result = await window.api.settings.setApiKey(apiKey)

    if (!result.ok) {
      setSubmitting(false)
      setError(result.error)
      return
    }

    await window.api.settings.setDefaultModel(model)
    await refreshApiKeyStatus()
    setSubmitting(false)
    navigate('/', { replace: true })
  }

  return (
    <div className="screen screen-centered">
      <div className="card card-narrow">
        <h1>Welcome to Agentic Persona</h1>
        <p className="muted">
          Enter your Gemini API key to get started. It's validated once, then encrypted with your
          OS keychain and stored only on this machine — it never leaves your device.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="apiKey">Gemini API key</label>
          <input
            id="apiKey"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="AIza..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={submitting}
          />

          <label htmlFor="model">Default model</label>
          <ModelSelect id="model" value={model} onChange={setModel} disabled={submitting} />

          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={submitting || apiKey.trim().length === 0}>
            {submitting ? 'Validating…' : 'Save and continue'}
          </button>
        </form>

        <p className="muted small">
          Don't have a key?{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
            Get one from Google AI Studio
          </a>
          .
        </p>
      </div>
    </div>
  )
}
