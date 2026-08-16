import { create } from 'zustand'
import type { ApiKeyStatus } from '@shared/types'

interface AppState {
  keyStatus: Record<string, ApiKeyStatus> | null
  hasAnyKey: boolean
  hasCompletedWelcome: boolean
  loading: boolean
  refresh: () => Promise<void>
}

export const useAppStore = create<AppState>((set) => ({
  keyStatus: null,
  hasAnyKey: false,
  hasCompletedWelcome: false,
  loading: true,
  refresh: async () => {
    const [keyStatus, hasAnyKey, hasCompletedWelcome] = await Promise.all([
      window.api.settings.getKeyStatus(),
      window.api.settings.hasAnyApiKey(),
      window.api.settings.hasCompletedWelcome()
    ])
    set({ keyStatus, hasAnyKey, hasCompletedWelcome, loading: false })
  }
}))
