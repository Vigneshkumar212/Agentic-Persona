import { randomUUID } from 'node:crypto'
import { getDb } from './database'
import type { Persona, PersonaRecord } from '../../../shared/types'

interface PersonaRow {
  id: string
  project_id: string
  trial_id: string | null
  name: string
  persona_json: string
  one_line_summary: string
  order_index: number
  created_at: string
}

function rowToPersona(row: PersonaRow): Persona {
  return {
    id: row.id,
    projectId: row.project_id,
    trialId: row.trial_id,
    name: row.name,
    persona: JSON.parse(row.persona_json) as PersonaRecord,
    oneLineSummary: row.one_line_summary,
    orderIndex: row.order_index,
    createdAt: row.created_at
  }
}

export function listPersonas(projectId: string, trialId: string | null): Persona[] {
  const rows = getDb()
    .prepare('SELECT * FROM personas WHERE project_id = ? AND trial_id IS ? ORDER BY order_index ASC')
    .all(projectId, trialId) as PersonaRow[]
  return rows.map(rowToPersona)
}

export function getPersona(id: string): Persona | null {
  const row = getDb().prepare('SELECT * FROM personas WHERE id = ?').get(id) as PersonaRow | undefined
  return row ? rowToPersona(row) : null
}

export interface CreatePersonaInput {
  projectId: string
  trialId: string | null
  name: string
  persona: PersonaRecord
  oneLineSummary: string
  orderIndex: number
}

export function createPersona(input: CreatePersonaInput): Persona {
  const id = randomUUID()
  getDb()
    .prepare(
      `INSERT INTO personas (id, project_id, trial_id, name, persona_json, one_line_summary, order_index)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.projectId,
      input.trialId,
      input.name,
      JSON.stringify(input.persona),
      input.oneLineSummary,
      input.orderIndex
    )
  return getPersona(id)!
}

export function savePanelSummary(projectId: string, trialId: string | null, summary: string): void {
  const db = getDb()
  db.prepare('DELETE FROM panel_summaries WHERE project_id = ? AND trial_id IS ?').run(projectId, trialId)
  db.prepare('INSERT INTO panel_summaries (id, project_id, trial_id, summary) VALUES (?, ?, ?, ?)').run(
    randomUUID(),
    projectId,
    trialId,
    summary
  )
}

export function getPanelSummary(projectId: string, trialId: string | null): string | null {
  const row = getDb()
    .prepare(
      'SELECT summary FROM panel_summaries WHERE project_id = ? AND trial_id IS ? ORDER BY created_at DESC LIMIT 1'
    )
    .get(projectId, trialId) as { summary: string } | undefined
  return row?.summary ?? null
}
