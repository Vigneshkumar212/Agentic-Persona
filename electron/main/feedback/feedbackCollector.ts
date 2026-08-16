import type { Feedback, FeedbackFieldValue, Persona, Project, Trial } from '../../../shared/types'
import { checkBudget } from '../../../shared/cost'
import { getProject } from '../db/projectsRepo'
import { getTrial, setTrialStatus } from '../db/trialsRepo'
import { getPersona } from '../db/personasRepo'
import { listTrialDocuments } from '../db/trialDocumentsRepo'
import { createFeedback, getLatestRound, personaIdsWithFeedback } from '../db/feedbackRepo'
import { getUsageTotal, logUsage } from '../db/usageRepo'
import { getProvider } from '../llm/providerRegistry'
import { buildFeedbackResponseSchema } from '../llm/feedbackResponseSchema'
import { documentToPromptPart } from '../trials/documentIngest'
import type { MultimodalPart } from '../llm/LLMProvider'

const SYSTEM_INSTRUCTION =
  'You are roleplaying as a specific persona giving honest product feedback. Stay fully in character: ' +
  "answer based on this persona's background, values, and personality — not as a generic assistant. " +
  'Always respond with a single JSON object matching the requested schema — no markdown, no commentary.'

export class TrialBudgetExceededError extends Error {
  constructor(usedTokens: number, budgetTokens: number) {
    super(
      `Per-trial token budget exceeded (${usedTokens.toLocaleString()} / ${budgetTokens.toLocaleString()} tokens used).`
    )
    this.name = 'TrialBudgetExceededError'
  }
}

function buildFeedbackPromptText(
  trial: Trial,
  project: Project,
  persona: Persona,
  extraInstructions?: string
): string {
  const p = persona.persona
  const parts: string[] = [
    `You are ${p.name}, a ${p.age}-year-old ${p.occupation} from ${p.country}. Primary language: ${p.language}.`,
    `Background: ${p.background}`
  ]
  if (p.values.length > 0) parts.push(`You value: ${p.values.join(', ')}`)
  if (p.personalityTraits.length > 0) parts.push(`Your personality: ${p.personalityTraits.join(', ')}`)

  parts.push(`\nProduct/project: ${project.name}${project.description ? ' — ' + project.description : ''}`)
  if (trial.explanation) parts.push(`What you're evaluating: ${trial.explanation}`)
  if (extraInstructions) parts.push(`Follow-up context for this round: ${extraInstructions}`)

  parts.push(
    '\nReview any attached documents as the product you are evaluating, then answer the feedback ' +
      'form fully in character, based on who you are. Be honest and specific — including negative ' +
      'feedback if that is genuinely how this persona would react.'
  )

  return parts.join('\n')
}

/** A persona already answered the trial's current round → this call starts a fresh follow-up round for them. */
function resolveRound(trialId: string, personaId: string): number {
  const latestRound = getLatestRound(trialId)
  if (latestRound === 0) return 1
  const alreadyAnswered = personaIdsWithFeedback(trialId, latestRound).has(personaId)
  return alreadyAnswered ? latestRound + 1 : latestRound
}

export async function collectFeedbackForPersona(
  trialId: string,
  personaId: string,
  extraInstructions?: string
): Promise<Feedback> {
  const trial = getTrial(trialId)
  if (!trial) throw new Error('Trial not found.')
  if (!trial.feedbackSchema) throw new Error('This trial has no confirmed feedback schema yet.')

  const project = getProject(trial.projectId)
  if (!project) throw new Error('Project not found.')

  const persona = getPersona(personaId)
  if (!persona) throw new Error('Persona not found.')

  const usedTokens = getUsageTotal(project.id, trialId)
  const budget = checkBudget(usedTokens, project.budgetTokens)
  if (!budget.withinBudget) {
    throw new TrialBudgetExceededError(usedTokens, project.budgetTokens)
  }

  const parts: MultimodalPart[] = [
    { kind: 'text', text: buildFeedbackPromptText(trial, project, persona, extraInstructions) }
  ]
  for (const doc of listTrialDocuments(trialId)) {
    parts.push(documentToPromptPart(doc))
  }

  const provider = getProvider(project.provider)
  const result = await provider.generateStructured<Record<string, FeedbackFieldValue>>({
    model: project.model,
    systemInstruction: SYSTEM_INSTRUCTION,
    input: parts,
    responseSchema: buildFeedbackResponseSchema(trial.feedbackSchema),
    maxOutputTokens: project.maxOutputTokens || undefined
  })

  logUsage(project.id, trialId, 'feedback_collection', project.model, result.usage)
  if (trial.status === 'draft') setTrialStatus(trialId, 'running')

  const { comments, ...structured } = result.data
  return createFeedback({
    trialId,
    personaId,
    round: resolveRound(trialId, personaId),
    structured,
    freeformText: typeof comments === 'string' ? comments : '',
    tokensIn: result.usage.inputTokens,
    tokensOut: result.usage.outputTokens
  })
}
