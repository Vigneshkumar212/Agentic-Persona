import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@renderer/store/useAppStore'

export default function WelcomeScreen(): JSX.Element {
  const navigate = useNavigate()
  const refresh = useAppStore((s) => s.refresh)

  async function handleContinue(): Promise<void> {
    await window.api.settings.setCompletedWelcome()
    await refresh()
    navigate('/setup', { replace: true })
  }

  return (
    <div className="screen screen-centered">
      <div className="welcome-content">
        <h1>Agentic Persona</h1>
        <p className="lede">
          Get fast, structured product feedback without recruiting real customers. Agentic Persona
          spins up a panel of AI personas, has them react to your product, and gives you a summary
          plus the ability to dig into any single persona's reasoning — all running locally on your
          machine with your own API key.
        </p>
        <button onClick={handleContinue}>Continue</button>
      </div>
    </div>
  )
}
