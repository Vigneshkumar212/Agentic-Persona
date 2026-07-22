import type { PersonaRecord, Persona, Project } from '../../../shared/types'
import { checkBudget } from '../../../shared/cost'
import { getProject } from '../db/projectsRepo'
import { createPersona, listPersonas } from '../db/personasRepo'
import { getProjectUsageTotal, logUsage } from '../db/usageRepo'
import { getProvider } from '../llm/providerRegistry'
import { PERSONA_RESPONSE_SCHEMA } from '../llm/personaSchema'

const SYSTEM_INSTRUCTION =
  'You are a synthetic user-research panel architect. You invent realistic, plausible individual ' +
  'personas for product feedback panels. Always respond with a single JSON object matching the ' +
  'requested schema — no markdown, no commentary.'

function buildPersonaPrompt(project: Project, priorSummaries: string[], index: number): string {
  const parts: string[] = [
    `You are creating persona #${index + 1} of ${project.personaCount} for a synthetic customer feedback panel.`
  ]

  if (project.description) parts.push(`Product/project context: ${project.description}`)
  if (project.defaultAudience) parts.push(`Target audience: ${project.defaultAudience}`)
  if (project.defaultCountries.length > 0) {
    parts.push(`Draw countries from: ${project.defaultCountries.join(', ')}`)
  }
  if (project.defaultLanguages.length > 0) {
    parts.push(`Draw languages from: ${project.defaultLanguages.join(', ')}`)
  }
  if (project.generationInstructions) {
    parts.push(`Additional instructions from the user: ${project.generationInstructions}`)
  }

  parts.push(
    `Variance dial: ${project.variance}/100 (0 = personas should be very similar to each other, ` +
      `100 = personas should be as different from each other as possible). Use this to decide how ` +
      `much this persona should differ from the ones already created.`
  )

  if (priorSummaries.length > 0) {
    const list = priorSummaries.map((s, i) => `${i + 1}. ${s}`).join('\n')
    parts.push(`Personas already created so far (do not repeat these):\n${list}`)
  } else {
    parts.push('This is the first persona in the panel.')
  }

  parts.push(
    'Generate one new persona as a JSON object matching the schema. Keep oneLineSummary short ' +
      '(under 20 words) and distinct enough to tell this persona apart from the others at a glance.'
  )

  return parts.join('\n\n')
}

export class BudgetExceededError extends Error {
  constructor(usedTokens: number, budgetTokens: number) {
    super(
      `Project token budget exceeded (${usedTokens.toLocaleString()} / ${budgetTokens.toLocaleString()} tokens used).`
    )
    this.name = 'BudgetExceededError'
  }
}

export async function generateNextPersona(projectId: string, trialId: string | null): Promise<Persona> {
  const project = getProject(projectId)
  if (!project) throw new Error('Project not found.')

  const usedTokens = getProjectUsageTotal(projectId)
  const budget = checkBudget(usedTokens, project.budgetTokens)
  if (!budget.withinBudget) {
    throw new BudgetExceededError(usedTokens, project.budgetTokens)
  }

  const existing = listPersonas(projectId, trialId)
  const priorSummaries = existing.map((p) => p.oneLineSummary)
  const prompt = buildPersonaPrompt(project, priorSummaries, existing.length)

  const provider = getProvider()
  const result = await provider.generateStructured<PersonaRecord>({
    model: project.model,
    systemInstruction: SYSTEM_INSTRUCTION,
    input: prompt,
    responseSchema: PERSONA_RESPONSE_SCHEMA
  })

  logUsage(projectId, trialId, 'persona_generation', project.model, result.usage)

  return createPersona({
    projectId,
    trialId,
    name: result.data.name,
    persona: result.data,
    oneLineSummary: result.data.oneLineSummary,
    orderIndex: existing.length
  })
}
