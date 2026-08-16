import { randomUUID } from 'node:crypto'
import { getDb } from './database'
import type { TrialDocument } from '../../../shared/types'

interface TrialDocumentRow {
  id: string
  trial_id: string
  filename: string
  mime_type: string
  size: number
  tokens_est: number
  stored_path: string
}

function rowToDocument(row: TrialDocumentRow): TrialDocument {
  return {
    id: row.id,
    trialId: row.trial_id,
    filename: row.filename,
    mimeType: row.mime_type,
    size: row.size,
    tokensEst: row.tokens_est,
    storedPath: row.stored_path
  }
}

export function listTrialDocuments(trialId: string): TrialDocument[] {
  const rows = getDb()
    .prepare('SELECT * FROM trial_documents WHERE trial_id = ? ORDER BY rowid ASC')
    .all(trialId) as TrialDocumentRow[]
  return rows.map(rowToDocument)
}

export function getTrialDocument(id: string): TrialDocument | null {
  const row = getDb().prepare('SELECT * FROM trial_documents WHERE id = ?').get(id) as
    | TrialDocumentRow
    | undefined
  return row ? rowToDocument(row) : null
}

export interface AddTrialDocumentInput {
  trialId: string
  filename: string
  mimeType: string
  size: number
  tokensEst: number
  storedPath: string
}

export function addTrialDocument(input: AddTrialDocumentInput): TrialDocument {
  const id = randomUUID()
  getDb()
    .prepare(
      `INSERT INTO trial_documents (id, trial_id, filename, mime_type, size, tokens_est, stored_path)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, input.trialId, input.filename, input.mimeType, input.size, input.tokensEst, input.storedPath)
  return getTrialDocument(id)!
}

export function removeTrialDocument(id: string): void {
  getDb().prepare('DELETE FROM trial_documents WHERE id = ?').run(id)
}
