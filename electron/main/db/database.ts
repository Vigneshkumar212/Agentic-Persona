import { app } from 'electron'
import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
// Vite inlines this as a string at build time (works for the main-process
// bundle too), so schema.sql never needs to be copied into out/.
import schema from './schema.sql?raw'

let db: Database.Database | null = null

/**
 * Opens (creating if needed) the single local SQLite database for the app
 * and applies schema.sql idempotently. Call once during app startup; use
 * getDb() everywhere else.
 */
export function initDatabase(): Database.Database {
  if (db) return db

  const userDataDir = app.getPath('userData')
  if (!existsSync(userDataDir)) mkdirSync(userDataDir, { recursive: true })

  const dbPath = join(userDataDir, 'agentic-persona.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(schema)

  return db
}

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized. Call initDatabase() during app startup first.')
  return db
}

export function closeDatabase(): void {
  db?.close()
  db = null
}
