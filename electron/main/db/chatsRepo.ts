import { randomUUID } from 'node:crypto'
import { getDb } from './database'
import type { Chat, ChatMessage } from '../../../shared/types'

interface ChatRow {
  id: string
  project_id: string
  trial_id: string | null
  persona_id: string | null
  title: string
  created_at: string
}

function rowToChat(row: ChatRow): Chat {
  return {
    id: row.id,
    projectId: row.project_id,
    trialId: row.trial_id,
    personaId: row.persona_id,
    title: row.title,
    createdAt: row.created_at
  }
}

/** One chat per (project, trial, persona) triple — reused across visits so history persists. */
export function findOrCreateChat(projectId: string, trialId: string | null, personaId: string, title: string): Chat {
  const db = getDb()
  const existing = db
    .prepare('SELECT * FROM chats WHERE project_id = ? AND trial_id IS ? AND persona_id = ?')
    .get(projectId, trialId, personaId) as ChatRow | undefined
  if (existing) return rowToChat(existing)

  const id = randomUUID()
  db.prepare('INSERT INTO chats (id, project_id, trial_id, persona_id, title) VALUES (?, ?, ?, ?, ?)').run(
    id,
    projectId,
    trialId,
    personaId,
    title
  )
  return rowToChat(db.prepare('SELECT * FROM chats WHERE id = ?').get(id) as ChatRow)
}

export function getChat(id: string): Chat | null {
  const row = getDb().prepare('SELECT * FROM chats WHERE id = ?').get(id) as ChatRow | undefined
  return row ? rowToChat(row) : null
}

interface MessageRow {
  id: string
  chat_id: string
  role: 'user' | 'model' | 'system'
  content: string
  created_at: string
  tokens_in: number
  tokens_out: number
  model: string
}

function rowToMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    chatId: row.chat_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
    tokensIn: row.tokens_in,
    tokensOut: row.tokens_out,
    model: row.model
  }
}

export function listMessages(chatId: string): ChatMessage[] {
  const rows = getDb()
    .prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC')
    .all(chatId) as MessageRow[]
  return rows.map(rowToMessage)
}

export interface CreateMessageInput {
  chatId: string
  role: 'user' | 'model' | 'system'
  content: string
  tokensIn: number
  tokensOut: number
  model: string
}

export function createMessage(input: CreateMessageInput): ChatMessage {
  const id = randomUUID()
  getDb()
    .prepare(
      `INSERT INTO messages (id, chat_id, role, content, tokens_in, tokens_out, model)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, input.chatId, input.role, input.content, input.tokensIn, input.tokensOut, input.model)
  const row = getDb().prepare('SELECT * FROM messages WHERE id = ?').get(id) as MessageRow
  return rowToMessage(row)
}

export function getChatTokenTotal(chatId: string): number {
  const row = getDb()
    .prepare('SELECT COALESCE(SUM(tokens_in + tokens_out), 0) as total FROM messages WHERE chat_id = ?')
    .get(chatId) as { total: number }
  return row.total
}
