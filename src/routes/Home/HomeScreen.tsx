import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@renderer/store/useAppStore'
import type { Project } from '@shared/types'

export default function HomeScreen(): JSX.Element {
  const apiKeyStatus = useAppStore((s) => s.apiKeyStatus)
  const [projects, setProjects] = useState<Project[] | null>(null)
  const navigate = useNavigate()

  async function loadProjects(): Promise<void> {
    setProjects(await window.api.projects.list())
  }

  useEffect(() => {
    loadProjects()
  }, [])

  async function handleDelete(id: string, projectName: string): Promise<void> {
    if (!confirm(`Delete "${projectName}"? This removes all its personas, trials, and chats.`)) {
      return
    }
    await window.api.projects.delete(id)
    await loadProjects()
  }

  return (
    <div className="screen">
      <header className="page-header">
        <h1>Projects</h1>
        <div className="button-row">
          {apiKeyStatus?.hasKey && <span className="muted small">Key: {apiKeyStatus.maskedKey}</span>}
          <button className="btn-secondary" onClick={() => navigate('/settings')}>
            Settings
          </button>
        </div>
      </header>

      <button onClick={() => navigate('/project/new')} style={{ marginBottom: 24 }}>
        New project
      </button>

      {projects === null ? (
        <p className="muted">Loading…</p>
      ) : projects.length === 0 ? (
        <div className="card">
          <p className="muted">No projects yet. Create one to start building a persona panel.</p>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map((p) => (
            <div key={p.id} className="card project-card" onClick={() => navigate(`/project/${p.id}`)}>
              <h3>{p.name}</h3>
              {p.description && <p className="muted small">{p.description}</p>}
              <p className="muted small">
                {p.personaCount} personas · {p.personaMode === 'project' ? 'shared panel' : 'per-trial'}
              </p>
              <button
                className="btn-danger btn-small"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(p.id, p.name)
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
