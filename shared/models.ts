/**
 * Model catalogs, keyed by provider (see shared/providers.ts). Only Gemini
 * is wired up in v1 (electron/main/llm/GeminiProvider.ts) — the others are
 * empty until a real provider implementation lands, but the shape stays
 * ready for it.
 *
 * Gemini list + pricing confirmed against ai.google.dev/gemini-api/docs
 * (models + pricing pages) as of 2026-07-24. USD per 1M tokens, standard
 * (<=200k prompt) tier. Update here when Google changes the lineup.
 */
export interface ModelInfo {
  id: string
  label: string
  inputPerMillion: number
  outputPerMillion: number
}

const GEMINI_MODELS: ModelInfo[] = [
  { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash (recommended)', inputPerMillion: 1.5, outputPerMillion: 7.5 },
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash (most capable)', inputPerMillion: 1.5, outputPerMillion: 9.0 },
  {
    id: 'gemini-3.5-flash-lite',
    label: 'Gemini 3.5 Flash-Lite (fast & cheap)',
    inputPerMillion: 0.3,
    outputPerMillion: 2.5
  },
  {
    id: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash-Lite (budget)',
    inputPerMillion: 0.25,
    outputPerMillion: 1.5
  },
  {
    id: 'gemini-3.1-pro-preview',
    label: 'Gemini 3.1 Pro (preview, highest quality)',
    inputPerMillion: 2.0,
    outputPerMillion: 12.0
  },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (previous gen)', inputPerMillion: 1.25, outputPerMillion: 10.0 },
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash (previous gen)',
    inputPerMillion: 0.3,
    outputPerMillion: 2.5
  },
  {
    id: 'gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash-Lite (previous gen, cheapest)',
    inputPerMillion: 0.1,
    outputPerMillion: 0.4
  }
]

export const MODELS_BY_PROVIDER: Record<string, ModelInfo[]> = {
  gemini: GEMINI_MODELS,
  anthropic: [],
  openai: []
}

export const DEFAULT_MODEL = 'gemini-3.6-flash'
