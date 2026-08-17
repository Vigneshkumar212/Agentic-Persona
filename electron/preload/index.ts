import { contextBridge, ipcRenderer } from 'electron'
import type {
  Api,
  ApiKeyStatus,
  Chat,
  ChatMessage,
  ChatStreamChunk,
  CreateProjectInput,
  CreateTrialInput,
  Feedback,
  FeedbackSchema,
  PickAndAddDocumentsResult,
  OperationUsageBucket,
  Persona,
  Project,
  ProjectUsageTotal,
  Trial,
  TrialDocument,
  TrialSummary,
  TrialUsageBucket
} from '../../shared/types'
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
    getKeyStatus: (): Promise<Record<string, ApiKeyStatus>> => ipcRenderer.invoke('settings:get-key-status'),
    hasAnyApiKey: (): Promise<boolean> => ipcRenderer.invoke('settings:has-any-api-key'),
    setApiKey: (providerId: string, apiKey: string) =>
      ipcRenderer.invoke('settings:set-api-key', providerId, apiKey),
    clearApiKey: (providerId: string) => ipcRenderer.invoke('settings:clear-api-key', providerId),
    getDefaultModel: () => ipcRenderer.invoke('settings:get-default-model'),
    setDefaultModel: (model: string) => ipcRenderer.invoke('settings:set-default-model', model),
    hasCompletedWelcome: (): Promise<boolean> => ipcRenderer.invoke('settings:has-completed-welcome'),
    setCompletedWelcome: (): Promise<void> => ipcRenderer.invoke('settings:set-completed-welcome')
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
    get: (id: string): Promise<Persona | null> => ipcRenderer.invoke('personas:get', id),
    generateNext: (projectId: string, trialId: string | null): Promise<Persona> =>
      ipcRenderer.invoke('personas:generate-next', projectId, trialId),
    generatePanelSummary: (projectId: string, trialId: string | null): Promise<string> =>
      ipcRenderer.invoke('personas:generate-panel-summary', projectId, trialId),
    getPanelSummary: (projectId: string, trialId: string | null): Promise<string | null> =>
      ipcRenderer.invoke('personas:get-panel-summary', projectId, trialId),
    getBudgetStatus: (projectId: string, trialId: string | null): Promise<BudgetCheckResult> =>
      ipcRenderer.invoke('personas:get-budget-status', projectId, trialId)
  },
  feedbackSchema: {
    draft: (projectId: string, instructions: string): Promise<FeedbackSchema> =>
      ipcRenderer.invoke('feedback-schema:draft', projectId, instructions)
  },
  trials: {
    list: (projectId: string): Promise<Trial[]> => ipcRenderer.invoke('trials:list', projectId),
    get: (id: string): Promise<Trial | null> => ipcRenderer.invoke('trials:get', id),
    create: (input: CreateTrialInput): Promise<Trial> => ipcRenderer.invoke('trials:create', input),
    setFeedbackSchema: (id: string, schema: FeedbackSchema): Promise<void> =>
      ipcRenderer.invoke('trials:set-feedback-schema', id, schema),
    pickAndAddDocuments: (trialId: string): Promise<PickAndAddDocumentsResult> =>
      ipcRenderer.invoke('trials:pick-and-add-documents', trialId),
    listDocuments: (trialId: string): Promise<TrialDocument[]> =>
      ipcRenderer.invoke('trials:list-documents', trialId),
    removeDocument: (id: string): Promise<void> => ipcRenderer.invoke('trials:remove-document', id),
    collectFeedback: (trialId: string, personaId: string, extraInstructions?: string): Promise<Feedback> =>
      ipcRenderer.invoke('trials:collect-feedback', trialId, personaId, extraInstructions),
    listFeedback: (trialId: string): Promise<Feedback[]> => ipcRenderer.invoke('trials:list-feedback', trialId),
    generateSummary: (trialId: string): Promise<TrialSummary> =>
      ipcRenderer.invoke('trials:generate-summary', trialId),
    exportMarkdown: (trialId: string): Promise<string | null> =>
      ipcRenderer.invoke('trials:export-markdown', trialId)
  },
  chats: {
    findOrCreate: (projectId: string, trialId: string | null, personaId: string): Promise<Chat> =>
      ipcRenderer.invoke('chats:find-or-create', projectId, trialId, personaId),
    listMessages: (chatId: string): Promise<ChatMessage[]> => ipcRenderer.invoke('chats:list-messages', chatId),
    sendMessage: (chatId: string, content: string): Promise<ChatMessage> =>
      ipcRenderer.invoke('chats:send-message', chatId, content),
    onStreamChunk: (callback: (chunk: ChatStreamChunk) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, chunk: ChatStreamChunk): void => callback(chunk)
      ipcRenderer.on('chats:stream-chunk', listener)
      return () => ipcRenderer.removeListener('chats:stream-chunk', listener)
    }
  },
  usage: {
    getAllProjectsUsage: (): Promise<ProjectUsageTotal[]> => ipcRenderer.invoke('usage:get-all-projects'),
    getProjectUsageByTrial: (projectId: string): Promise<TrialUsageBucket[]> =>
      ipcRenderer.invoke('usage:get-project-by-trial', projectId),
    getProjectUsageByOperation: (projectId: string): Promise<OperationUsageBucket[]> =>
      ipcRenderer.invoke('usage:get-project-by-operation', projectId)
  }
}

contextBridge.exposeInMainWorld('api', api)
