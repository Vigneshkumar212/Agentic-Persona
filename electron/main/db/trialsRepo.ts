import { randomUUID } from 'node:crypto'
import { getDb } from './database'
import type { CreateTrialInput, FeedbackSchema, Trial, TrialSummary } from '../../../shared/types'

interface TrialRow {
  id: string
  project_id: string
  name: string
  explanation: string
  feedback_schema: string | null
  summary_json: string | null
  created_at: string
  status: 'draft' | 'running' | 'complete'
}

function rowToTrial(row: TrialRow): Trial {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    explanation: row.explanation,
    feedbackSchema: row.feedback_schema ? JSON.parse(row.feedback_schema) : null,
    summary: row.summary_json ? JSON.parse(row.summary_json) : null,
    createdAt: row.created_at,
    status: row.status
  }
}

export function listTrials(projectId: string): Trial[] {
  const rows = getDb()
    .prepare('SELECT * FROM trials WHERE project_id = ? ORDER BY created_at DESC')
    .all(projectId) as TrialRow[]
  return rows.map(rowToTrial)
}

export function getTrial(id: string): Trial | null {
  const row = getDb().prepare('SELECT * FROM trials WHERE id = ?').get(id) as TrialRow | undefined
  return row ? rowToTrial(row) : null
}

export function createTrial(input: CreateTrialInput): Trial {
  if (!input.name || !input.name.trim()) {
    throw new Error('Trial name is required.')
  }
  const id = randomUUID()
  getDb()
    .prepare('INSERT INTO trials (id, project_id, name, explanation) VALUES (?, ?, ?, ?)')
    .run(id, input.projectId, input.name.trim(), input.explanation ?? '')
  return getTrial(id)!
}

export function setTrialFeedbackSchema(id: string, schema: FeedbackSchema): void {
  getDb().prepare('UPDATE trials SET feedback_schema = ? WHERE id = ?').run(JSON.stringify(schema), id)
}

export function setTrialStatus(id: string, status: Trial['status']): void {
  getDb().prepare('UPDATE trials SET status = ? WHERE id = ?').run(status, id)
}

export function setTrialSummary(id: string, summary: TrialSummary): void {
  getDb().prepare('UPDATE trials SET summary_json = ? WHERE id = ?').run(JSON.stringify(summary), id)
}
