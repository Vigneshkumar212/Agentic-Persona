import { GeminiProvider } from './GeminiProvider'
import type { LLMProvider } from './LLMProvider'
import { loadApiKeys } from '../secrets'

/**
 * Holds one active LLMProvider instance per provider id for the app's
 * lifetime, rebuilt whenever a key changes. Only 'gemini' actually builds
 * an instance today — buildProvider() is the single place a real
 * Anthropic/OpenAI provider gets plugged in later.
 */

const providers = new Map<string, LLMProvider>()

function buildProvider(providerId: string, apiKey: string): LLMProvider | null {
  if (providerId === 'gemini') return new GeminiProvider(apiKey)
  return null
}

export function initProvidersFromStoredKeys(): void {
  providers.clear()
  for (const [providerId, apiKey] of Object.entries(loadApiKeys())) {
    const instance = buildProvider(providerId, apiKey)
    if (instance) providers.set(providerId, instance)
  }
}

export function setActiveProviderKey(providerId: string, apiKey: string): void {
  const instance = buildProvider(providerId, apiKey)
  if (instance) providers.set(providerId, instance)
}

export function clearActiveProviderKey(providerId: string): void {
  providers.delete(providerId)
}

export function getProvider(providerId: string): LLMProvider {
  const provider = providers.get(providerId)
  if (!provider) {
    throw new Error(`No API key configured for "${providerId}". Add one in Settings.`)
  }
  return provider
}

export function hasAnyProvider(): boolean {
  return providers.size > 0
}
