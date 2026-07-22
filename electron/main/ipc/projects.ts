import { ipcMain } from 'electron'
import type { CreateProjectInput, FeedbackSchema } from '../../../shared/types'
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  setDefaultFeedbackSchema
} from '../db/projectsRepo'

export function registerProjectsIpc(): void {
  ipcMain.handle('projects:list', () => listProjects())
  ipcMain.handle('projects:get', (_e, id: string) => getProject(id))
  ipcMain.handle('projects:create', (_e, input: CreateProjectInput) => createProject(input))
  ipcMain.handle('projects:delete', (_e, id: string) => deleteProject(id))
  ipcMain.handle('projects:set-default-feedback-schema', (_e, id: string, schema: FeedbackSchema) =>
    setDefaultFeedbackSchema(id, schema)
  )
}
