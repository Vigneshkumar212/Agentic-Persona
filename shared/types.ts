/**
 * Types shared between the Electron main process, the preload bridge, and
 * the React renderer. Keep this file free of Node/DOM-only APIs so it can
 * be imported from all three worlds.
 */

// ---------------------------------------------------------------------------
// Domain models (mirror the SQLite schema in electron/main/db/schema.sql)
// ---------------------------------------------------------------------------

export type PersonaMode = 'project' | 'trial'

export interface Project {
  id: string
  name: string
  description: string
  personaMode: PersonaMode
  personaCount: number
  variance: number // 0-100
  generationInstructions: string
  defaultCountries: string[] // empty = "any"
  defaultLanguages: string[] // empty = "any"
  defaultAudience: string
  model: string
  budgetTokens: number
  chatTokenLimit: number
  cooldownSeconds: number
  defaultFeedbackSchema: FeedbackSchema | null
  createdAt: string
  status: 'active' | 'archived'
}

export interface PersonaRecord {
  name: string
  age: number
  country: string
  language: string
  occupation: string
  background: string
  values: string[]
  personalityTraits: string[]
  oneLineSummary: string
}

export interface Persona {
  id: string
  projectId: string
  trialId: string | null
  name: string
  persona: PersonaRecord
  oneLineSummary: string
  orderIndex: number
  createdAt: string
}

export interface Trial {
  id: string
  projectId: string
  name: string
  explanation: string
  feedbackSchema: FeedbackSchema | null
  summary: unknown | null
  createdAt: string
  status: 'draft' | 'running' | 'complete'
}

export interface TrialDocument {
  id: string
  trialId: string
  filename: string
  mimeType: string
  size: number
  tokensEst: number
  storedPath: string
}

export interface Feedback {
  id: string
  trialId: string
  personaId: string
  structured: Record<string, unknown>
  freeformText: string
  createdAt: string
  tokensIn: number
  tokensOut: number
}

export interface Chat {
  id: string
  projectId: string
  trialId: string | null
  personaId: string | null
  title: string
  createdAt: string
}

export interface ChatMessage {
  id: string
  chatId: string
  role: 'user' | 'model' | 'system'
  content: string
  createdAt: string
  tokensIn: number
  tokensOut: number
  model: string
}

export interface UsageLogEntry {
  id: string
  projectId: string
  trialId: string | null
  operation: string
  model: string
  tokensIn: number
  tokensOut: number
  costEstimate: number
  createdAt: string
}

// ---------------------------------------------------------------------------
// Adaptive feedback schema (lead agent drafts, user confirms/edits)
// ---------------------------------------------------------------------------

export type FeedbackFieldType = 'rating' | 'enum' | 'boolean' | 'tags' | 'text'

export interface FeedbackField {
  key: string
  label: string
  type: FeedbackFieldType
  required: boolean
  options?: string[] // for enum/tags
  scale?: { min: number; max: number } // for rating
}

export interface FeedbackSchema {
  fields: FeedbackField[]
  /** Always present in addition to structured fields. */
  includesFreeformComments: true
}

// ---------------------------------------------------------------------------
// Cost / token accounting
// ---------------------------------------------------------------------------

export interface ModelPricing {
  model: string
  inputPerMillion: number
  outputPerMillion: number
}

export interface CostEstimate {
  model: string
  estimatedInputTokens: number
  estimatedOutputTokens: number
  estimatedCostUsd: number
}

// ---------------------------------------------------------------------------
// API surface exposed by the preload bridge as `window.api`
// ---------------------------------------------------------------------------

export interface ApiKeyStatus {
  hasKey: boolean
  maskedKey: string | null
}

export interface AppApi {
  getVersion(): Promise<string>
  ping(): Promise<'pong'>
}

export interface SettingsApi {
  getApiKeyStatus(): Promise<ApiKeyStatus>
  /** Validates the key against the Gemini API before persisting it. */
  setApiKey(apiKey: string): Promise<{ ok: true } | { ok: false; error: string }>
  clearApiKey(): Promise<void>
  getDefaultModel(): Promise<string>
  setDefaultModel(model: string): Promise<void>
  getAvailableModels(): Promise<import('./models').ModelInfo[]>
}

// ---------------------------------------------------------------------------
// Project CRUD (used by Home + the project setup wizard)
// ---------------------------------------------------------------------------

export interface CreateProjectInput {
  name: string
  description?: string
  personaMode?: PersonaMode
  personaCount?: number
  variance?: number
  generationInstructions?: string
  defaultCountries?: string[]
  defaultLanguages?: string[]
  defaultAudience?: string
  model: string
  budgetTokens?: number
  chatTokenLimit?: number
  cooldownSeconds?: number
}

export interface ProjectsApi {
  list(): Promise<Project[]>
  get(id: string): Promise<Project | null>
  create(input: CreateProjectInput): Promise<Project>
  delete(id: string): Promise<void>
  setDefaultFeedbackSchema(id: string, schema: FeedbackSchema): Promise<void>
}

// ---------------------------------------------------------------------------
// Adaptive feedback-schema drafting (lead agent proposes, user confirms)
// ---------------------------------------------------------------------------

export interface FeedbackSchemaApi {
  /** Drafts a schema from NL instructions; does not persist it. */
  draft(projectId: string, instructions: string): Promise<FeedbackSchema>
}

// ---------------------------------------------------------------------------
// Persona generation (the carry-over-diversity engine described in the plan)
// ---------------------------------------------------------------------------

export interface PersonasApi {
  list(projectId: string, trialId: string | null): Promise<Persona[]>
  /** Generates exactly one persona, carrying forward prior one-line summaries. */
  generateNext(projectId: string, trialId: string | null): Promise<Persona>
  generatePanelSummary(projectId: string, trialId: string | null): Promise<string>
  getPanelSummary(projectId: string, trialId: string | null): Promise<string | null>
  getBudgetStatus(projectId: string): Promise<import('./cost').BudgetCheckResult>
}

export interface Api {
  app: AppApi
  settings: SettingsApi
  projects: ProjectsApi
  personas: PersonasApi
  feedbackSchema: FeedbackSchemaApi
}

declare global {
  interface Window {
    api: Api
  }
}
