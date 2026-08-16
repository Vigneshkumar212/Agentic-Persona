import { randomUUID } from 'node:crypto'
import { getDb } from './database'
import type { Feedback, FeedbackFieldValue } from '../../../shared/types'

interface FeedbackRow {
  id: string
  trial_id: string
  persona_id: string
  round: number
  structured_json: string
  freeform_text: string
  created_at: string
  tokens_in: number
  tokens_out: number
}

function rowToFeedback(row: FeedbackRow): Feedback {
  return {
    id: row.id,
    trialId: row.trial_id,
    personaId: row.persona_id,
    round: row.round,
    structured: JSON.parse(row.structured_json),
    freeformText: row.freeform_text,
    createdAt: row.created_at,
    tokensIn: row.tokens_in,
    tokensOut: row.tokens_out
  }
}

export function listFeedback(trialId: string): Feedback[] {
  const rows = getDb()
    .prepare('SELECT * FROM feedback WHERE trial_id = ? ORDER BY created_at ASC')
    .all(trialId) as FeedbackRow[]
  return rows.map(rowToFeedback)
}

export function getLatestRound(trialId: string): number {
  const row = getDb()
    .prepare('SELECT COALESCE(MAX(round), 0) as maxRound FROM feedback WHERE trial_id = ?')
    .get(trialId) as { maxRound: number }
  return row.maxRound
}

/** Personas that already have feedback for the given round (used to skip re-generating on resume). */
export function personaIdsWithFeedback(trialId: string, round: number): Set<string> {
  const rows = getDb()
    .prepare('SELECT persona_id FROM feedback WHERE trial_id = ? AND round = ?')
    .all(trialId, round) as { persona_id: string }[]
  return new Set(rows.map((r) => r.persona_id))
}

export interface CreateFeedbackInput {
  trialId: string
  personaId: string
  round: number
  structured: Record<string, FeedbackFieldValue>
  freeformText: string
  tokensIn: number
  tokensOut: number
}

export function createFeedback(input: CreateFeedbackInput): Feedback {
  const id = randomUUID()
  getDb()
    .prepare(
      `INSERT INTO feedback (id, trial_id, persona_id, round, structured_json, freeform_text, tokens_in, tokens_out)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.trialId,
      input.personaId,
      input.round,
      JSON.stringify(input.structured),
      input.freeformText,
      input.tokensIn,
      input.tokensOut
    )
  const row = getDb().prepare('SELECT * FROM feedback WHERE id = ?').get(id) as FeedbackRow
  return rowToFeedback(row)
}
