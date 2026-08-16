import { Type } from '@google/genai'
import type { FeedbackField, FeedbackSchema } from '../../../shared/types'

/**
 * Builds the Gemini responseSchema personas fill out when giving feedback,
 * dynamically from the trial's locked FeedbackSchema. Unlike
 * feedbackSchemaDraft.ts (which drafts *what fields to ask*), this is the
 * schema for *answering* those fields.
 */
function fieldToSchemaProperty(field: FeedbackField): Record<string, unknown> {
  switch (field.type) {
    case 'rating':
      return {
        type: Type.NUMBER,
        description: `${field.label} — rate from ${field.scale?.min ?? 1} to ${field.scale?.max ?? 5}`
      }
    case 'enum': {
      const options = (field.options ?? []).filter((o) => o.trim().length > 0)
      return options.length > 0
        ? { type: Type.STRING, format: 'enum', enum: options, description: field.label }
        : { type: Type.STRING, description: field.label }
    }
    case 'boolean':
      return { type: Type.BOOLEAN, description: field.label }
    case 'tags': {
      const options = (field.options ?? []).filter((o) => o.trim().length > 0)
      return {
        type: Type.ARRAY,
        items: options.length > 0 ? { type: Type.STRING, format: 'enum', enum: options } : { type: Type.STRING },
        description: `${field.label} — choose any that apply`
      }
    }
    case 'text':
      return { type: Type.STRING, description: field.label }
  }
}

export function buildFeedbackResponseSchema(schema: FeedbackSchema): Record<string, unknown> {
  const properties: Record<string, unknown> = {}
  const required: string[] = []

  for (const field of schema.fields) {
    properties[field.key] = fieldToSchemaProperty(field)
    if (field.required) required.push(field.key)
  }

  properties.comments = { type: Type.STRING, description: 'Freeform additional comments, in your own words' }
  required.push('comments')

  return { type: Type.OBJECT, properties, required }
}
