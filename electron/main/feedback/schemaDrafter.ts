import type { FeedbackField, FeedbackSchema, Project } from '../../../shared/types'
import { getProject } from '../db/projectsRepo'
import { logUsage } from '../db/usageRepo'
import { getProvider } from '../llm/providerRegistry'
import { FEEDBACK_SCHEMA_DRAFT_RESPONSE_SCHEMA, type FeedbackFieldDraft } from '../llm/feedbackSchemaDraft'

const SYSTEM_INSTRUCTION =
  'You design structured feedback forms for synthetic customer-research panels. Given a project ' +
  "and the user's instructions, propose a short, focused set of fields that will produce useful, " +
  'comparable feedback. Prefer a handful of well-chosen fields over an exhaustive list. Always ' +
  'respond with a single JSON object matching the requested schema — no markdown, no commentary.'

function buildPrompt(project: Project, instructions: string): string {
  const parts: string[] = [`Project: "${project.name}"`]
  if (project.description) parts.push(`Description: ${project.description}`)
  parts.push(
    instructions.trim()
      ? `What the user wants feedback on: ${instructions.trim()}`
      : 'The user gave no specific instructions — propose a sensible general product-feedback schema.'
  )
  parts.push(
    'Propose 3-7 structured fields. Use "rating" for numeric scales (set scaleMin/scaleMax, ' +
      'e.g. 1-5 or 1-10), "boolean" for yes/no questions, "enum" for a single choice from a short ' +
      'list of options, "tags" for multiple choices from a list, and "text" for a short open-ended ' +
      'answer. A general freeform comments field is added automatically — do not include one yourself.'
  )
  return parts.join('\n\n')
}

function normalizeFieldDraft(draft: FeedbackFieldDraft, index: number): FeedbackField {
  const key = draft.key?.trim() || `field_${index + 1}`
  const base = { key, label: draft.label || key, required: draft.required, type: draft.type }

  if (draft.type === 'enum' || draft.type === 'tags') {
    return { ...base, options: draft.options.filter((o) => o.trim().length > 0) }
  }
  if (draft.type === 'rating') {
    const min = Number.isFinite(draft.scaleMin) ? draft.scaleMin : 1
    const max = Number.isFinite(draft.scaleMax) && draft.scaleMax > min ? draft.scaleMax : min + 4
    return { ...base, scale: { min, max } }
  }
  return base
}

function dedupeKeys(fields: FeedbackField[]): FeedbackField[] {
  const seen = new Map<string, number>()
  return fields.map((field) => {
    const count = seen.get(field.key) ?? 0
    seen.set(field.key, count + 1)
    return count === 0 ? field : { ...field, key: `${field.key}_${count + 1}` }
  })
}

export async function draftFeedbackSchema(projectId: string, instructions: string): Promise<FeedbackSchema> {
  const project = getProject(projectId)
  if (!project) throw new Error('Project not found.')

  const provider = getProvider()
  const result = await provider.generateStructured<{ fields: FeedbackFieldDraft[] }>({
    model: project.model,
    systemInstruction: SYSTEM_INSTRUCTION,
    input: buildPrompt(project, instructions),
    responseSchema: FEEDBACK_SCHEMA_DRAFT_RESPONSE_SCHEMA
  })

  logUsage(projectId, null, 'feedback_schema_draft', project.model, result.usage)

  const fields = dedupeKeys(result.data.fields.map(normalizeFieldDraft))
  return { fields, includesFreeformComments: true }
}
