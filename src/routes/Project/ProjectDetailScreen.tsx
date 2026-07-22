import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Project } from '@shared/types'
import PersonaPanelSection from '@renderer/routes/Project/PersonaPanelSection'
import FeedbackSchemaSection from '@renderer/routes/Project/FeedbackSchemaSection'

export default function ProjectDetailScreen(): JSX.Element {
  const { projectId } = useParams<{ projectId: string }>()
  const [project, setProject] = useState<Project | null | undefined>(undefined)
  const navigate = useNavigate()

  useEffect(() => {
    if (!projectId) return
    window.api.projects.get(projectId).then(setProject)
  }, [projectId])

  if (project === undefined) {
    return (
      <div className="screen">
        <p className="muted">Loading…</p>
      </div>
    )
  }

  if (project === null) {
    return (
      <div className="screen">
        <p className="muted">Project not found.</p>
        <button className="btn-secondary" onClick={() => navigate('/')}>
          Back to projects
        </button>
      </div>
    )
  }

  return (
    <div className="screen">
      <header className="page-header">
        <h1>{project.name}</h1>
        <button className="btn-secondary" onClick={() => navigate('/')}>
          Back
        </button>
      </header>

      <div className="card" style={{ maxWidth: 640 }}>
        {project.description && <p>{project.description}</p>}
        <dl className="detail-list">
          <dt>Persona mode</dt>
          <dd>{project.personaMode === 'project' ? 'Shared panel (reused across trials)' : 'Fresh per trial'}</dd>
          <dt>Persona count</dt>
          <dd>{project.personaCount}</dd>
          <dt>Variance</dt>
          <dd>{project.variance}</dd>
          <dt>Model</dt>
          <dd>{project.model}</dd>
          <dt>Budget</dt>
          <dd>{project.budgetTokens > 0 ? `${project.budgetTokens.toLocaleString()} tokens` : 'Unlimited'}</dd>
          <dt>Cooldown</dt>
          <dd>{project.cooldownSeconds}s</dd>
        </dl>
      </div>

      {project.personaMode === 'project' ? (
        <PersonaPanelSection project={project} />
      ) : (
        <div className="card" style={{ marginTop: 16 }}>
          <p className="muted">
            This project generates a fresh persona panel per trial. Create a trial to generate its
            panel — trials land in the next milestone.
          </p>
        </div>
      )}

      <FeedbackSchemaSection project={project} onProjectUpdate={setProject} />
    </div>
  )
}
