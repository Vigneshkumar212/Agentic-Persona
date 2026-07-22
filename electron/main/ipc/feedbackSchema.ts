import { ipcMain } from 'electron'
import { draftFeedbackSchema } from '../feedback/schemaDrafter'

export function registerFeedbackSchemaIpc(): void {
  ipcMain.handle('feedback-schema:draft', (_e, projectId: string, instructions: string) =>
    draftFeedbackSchema(projectId, instructions)
  )
}
