import { Type } from '@google/genai'

/**
 * Gemini responseSchema for the lead agent's feedback-schema draft. Gemini
 * structured output has no union/conditional types, so every field carries
 * all possible attributes (options, scaleMin, scaleMax) and the caller
 * strips whichever don't apply to that field's `type` — see
 * electron/main/feedback/schemaDrafter.ts#normalizeFieldDraft.
 */
export const FEEDBACK_FIELD_TYPES = ['rating', 'enum', 'boolean', 'tags', 'text'] as const

export const FEEDBACK_SCHEMA_DRAFT_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    fields: {
      type: Type.ARRAY,
      description: 'The structured feedback fields to ask every persona.',
      items: {
        type: Type.OBJECT,
        properties: {
          key: {
            type: Type.STRING,
            description: 'Short snake_case machine key, unique within the schema, e.g. "would_buy"'
          },
          label: { type: Type.STRING, description: 'Human-readable question or label' },
          type: {
            type: Type.STRING,
            format: 'enum',
            enum: FEEDBACK_FIELD_TYPES as unknown as string[]
          },
          required: { type: Type.BOOLEAN },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Choices, only used when type is "enum" or "tags"; empty array otherwise'
          },
          scaleMin: { type: Type.NUMBER, description: 'Only used when type is "rating"; 0 otherwise' },
          scaleMax: { type: Type.NUMBER, description: 'Only used when type is "rating"; 0 otherwise' }
        },
        required: ['key', 'label', 'type', 'required', 'options', 'scaleMin', 'scaleMax']
      }
    }
  },
  required: ['fields']
} satisfies Record<string, unknown>

export interface FeedbackFieldDraft {
  key: string
  label: string
  type: (typeof FEEDBACK_FIELD_TYPES)[number]
  required: boolean
  options: string[]
  scaleMin: number
  scaleMax: number
}
