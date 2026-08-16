import type { TrialSummary } from '../../../shared/types'
import { computeAllAggregates, describeAggregate, latestRoundFeedback } from '../../../shared/aggregate'
import { getProject } from '../db/projectsRepo'
import { getTrial, setTrialStatus, setTrialSummary } from '../db/trialsRepo'
import { listFeedback } from '../db/feedbackRepo'
import { listPersonas } from '../db/personasRepo'
import { logUsage } from '../db/usageRepo'
import { getProvider } from '../llm/providerRegistry'

export async function generateTrialSummary(trialId: string): Promise<TrialSummary> {
  const trial = getTrial(trialId)
  if (!trial) throw new Error('Trial not found.')
  if (!trial.feedbackSchema) throw new Error('This trial has no confirmed feedback schema yet.')

  const project = getProject(trial.projectId)
  if (!project) throw new Error('Project not found.')

  const latest = latestRoundFeedback(listFeedback(trialId))
  if (latest.length === 0) throw new Error('No feedback collected yet.')

  const personas = listPersonas(project.id, project.personaMode === 'trial' ? trialId : null)
  const personaById = new Map(personas.map((p) => [p.id, p]))

  const aggregates = computeAllAggregates(trial.feedbackSchema, latest)
  const aggregateLines = trial.feedbackSchema.fields.map(
    (f) => `${f.label}: ${describeAggregate(aggregates[f.key])}`
  )

  const commentLines = latest
    .map((f) => {
      const persona = personaById.get(f.personaId)
      return persona && f.freeformText ? `${persona.name}: ${f.freeformText}` : null
    })
    .filter((line): line is string => line !== null)

  const prompt = [
    `You are summarizing feedback from ${latest.length} synthetic personas on trial "${trial.name}" for project "${project.name}".`,
    `Structured results:\n${aggregateLines.join('\n')}`,
    commentLines.length > 0 ? `Freeform comments:\n${commentLines.join('\n')}` : '',
    'Write a concise 4-7 sentence narrative summary: overall sentiment, the strongest signal from the ' +
      'structured data, recurring themes in the freeform comments, and any notable disagreement between ' +
      'personas. Plain text, no markdown.'
  ]
    .filter(Boolean)
    .join('\n\n')

  const provider = getProvider(project.provider)
  const result = await provider.generateText({ model: project.model, input: prompt })

  logUsage(project.id, trialId, 'trial_summary', project.model, result.usage)

  const summary: TrialSummary = { narrative: result.text, generatedAt: new Date().toISOString() }
  setTrialSummary(trialId, summary)
  setTrialStatus(trialId, 'complete')
  return summary
}
