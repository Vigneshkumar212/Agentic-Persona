/**
 * Canonical list of supported Gemini models — the single source of truth
 * for both pricing (electron/main/cost/priceTable.ts) and the model
 * picker UI in the renderer. Update prices here when Google changes them:
 * https://ai.google.dev/gemini-api/docs/pricing
 */
export interface ModelInfo {
  id: string
  label: string
  /** USD per 1M input tokens, standard (<=200k prompt) tier. */
  inputPerMillion: number
  /** USD per 1M output tokens, standard (<=200k prompt) tier. */
  outputPerMillion: number
}

export const AVAILABLE_MODELS: ModelInfo[] = [
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash (recommended)',
    inputPerMillion: 0.3,
    outputPerMillion: 2.5
  },
  {
    id: 'gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash-Lite (cheapest)',
    inputPerMillion: 0.1,
    outputPerMillion: 0.4
  },
  {
    id: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro (highest quality)',
    inputPerMillion: 1.25,
    outputPerMillion: 10.0
  }
]

export const DEFAULT_MODEL = 'gemini-2.5-flash'
