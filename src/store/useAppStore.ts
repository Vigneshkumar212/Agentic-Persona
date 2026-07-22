import { create } from 'zustand'
import type { ApiKeyStatus } from '@shared/types'

interface AppState {
  apiKeyStatus: ApiKeyStatus | null
  loading: boolean
  refreshApiKeyStatus: () => Promise<void>
}

export const useAppStore = create<AppState>((set) => ({
  apiKeyStatus: null,
  loading: true,
  refreshApiKeyStatus: async () => {
    const status = await window.api.settings.getApiKeyStatus()
    set({ apiKeyStatus: status, loading: false })
  }
}))
