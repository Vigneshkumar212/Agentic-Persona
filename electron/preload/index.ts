import { contextBridge, ipcRenderer } from 'electron'
import type {
  Api,
  ApiKeyStatus,
  CreateProjectInput,
  FeedbackSchema,
  Persona,
  Project
} from '../../shared/types'
import type { ModelInfo } from '../../shared/models'
import type { BudgetCheckResult } from '../../shared/cost'

/**
 * The only bridge between renderer and main. Every method here is a thin,
 * named wrapper around ipcRenderer.invoke — no raw ipcRenderer, no
 * arbitrary channel names, and never anything that exposes the API key
 * itself to the renderer.
 */
const api: Api = {
  app: {
    getVersion: () => ipcRenderer.invoke('app:get-version'),
    ping: () => ipcRenderer.invoke('app:ping')
  },
  settings: {
    getApiKeyStatus: (): Promise<ApiKeyStatus> => ipcRenderer.invoke('settings:get-api-key-status'),
    setApiKey: (apiKey: string) => ipcRenderer.invoke('settings:set-api-key', apiKey),
    clearApiKey: () => ipcRenderer.invoke('settings:clear-api-key'),
    getDefaultModel: () => ipcRenderer.invoke('settings:get-default-model'),
    setDefaultModel: (model: string) => ipcRenderer.invoke('settings:set-default-model', model),
    getAvailableModels: (): Promise<ModelInfo[]> => ipcRenderer.invoke('settings:get-available-models')
  },
  projects: {
    list: (): Promise<Project[]> => ipcRenderer.invoke('projects:list'),
    get: (id: string): Promise<Project | null> => ipcRenderer.invoke('projects:get', id),
    create: (input: CreateProjectInput): Promise<Project> => ipcRenderer.invoke('projects:create', input),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('projects:delete', id),
    setDefaultFeedbackSchema: (id: string, schema: FeedbackSchema): Promise<void> =>
      ipcRenderer.invoke('projects:set-default-feedback-schema', id, schema)
  },
  personas: {
    list: (projectId: string, trialId: string | null): Promise<Persona[]> =>
      ipcRenderer.invoke('personas:list', projectId, trialId),
    generateNext: (projectId: string, trialId: string | null): Promise<Persona> =>
      ipcRenderer.invoke('personas:generate-next', projectId, trialId),
    generatePanelSummary: (projectId: string, trialId: string | null): Promise<string> =>
      ipcRenderer.invoke('personas:generate-panel-summary', projectId, trialId),
    getPanelSummary: (projectId: string, trialId: string | null): Promise<string | null> =>
      ipcRenderer.invoke('personas:get-panel-summary', projectId, trialId),
    getBudgetStatus: (projectId: string): Promise<BudgetCheckResult> =>
      ipcRenderer.invoke('personas:get-budget-status', projectId)
  },
  feedbackSchema: {
    draft: (projectId: string, instructions: string): Promise<FeedbackSchema> =>
      ipcRenderer.invoke('feedback-schema:draft', projectId, instructions)
  }
}

contextBridge.exposeInMainWorld('api', api)
