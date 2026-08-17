import { ipcMain } from 'electron'
import { getAllProjectsUsage, getProjectUsageByOperation, getProjectUsageByTrial } from '../db/usageRepo'

export function registerUsageIpc(): void {
  ipcMain.handle('usage:get-all-projects', () => getAllProjectsUsage())

  ipcMain.handle('usage:get-project-by-trial', (_e, projectId: string) => getProjectUsageByTrial(projectId))

  ipcMain.handle('usage:get-project-by-operation', (_e, projectId: string) =>
    getProjectUsageByOperation(projectId)
  )
}
