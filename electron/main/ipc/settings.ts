import { ipcMain } from 'electron'
import type { ApiKeyStatus } from '../../../shared/types'
import { clearApiKey, hasApiKey, loadApiKey, maskApiKey, saveApiKey } from '../secrets'
import { clearProvider, setProviderApiKey } from '../llm/providerRegistry'
import { GeminiProvider } from '../llm/GeminiProvider'
import { getDb } from '../db/database'
import { AVAILABLE_MODELS, DEFAULT_MODEL } from '../../../shared/models'

const SETTINGS_DEFAULT_MODEL_KEY = 'defaultModel'

export function registerSettingsIpc(): void {
  ipcMain.handle('settings:get-api-key-status', (): ApiKeyStatus => {
    if (!hasApiKey()) return { hasKey: false, maskedKey: null }
    const key = loadApiKey()
    return { hasKey: true, maskedKey: key ? maskApiKey(key) : null }
  })

  ipcMain.handle('settings:set-api-key', async (_e, apiKey: string) => {
    if (!apiKey || apiKey.trim().length < 10) {
      return { ok: false, error: 'That does not look like a valid API key.' }
    }

    // Validate against the real API before persisting anything.
    const candidate = new GeminiProvider(apiKey.trim())
    const validation = await candidate.validateApiKey()
    if (!validation.ok) {
      return { ok: false, error: validation.error }
    }

    saveApiKey(apiKey.trim())
    setProviderApiKey(apiKey.trim())
    return { ok: true }
  })

  ipcMain.handle('settings:clear-api-key', () => {
    clearApiKey()
    clearProvider()
  })

  ipcMain.handle('settings:get-default-model', () => {
    const row = getDb()
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get(SETTINGS_DEFAULT_MODEL_KEY) as { value: string } | undefined
    return row?.value ?? DEFAULT_MODEL
  })

  ipcMain.handle('settings:set-default-model', (_e, model: string) => {
    getDb()
      .prepare(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
      )
      .run(SETTINGS_DEFAULT_MODEL_KEY, model)
  })

  ipcMain.handle('settings:get-available-models', () => AVAILABLE_MODELS)
}
