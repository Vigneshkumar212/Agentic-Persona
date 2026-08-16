import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@renderer/store/useAppStore'
import { PROVIDERS, DEFAULT_PROVIDER } from '@shared/providers'
import ModelSelect from '@renderer/components/ModelSelect'
import ProviderKeyManager from '@renderer/components/ProviderKeyManager'

export default function SettingsScreen(): JSX.Element {
  const { keyStatus, refresh } = useAppStore()
  const [model, setModel] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    window.api.settings.getDefaultModel().then(setModel)
  }, [])

  async function handleModelChange(next: string): Promise<void> {
    setModel(next)
    await window.api.settings.setDefaultModel(next)
  }

  return (
    <div className="screen">
      <header className="page-header">
        <h1>Settings</h1>
        <button className="btn-secondary" onClick={() => navigate('/')}>
          Back
        </button>
      </header>

      <section style={{ maxWidth: 480 }}>
        <h2>API keys</h2>
        <div className="provider-key-list">
          {PROVIDERS.map((p) => (
            <ProviderKeyManager
              key={p.id}
              providerId={p.id}
              label={p.label}
              available={p.available}
              status={keyStatus?.[p.id]}
              onChanged={refresh}
              helpUrl={p.id === 'gemini' ? 'https://aistudio.google.com/apikey' : undefined}
            />
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 480, marginTop: 24 }}>
        <h2>Default model</h2>
        <p className="muted small">Used to prefill new projects unless changed in the project wizard.</p>
        <ModelSelect provider={DEFAULT_PROVIDER} value={model} onChange={handleModelChange} />
      </section>
    </div>
  )
}
