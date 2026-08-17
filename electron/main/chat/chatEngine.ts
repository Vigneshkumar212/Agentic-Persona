import type { ChatMessage, Feedback, Persona, Project, Trial } from '../../../shared/types'
import { checkBudget } from '../../../shared/cost'
import type { ChatTurn } from '../llm/LLMProvider'
import { getProject } from '../db/projectsRepo'
import { getPersona } from '../db/personasRepo'
import { getTrial } from '../db/trialsRepo'
import { listFeedback } from '../db/feedbackRepo'
import { createMessage, getChat, getChatTokenTotal, listMessages } from '../db/chatsRepo'
import { logUsage } from '../db/usageRepo'
import { getProvider } from '../llm/providerRegistry'

export class ChatLimitExceededError extends Error {
  constructor(usedTokens: number, limitTokens: number) {
    super(
      `Chat token limit reached (${usedTokens.toLocaleString()} / ${limitTokens.toLocaleString()} tokens used). Start a new chat or raise the limit in the project.`
    )
    this.name = 'ChatLimitExceededError'
  }
}

function buildSystemInstruction(
  project: Project,
  persona: Persona,
  trial: Trial | null,
  trialFeedback: Feedback | null
): string {
  const p = persona.persona
  const parts: string[] = [
    `You are ${p.name}, a ${p.age}-year-old ${p.occupation} from ${p.country}. Primary language: ${p.language}.`,
    `Background: ${p.background}`
  ]
  if (p.values.length > 0) parts.push(`You value: ${p.values.join(', ')}`)
  if (p.personalityTraits.length > 0) parts.push(`Your personality: ${p.personalityTraits.join(', ')}`)

  parts.push(
    `\nYou are being interviewed by a product researcher from "${project.name}"` +
      `${project.description ? ' — ' + project.description : ''}.`
  )
  if (trial) parts.push(`Context: ${trial.explanation || trial.name}`)

  if (trialFeedback) {
    parts.push(
      `\nEarlier, you gave this feedback: ${JSON.stringify(trialFeedback.structured)}. ` +
        `Additional comments you gave: ${trialFeedback.freeformText || '(none)'}`
    )
    parts.push('The researcher may ask you to elaborate on, justify, or expand on this feedback.')
  }

  parts.push(
    '\nStay fully in character in every reply — conversational, specific, and honest, including ' +
      'disagreement or criticism if that is genuinely how you would respond. Keep replies concise, ' +
      'like a real conversation, not an essay.'
  )

  return parts.join('\n')
}

export async function sendChatMessage(
  chatId: string,
  content: string,
  onChunk: (delta: string) => void
): Promise<ChatMessage> {
  const chat = getChat(chatId)
  if (!chat) throw new Error('Chat not found.')
  if (!chat.personaId) throw new Error('Chat has no persona.')

  const project = getProject(chat.projectId)
  if (!project) throw new Error('Project not found.')

  const persona = getPersona(chat.personaId)
  if (!persona) throw new Error('Persona not found.')

  const usedTokens = getChatTokenTotal(chatId)
  const budget = checkBudget(usedTokens, project.chatTokenLimit)
  if (!budget.withinBudget) {
    throw new ChatLimitExceededError(usedTokens, project.chatTokenLimit)
  }

  const trial = chat.trialId ? getTrial(chat.trialId) : null
  const trialFeedback = chat.trialId
    ? (listFeedback(chat.trialId)
        .filter((f) => f.personaId === persona.id)
        .slice(-1)[0] ?? null)
    : null

  const priorMessages = listMessages(chatId)
  createMessage({ chatId, role: 'user', content, tokensIn: 0, tokensOut: 0, model: '' })

  const history: ChatTurn[] = [
    ...priorMessages.map((m) => ({ role: (m.role === 'model' ? 'model' : 'user') as ChatTurn['role'], text: m.content })),
    { role: 'user' as const, text: content }
  ]

  const provider = getProvider(project.provider)
  const result = await provider.generateChatStream(
    {
      model: project.model,
      systemInstruction: buildSystemInstruction(project, persona, trial, trialFeedback),
      history,
      maxOutputTokens: project.maxOutputTokens || undefined
    },
    (chunk) => onChunk(chunk.textDelta)
  )

  logUsage(project.id, chat.trialId, 'chat', project.model, result.usage)

  return createMessage({
    chatId,
    role: 'model',
    content: result.text,
    tokensIn: result.usage.inputTokens,
    tokensOut: result.usage.outputTokens,
    model: project.model
  })
}
