import { app, safeStorage } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Encrypted-at-rest API key storage using Electron's safeStorage (OS
 * keychain: DPAPI on Windows, Keychain on macOS, libsecret on Linux).
 *
 * The key is written to a file as an opaque encrypted blob, never as
 * plaintext, and is only ever read back inside the main process. The
 * renderer never sees it.
 */

const KEY_FILENAME = 'gemini.key.enc'

function keyFilePath(): string {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, KEY_FILENAME)
}

export function hasApiKey(): boolean {
  return existsSync(keyFilePath())
}

export function saveApiKey(apiKey: string): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error(
      'OS-level secure storage is not available on this machine, so the API key cannot be stored safely.'
    )
  }
  const encrypted = safeStorage.encryptString(apiKey)
  writeFileSync(keyFilePath(), encrypted)
}

export function loadApiKey(): string | null {
  const path = keyFilePath()
  if (!existsSync(path)) return null
  const encrypted = readFileSync(path)
  return safeStorage.decryptString(encrypted)
}

export function clearApiKey(): void {
  const path = keyFilePath()
  if (existsSync(path)) unlinkSync(path)
}

export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) return '••••••••'
  return `${apiKey.slice(0, 4)}••••••••${apiKey.slice(-4)}`
}
