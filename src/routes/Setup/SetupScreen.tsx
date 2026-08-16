import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@renderer/store/useAppStore'
import { PROVIDERS } from '@shared/providers'
import ProviderKeyManager from '@renderer/components/ProviderKeyManager'

export default function SetupScreen(): JSX.Element {
  const { keyStatus, hasAnyKey, refresh } = useAppStore()
  const navigate = useNavigate()

  return (
    <div className="screen">
      <div className="setup-content">
        <h1>Set up your API keys</h1>
        <p className="lede">
          Agentic Persona runs entirely on your machine. Add an API key for at least one provider —
          it's validated once, then encrypted with your OS keychain and never leaves your device.
        </p>

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

        <button onClick={() => navigate('/', { replace: true })} disabled={!hasAnyKey} style={{ marginTop: 24 }}>
          Continue
        </button>
        {!hasAnyKey && <p className="muted small">Add at least one key to continue.</p>}
      </div>
    </div>
  )
}
