import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Project, Trial } from '@shared/types'

const STATUS_LABELS: Record<Trial['status'], string> = {
  draft: 'Draft',
  running: 'In progress',
  complete: 'Complete'
}

export default function TrialListSection({ project }: { project: Project }): JSX.Element {
  const [trials, setTrials] = useState<Trial[] | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    window.api.trials.list(project.id).then(setTrials)
  }, [project.id])

  return (
    <section className="detail-section">
      <h2>Trials</h2>
      <button onClick={() => navigate(`/project/${project.id}/trial/new`)}>New trial</button>

      {trials === null ? (
        <p className="muted" style={{ marginTop: 12 }}>
          Loading…
        </p>
      ) : trials.length === 0 ? (
        <p className="muted" style={{ marginTop: 12 }}>
          No trials yet. A trial is one round of feedback collection — upload product context, confirm
          the feedback schema, and run it against your persona panel.
        </p>
      ) : (
        <div className="project-grid" style={{ marginTop: 16 }}>
          {trials.map((t) => (
            <div
              key={t.id}
              className="project-card"
              onClick={() => navigate(`/project/${project.id}/trial/${t.id}`)}
            >
              <h3>{t.name}</h3>
              <p className="muted small">{STATUS_LABELS[t.status]}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
