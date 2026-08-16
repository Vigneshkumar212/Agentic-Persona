import { ipcMain } from 'electron'
import type { ApiKeyStatus } from '../../../shared/types'
import { clearProviderKey, hasAnyApiKey, loadApiKeys, maskApiKey, setProviderKey } from '../secrets'
import { clearActiveProviderKey, setActiveProviderKey } from '../llm/providerRegistry'
import { GeminiProvider } from '../llm/GeminiProvider'
import { getDb } from '../db/database'
import { DEFAULT_MODEL } from '../../../shared/models'
import { PROVIDERS } from '../../../shared/providers'

const SETTINGS_DEFAULT_MODEL_KEY = 'defaultModel'
const SETTINGS_WELCOME_COMPLETED_KEY = 'welcomeCompleted'

function getSetting(key: string): string | undefined {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value
}

function setSetting(key: string, value: string): void {
  getDb()
    .prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    )
    .run(key, value)
}

export function registerSettingsIpc(): void {
  ipcMain.handle('settings:get-key-status', (): Record<string, ApiKeyStatus> => {
    const keys = loadApiKeys()
    const status: Record<string, ApiKeyStatus> = {}
    for (const provider of PROVIDERS) {
      const key = keys[provider.id]
      status[provider.id] = key ? { hasKey: true, maskedKey: maskApiKey(key) } : { hasKey: false, maskedKey: null }
    }
    return status
  })

  ipcMain.handle('settings:has-any-api-key', () => hasAnyApiKey())

  ipcMain.handle('settings:set-api-key', async (_e, providerId: string, apiKey: string) => {
    const providerInfo = PROVIDERS.find((p) => p.id === providerId)
    if (!providerInfo?.available) {
      return { ok: false, error: `${providerInfo?.label ?? providerId} isn't supported yet.` }
    }
    if (!apiKey || apiKey.trim().length < 10) {
      return { ok: false, error: 'That does not look like a valid API key.' }
    }

    // Validate against the real API before persisting anything.
    if (providerId === 'gemini') {
      const candidate = new GeminiProvider(apiKey.trim())
      const validation = await candidate.validateApiKey()
      if (!validation.ok) {
        return { ok: false, error: validation.error }
      }
    }

    setProviderKey(providerId, apiKey.trim())
    setActiveProviderKey(providerId, apiKey.trim())
    return { ok: true }
  })

  ipcMain.handle('settings:clear-api-key', (_e, providerId: string) => {
    clearProviderKey(providerId)
    clearActiveProviderKey(providerId)
  })

  ipcMain.handle('settings:get-default-model', () => getSetting(SETTINGS_DEFAULT_MODEL_KEY) ?? DEFAULT_MODEL)

  ipcMain.handle('settings:set-default-model', (_e, model: string) =>
    setSetting(SETTINGS_DEFAULT_MODEL_KEY, model)
  )

  ipcMain.handle('settings:has-completed-welcome', () => getSetting(SETTINGS_WELCOME_COMPLETED_KEY) === '1')

  ipcMain.handle('settings:set-completed-welcome', () => setSetting(SETTINGS_WELCOME_COMPLETED_KEY, '1'))
}
