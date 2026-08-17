import { ipcMain } from 'electron'
import { checkBudget } from '../../../shared/cost'
import { getProject } from '../db/projectsRepo'
import { getPanelSummary, getPersona, listPersonas } from '../db/personasRepo'
import { getUsageTotal } from '../db/usageRepo'
import { generateNextPersona } from '../personas/personaGenerator'
import { generatePanelSummary } from '../personas/panelSummary'

export function registerPersonasIpc(): void {
  ipcMain.handle('personas:list', (_e, projectId: string, trialId: string | null) =>
    listPersonas(projectId, trialId)
  )

  ipcMain.handle('personas:get', (_e, id: string) => getPersona(id))

  ipcMain.handle('personas:generate-next', (_e, projectId: string, trialId: string | null) =>
    generateNextPersona(projectId, trialId)
  )

  ipcMain.handle('personas:generate-panel-summary', (_e, projectId: string, trialId: string | null) =>
    generatePanelSummary(projectId, trialId)
  )

  ipcMain.handle('personas:get-panel-summary', (_e, projectId: string, trialId: string | null) =>
    getPanelSummary(projectId, trialId)
  )

  ipcMain.handle('personas:get-budget-status', (_e, projectId: string, trialId: string | null) => {
    const project = getProject(projectId)
    if (!project) throw new Error('Project not found.')
    const used = getUsageTotal(projectId, trialId)
    return checkBudget(used, project.budgetTokens)
  })
}
