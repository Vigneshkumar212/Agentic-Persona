import { ipcMain } from 'electron'
import type { CreateTrialInput, FeedbackSchema } from '../../../shared/types'
import { createTrial, getTrial, listTrials, setTrialFeedbackSchema } from '../db/trialsRepo'
import { getProject } from '../db/projectsRepo'
import { listTrialDocuments, removeTrialDocument } from '../db/trialDocumentsRepo'
import { listFeedback } from '../db/feedbackRepo'
import { pickAndAddDocuments } from '../trials/documentIngest'
import { collectFeedbackForPersona } from '../feedback/feedbackCollector'
import { generateTrialSummary } from '../feedback/trialSummary'
import { exportTrialMarkdown } from '../trials/markdownExport'

export function registerTrialsIpc(): void {
  ipcMain.handle('trials:list', (_e, projectId: string) => listTrials(projectId))

  ipcMain.handle('trials:get', (_e, id: string) => getTrial(id))

  ipcMain.handle('trials:create', (_e, input: CreateTrialInput) => createTrial(input))

  ipcMain.handle('trials:set-feedback-schema', (_e, id: string, schema: FeedbackSchema) =>
    setTrialFeedbackSchema(id, schema)
  )

  ipcMain.handle('trials:pick-and-add-documents', async (_e, trialId: string) => {
    const trial = getTrial(trialId)
    if (!trial) throw new Error('Trial not found.')
    const project = getProject(trial.projectId)
    if (!project) throw new Error('Project not found.')
    return pickAndAddDocuments(trialId, project)
  })

  ipcMain.handle('trials:list-documents', (_e, trialId: string) => listTrialDocuments(trialId))

  ipcMain.handle('trials:remove-document', (_e, id: string) => removeTrialDocument(id))

  ipcMain.handle(
    'trials:collect-feedback',
    (_e, trialId: string, personaId: string, extraInstructions?: string) =>
      collectFeedbackForPersona(trialId, personaId, extraInstructions)
  )

  ipcMain.handle('trials:list-feedback', (_e, trialId: string) => listFeedback(trialId))

  ipcMain.handle('trials:generate-summary', (_e, trialId: string) => generateTrialSummary(trialId))

  ipcMain.handle('trials:export-markdown', (_e, trialId: string) => exportTrialMarkdown(trialId))
}
