import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Project } from '@shared/types'
import { PROVIDERS } from '@shared/providers'
import PersonaPanelSection from '@renderer/routes/Project/PersonaPanelSection'
import TrialListSection from '@renderer/routes/Project/TrialListSection'
import FeedbackSchemaSection from '@renderer/components/FeedbackSchemaSection'

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

      <div style={{ maxWidth: 640 }}>
        {project.description && <p>{project.description}</p>}
        <dl className="detail-list">
          <dt>Persona mode</dt>
          <dd>{project.personaMode === 'project' ? 'Shared panel (reused across trials)' : 'Fresh per trial'}</dd>
          <dt>Persona count</dt>
          <dd>{project.personaCount}</dd>
          <dt>Variance</dt>
          <dd>{project.variance}</dd>
          <dt>Provider</dt>
          <dd>{PROVIDERS.find((p) => p.id === project.provider)?.label ?? project.provider}</dd>
          <dt>Model</dt>
          <dd>{project.model}</dd>
          <dt>Max output tokens/response</dt>
          <dd>{project.maxOutputTokens > 0 ? project.maxOutputTokens.toLocaleString() : 'Model default'}</dd>
          <dt>Budget per trial</dt>
          <dd>{project.budgetTokens > 0 ? `${project.budgetTokens.toLocaleString()} tokens` : 'Unlimited'}</dd>
          <dt>Cooldown</dt>
          <dd>{project.cooldownSeconds}s</dd>
        </dl>
      </div>

      {project.personaMode === 'project' ? (
        <PersonaPanelSection project={project} />
      ) : (
        <div className="detail-section">
          <p className="muted">
            This project generates a fresh persona panel per trial — open a trial below to build its
            panel.
          </p>
        </div>
      )}

      <FeedbackSchemaSection
        title="Feedback schema"
        description="Personas will be asked these fields during trials, plus freeform comments."
        savedSchema={project.defaultFeedbackSchema}
        onDraft={(instructions) => window.api.feedbackSchema.draft(project.id, instructions)}
        onSave={async (schema) => {
          await window.api.projects.setDefaultFeedbackSchema(project.id, schema)
          setProject({ ...project, defaultFeedbackSchema: schema })
        }}
      />

      <TrialListSection project={project} />
    </div>
  )
}
