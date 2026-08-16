import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Persona, Project, Trial } from '@shared/types'
import PersonaPanelSection from '@renderer/routes/Project/PersonaPanelSection'
import TrialDocumentsSection from '@renderer/routes/Trial/TrialDocumentsSection'
import FeedbackCollectionSection from '@renderer/routes/Trial/FeedbackCollectionSection'
import FeedbackSchemaSection from '@renderer/components/FeedbackSchemaSection'

const STATUS_LABELS: Record<Trial['status'], string> = {
  draft: 'Draft',
  running: 'In progress',
  complete: 'Complete'
}

export default function TrialWorkspaceScreen(): JSX.Element {
  const { trialId } = useParams<{ projectId: string; trialId: string }>()
  const navigate = useNavigate()

  const [trial, setTrial] = useState<Trial | null | undefined>(undefined)
  const [project, setProject] = useState<Project | null | undefined>(undefined)
  const [personas, setPersonas] = useState<Persona[]>([])

  useEffect(() => {
    if (!trialId) return
    window.api.trials.get(trialId).then(setTrial)
  }, [trialId])

  useEffect(() => {
    if (!trial) return
    window.api.projects.get(trial.projectId).then(setProject)
  }, [trial?.projectId])

  if (trial === undefined) {
    return (
      <div className="screen">
        <p className="muted">Loading…</p>
      </div>
    )
  }

  if (trial === null) {
    return (
      <div className="screen">
        <p className="muted">Trial not found.</p>
        <button className="btn-secondary" onClick={() => navigate('/')}>
          Back to projects
        </button>
      </div>
    )
  }

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
        <h1>{trial.name}</h1>
        <button className="btn-secondary" onClick={() => navigate(`/project/${project.id}`)}>
          Back to {project.name}
        </button>
      </header>

      <p className="muted small">{STATUS_LABELS[trial.status]}</p>
      {trial.explanation && <p style={{ maxWidth: 640 }}>{trial.explanation}</p>}

      <TrialDocumentsSection trialId={trial.id} />

      <PersonaPanelSection
        project={project}
        trialId={project.personaMode === 'trial' ? trial.id : null}
        onPersonasChanged={setPersonas}
      />

      <FeedbackSchemaSection
        title="Feedback schema for this trial"
        description="Personas will be asked these fields, plus freeform comments, when you run this trial."
        savedSchema={trial.feedbackSchema}
        seedSchema={project.defaultFeedbackSchema}
        onDraft={(instructions) => {
          const combined = trial.explanation
            ? `Trial-specific context: ${trial.explanation}\n\n${instructions}`
            : instructions
          return window.api.feedbackSchema.draft(project.id, combined)
        }}
        onSave={async (schema) => {
          await window.api.trials.setFeedbackSchema(trial.id, schema)
          setTrial({ ...trial, feedbackSchema: schema })
        }}
      />

      {trial.feedbackSchema && (
        <FeedbackCollectionSection
          project={project}
          trial={trial}
          personas={personas}
          onTrialUpdate={setTrial}
        />
      )}
    </div>
  )
}
