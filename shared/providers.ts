/**
 * LLM providers a project can be configured to use. Only 'gemini' is
 * actually wired up (see electron/main/llm/GeminiProvider.ts) — the others
 * are listed so the UI and data model don't need to change shape when they
 * land, but they're not selectable yet.
 */
export interface ProviderInfo {
  id: string
  label: string
  available: boolean
}

export const PROVIDERS: ProviderInfo[] = [
  { id: 'gemini', label: 'Google Gemini', available: true },
  { id: 'anthropic', label: 'Anthropic Claude (coming soon)', available: false },
  { id: 'openai', label: 'OpenAI (coming soon)', available: false }
]

export const DEFAULT_PROVIDER = 'gemini'
