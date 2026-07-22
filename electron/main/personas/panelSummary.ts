import { getProject } from '../db/projectsRepo'
import { listPersonas, savePanelSummary } from '../db/personasRepo'
import { logUsage } from '../db/usageRepo'
import { getProvider } from '../llm/providerRegistry'

export async function generatePanelSummary(projectId: string, trialId: string | null): Promise<string> {
  const project = getProject(projectId)
  if (!project) throw new Error('Project not found.')

  const personas = listPersonas(projectId, trialId)
  if (personas.length === 0) throw new Error('No personas to summarize yet.')

  const roster = personas.map((p, i) => `${i + 1}. ${p.name} — ${p.oneLineSummary}`).join('\n')
  const prompt = [
    `You are summarizing a synthetic customer feedback panel of ${personas.length} personas for the project "${project.name}".`,
    roster,
    'Write a concise 3-5 sentence summary of this panel: how diverse it is, what kinds of perspectives ' +
      'it covers, and any notable gaps in coverage. Plain text, no markdown headers or bullet points.'
  ].join('\n\n')

  const provider = getProvider()
  const result = await provider.generateText({ model: project.model, input: prompt })

  logUsage(projectId, trialId, 'panel_summary', project.model, result.usage)
  savePanelSummary(projectId, trialId, result.text)

  return result.text
}
