import { randomUUID } from 'node:crypto'
import { getDb } from './database'
import type { CreateProjectInput, FeedbackSchema, PersonaMode, Project } from '../../../shared/types'
import { DEFAULT_MODEL } from '../../../shared/models'

interface ProjectRow {
  id: string
  name: string
  description: string
  persona_mode: PersonaMode
  persona_count: number
  variance: number
  generation_instructions: string
  default_countries: string
  default_languages: string
  default_audience: string
  model: string
  budget_tokens: number
  chat_token_limit: number
  cooldown_seconds: number
  default_feedback_schema: string | null
  created_at: string
  status: 'active' | 'archived'
}

function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    personaMode: row.persona_mode,
    personaCount: row.persona_count,
    variance: row.variance,
    generationInstructions: row.generation_instructions,
    defaultCountries: JSON.parse(row.default_countries),
    defaultLanguages: JSON.parse(row.default_languages),
    defaultAudience: row.default_audience,
    model: row.model,
    budgetTokens: row.budget_tokens,
    chatTokenLimit: row.chat_token_limit,
    cooldownSeconds: row.cooldown_seconds,
    defaultFeedbackSchema: row.default_feedback_schema ? JSON.parse(row.default_feedback_schema) : null,
    createdAt: row.created_at,
    status: row.status
  }
}

export function listProjects(): Project[] {
  const rows = getDb().prepare('SELECT * FROM projects ORDER BY created_at DESC').all() as ProjectRow[]
  return rows.map(rowToProject)
}

export function getProject(id: string): Project | null {
  const row = getDb().prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow | undefined
  return row ? rowToProject(row) : null
}

export function createProject(input: CreateProjectInput): Project {
  if (!input.name || !input.name.trim()) {
    throw new Error('Project name is required.')
  }

  const id = randomUUID()
  getDb()
    .prepare(
      `INSERT INTO projects (
        id, name, description, persona_mode, persona_count, variance,
        generation_instructions, default_countries, default_languages,
        default_audience, model, budget_tokens, chat_token_limit, cooldown_seconds
      ) VALUES (
        @id, @name, @description, @personaMode, @personaCount, @variance,
        @generationInstructions, @defaultCountries, @defaultLanguages,
        @defaultAudience, @model, @budgetTokens, @chatTokenLimit, @cooldownSeconds
      )`
    )
    .run({
      id,
      name: input.name.trim(),
      description: input.description ?? '',
      personaMode: input.personaMode ?? 'project',
      personaCount: input.personaCount ?? 5,
      variance: input.variance ?? 50,
      generationInstructions: input.generationInstructions ?? '',
      defaultCountries: JSON.stringify(input.defaultCountries ?? []),
      defaultLanguages: JSON.stringify(input.defaultLanguages ?? []),
      defaultAudience: input.defaultAudience ?? '',
      model: input.model || DEFAULT_MODEL,
      budgetTokens: input.budgetTokens ?? 0,
      chatTokenLimit: input.chatTokenLimit ?? 0,
      cooldownSeconds: input.cooldownSeconds ?? 2
    })

  return getProject(id)!
}

export function deleteProject(id: string): void {
  getDb().prepare('DELETE FROM projects WHERE id = ?').run(id)
}

export function setDefaultFeedbackSchema(id: string, schema: FeedbackSchema): void {
  getDb()
    .prepare('UPDATE projects SET default_feedback_schema = ? WHERE id = ?')
    .run(JSON.stringify(schema), id)
}
