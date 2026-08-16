import { dialog } from 'electron'
import { writeFile } from 'node:fs/promises'
import { computeAllAggregates, describeAggregate, latestRoundFeedback } from '../../../shared/aggregate'
import { getProject } from '../db/projectsRepo'
import { getTrial } from '../db/trialsRepo'
import { listFeedback } from '../db/feedbackRepo'
import { listPersonas } from '../db/personasRepo'

function buildMarkdown(trialId: string): string {
  const trial = getTrial(trialId)
  if (!trial) throw new Error('Trial not found.')
  const project = getProject(trial.projectId)
  if (!project) throw new Error('Project not found.')

  const personas = listPersonas(project.id, project.personaMode === 'trial' ? trialId : null)
  const personaById = new Map(personas.map((p) => [p.id, p]))
  const latest = latestRoundFeedback(listFeedback(trialId))

  const lines: string[] = [`# ${project.name} — ${trial.name}`, '']
  if (trial.explanation) lines.push(trial.explanation, '')

  if (trial.summary) {
    lines.push('## Summary', '', trial.summary.narrative, '')
  }

  if (trial.feedbackSchema && latest.length > 0) {
    lines.push('## Results', '')
    const aggregates = computeAllAggregates(trial.feedbackSchema, latest)
    for (const field of trial.feedbackSchema.fields) {
      lines.push(`- **${field.label}**: ${describeAggregate(aggregates[field.key])}`)
    }
    lines.push('')
  }

  lines.push(`## Individual feedback (${latest.length} personas, round ${latest[0]?.round ?? 1})`, '')
  for (const f of latest) {
    const persona = personaById.get(f.personaId)
    lines.push(`### ${persona?.name ?? 'Unknown persona'}`)
    if (persona) lines.push(`_${persona.oneLineSummary}_`)
    lines.push('')
    if (trial.feedbackSchema) {
      for (const field of trial.feedbackSchema.fields) {
        const value = f.structured[field.key]
        if (value === undefined) continue
        const display = Array.isArray(value) ? value.join(', ') : String(value)
        lines.push(`- **${field.label}**: ${display}`)
      }
    }
    if (f.freeformText) {
      lines.push('', f.freeformText)
    }
    lines.push('')
  }

  return lines.join('\n')
}

/** Opens a native save dialog and writes the trial's Markdown export. Returns the chosen path, or null if canceled. */
export async function exportTrialMarkdown(trialId: string): Promise<string | null> {
  const trial = getTrial(trialId)
  if (!trial) throw new Error('Trial not found.')

  const markdown = buildMarkdown(trialId)
  const safeName = trial.name.replace(/[^a-z0-9-_ ]/gi, '').trim() || 'trial'

  const result = await dialog.showSaveDialog({
    title: 'Export trial summary',
    defaultPath: `${safeName}.md`,
    filters: [{ name: 'Markdown', extensions: ['md'] }]
  })

  if (result.canceled || !result.filePath) return null

  await writeFile(result.filePath, markdown, 'utf-8')
  return result.filePath
}
