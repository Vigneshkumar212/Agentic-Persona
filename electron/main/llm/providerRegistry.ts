import { GeminiProvider } from './GeminiProvider'
import type { LLMProvider } from './LLMProvider'
import { loadApiKey } from '../secrets'

/**
 * Holds the single active LLMProvider instance for the app's lifetime.
 * Rebuilt whenever the API key changes. Everything downstream (persona
 * generation, feedback, chat) should call getProvider() rather than
 * constructing a client itself.
 */

let provider: LLMProvider | null = null

export function initProviderFromStoredKey(): void {
  const apiKey = loadApiKey()
  provider = apiKey ? new GeminiProvider(apiKey) : null
}

export function setProviderApiKey(apiKey: string): void {
  provider = new GeminiProvider(apiKey)
}

export function clearProvider(): void {
  provider = null
}

export function getProvider(): LLMProvider {
  if (!provider) {
    throw new Error('No API key configured yet. Complete setup before making a request.')
  }
  return provider
}

export function hasProvider(): boolean {
  return provider !== null
}
