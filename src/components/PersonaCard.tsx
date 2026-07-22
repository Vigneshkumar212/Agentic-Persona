import { useState } from 'react'
import type { Persona } from '@shared/types'

export default function PersonaCard({ persona }: { persona: Persona }): JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const p = persona.persona

  return (
    <div className="card persona-card">
      <h3>{p.name}</h3>
      <p className="muted small">
        {p.age} · {p.country} · {p.occupation}
      </p>
      <p>{p.oneLineSummary}</p>

      {expanded && (
        <div className="persona-details">
          <p>{p.background}</p>
          {p.values.length > 0 && (
            <p className="small">
              <strong>Values:</strong> {p.values.join(', ')}
            </p>
          )}
          {p.personalityTraits.length > 0 && (
            <p className="small">
              <strong>Traits:</strong> {p.personalityTraits.join(', ')}
            </p>
          )}
        </div>
      )}

      <button className="btn-secondary btn-small" onClick={() => setExpanded((e) => !e)}>
        {expanded ? 'Show less' : 'Show more'}
      </button>
    </div>
  )
}
