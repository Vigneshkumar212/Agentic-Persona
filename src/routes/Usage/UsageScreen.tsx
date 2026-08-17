import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { OperationUsageBucket, Project, ProjectUsageTotal, TrialUsageBucket } from '@shared/types'

const OPERATION_LABELS: Record<string, string> = {
  persona_generation: 'Persona generation',
  panel_summary: 'Panel summary',
  feedback_schema_draft: 'Feedback schema draft',
  feedback_collection: 'Feedback collection',
  trial_summary: 'Trial summary',
  chat: 'Chat'
}

interface ProjectDetails {
  byTrial: TrialUsageBucket[]
  byOperation: OperationUsageBucket[]
  trialNames: Record<string, string>
}

export default function UsageScreen(): JSX.Element {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [usageTotals, setUsageTotals] = useState<ProjectUsageTotal[] | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [details, setDetails] = useState<ProjectDetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  useEffect(() => {
    Promise.all([window.api.projects.list(), window.api.usage.getAllProjectsUsage()]).then(([p, u]) => {
      setProjects(p)
      setUsageTotals(u)
    })
  }, [])

  async function toggleProject(projectId: string): Promise<void> {
    if (expandedId === projectId) {
      setExpandedId(null)
      setDetails(null)
      return
    }

    setExpandedId(projectId)
    setLoadingDetails(true)
    const [byTrial, byOperation, trials] = await Promise.all([
      window.api.usage.getProjectUsageByTrial(projectId),
      window.api.usage.getProjectUsageByOperation(projectId),
      window.api.trials.list(projectId)
    ])
    setDetails({
      byTrial,
      byOperation,
      trialNames: Object.fromEntries(trials.map((t) => [t.id, t.name]))
    })
    setLoadingDetails(false)
  }

  const usageByProject = new Map((usageTotals ?? []).map((u) => [u.projectId, u]))
  const grandTotalTokens = (usageTotals ?? []).reduce((sum, u) => sum + u.totalTokens, 0)
  const grandTotalCost = (usageTotals ?? []).reduce((sum, u) => sum + u.totalCost, 0)
  const grandTotalCalls = (usageTotals ?? []).reduce((sum, u) => sum + u.callCount, 0)

  return (
    <div className="screen">
      <header className="page-header">
        <h1>Usage</h1>
        <button className="btn-secondary" onClick={() => navigate('/')}>
          Back
        </button>
      </header>

      <p className="lede">
        ${grandTotalCost.toFixed(4)} spent across {grandTotalTokens.toLocaleString()} tokens and{' '}
        {grandTotalCalls.toLocaleString()} calls, over {projects?.length ?? 0} project
        {projects?.length === 1 ? '' : 's'}.
      </p>

      {projects === null ? (
        <p className="muted">Loading…</p>
      ) : projects.length === 0 ? (
        <p className="muted">No projects yet.</p>
      ) : (
        <div>
          {projects.map((p) => {
            const usage = usageByProject.get(p.id)
            const expanded = expandedId === p.id

            return (
              <div key={p.id} className="usage-project-row">
                <div className="button-row" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <h3>{p.name}</h3>
                    <p className="muted small">
                      {(usage?.totalTokens ?? 0).toLocaleString()} tokens · $
                      {(usage?.totalCost ?? 0).toFixed(4)} · {usage?.callCount ?? 0} calls
                    </p>
                  </div>
                  <button className="btn-secondary" onClick={() => toggleProject(p.id)}>
                    {expanded ? 'Hide details' : 'Show details'}
                  </button>
                </div>

                {expanded && (
                  <div style={{ marginTop: 12 }}>
                    {loadingDetails || !details ? (
                      <p className="muted small">Loading…</p>
                    ) : (
                      <>
                        <h3 className="small">By trial</h3>
                        {details.byTrial.length === 0 ? (
                          <p className="muted small">No usage yet.</p>
                        ) : (
                          details.byTrial.map((b) => {
                            const label = b.trialId
                              ? (details.trialNames[b.trialId] ?? 'Trial')
                              : 'Persona panel (no trial)'
                            const overBudget = p.budgetTokens > 0 && b.totalTokens > p.budgetTokens
                            const pct = p.budgetTokens > 0 ? Math.min(100, (b.totalTokens / p.budgetTokens) * 100) : 0

                            return (
                              <div key={b.trialId ?? 'none'} className="bar-row">
                                <span className="bar-label small">{label}</span>
                                {p.budgetTokens > 0 ? (
                                  <div className="bar-track">
                                    <div
                                      className="bar-fill"
                                      style={{
                                        width: `${pct}%`,
                                        background: overBudget ? 'var(--error)' : 'var(--accent)'
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div className="bar-track" />
                                )}
                                <span className="bar-value small">
                                  {b.totalTokens.toLocaleString()}
                                  {p.budgetTokens > 0 ? ` / ${p.budgetTokens.toLocaleString()}` : ' (unlimited)'}
                                </span>
                              </div>
                            )
                          })
                        )}

                        <h3 className="small" style={{ marginTop: 16 }}>
                          By operation
                        </h3>
                        {details.byOperation.length === 0 ? (
                          <p className="muted small">No usage yet.</p>
                        ) : (
                          details.byOperation.map((b) => (
                            <p key={b.operation} className="small">
                              {OPERATION_LABELS[b.operation] ?? b.operation}: {b.totalTokens.toLocaleString()}{' '}
                              tokens (${b.totalCost.toFixed(4)}, {b.callCount} call
                              {b.callCount === 1 ? '' : 's'})
                            </p>
                          ))
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
