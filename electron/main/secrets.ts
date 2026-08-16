import { app, safeStorage } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Encrypted-at-rest API key storage using Electron's safeStorage (OS
 * keychain: DPAPI on Windows, Keychain on macOS, libsecret on Linux).
 *
 * Keys for every provider are stored together as one encrypted JSON blob
 * (never plaintext), keyed by provider id (see shared/providers.ts). Only
 * ever read back inside the main process — the renderer never sees them.
 */

const KEYS_FILENAME = 'api-keys.enc'

export type StoredKeys = Record<string, string>

function keysFilePath(): string {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, KEYS_FILENAME)
}

export function loadApiKeys(): StoredKeys {
  const path = keysFilePath()
  if (!existsSync(path)) return {}
  try {
    const encrypted = readFileSync(path)
    return JSON.parse(safeStorage.decryptString(encrypted)) as StoredKeys
  } catch {
    return {}
  }
}

function saveApiKeys(keys: StoredKeys): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error(
      'OS-level secure storage is not available on this machine, so API keys cannot be stored safely.'
    )
  }
  const encrypted = safeStorage.encryptString(JSON.stringify(keys))
  writeFileSync(keysFilePath(), encrypted)
}

export function setProviderKey(providerId: string, apiKey: string): void {
  const keys = loadApiKeys()
  keys[providerId] = apiKey
  saveApiKeys(keys)
}

export function clearProviderKey(providerId: string): void {
  const keys = loadApiKeys()
  delete keys[providerId]
  saveApiKeys(keys)
}

export function hasAnyApiKey(): boolean {
  return Object.keys(loadApiKeys()).length > 0
}

export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) return '••••••••'
  return `${apiKey.slice(0, 4)}••••••••${apiKey.slice(-4)}`
}
