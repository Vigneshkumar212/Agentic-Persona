import { Type } from '@google/genai'

/**
 * Gemini responseSchema for a single persona. Kept in lockstep with
 * shared/types.ts#PersonaRecord — if you add a field there, add it here.
 */
export const PERSONA_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "The persona's full name" },
    age: { type: Type.NUMBER },
    country: { type: Type.STRING },
    language: { type: Type.STRING, description: 'Primary language the persona speaks' },
    occupation: { type: Type.STRING },
    background: {
      type: Type.STRING,
      description: '2-3 sentence bio: life context relevant to evaluating this product'
    },
    values: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '2-4 short phrases describing what this persona cares about'
    },
    personalityTraits: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '2-4 short personality traits'
    },
    oneLineSummary: {
      type: Type.STRING,
      description:
        'One sentence (under 20 words) capturing who this persona is, distinct enough to tell them apart from other personas in the panel at a glance'
    }
  },
  required: [
    'name',
    'age',
    'country',
    'language',
    'occupation',
    'background',
    'values',
    'personalityTraits',
    'oneLineSummary'
  ]
} satisfies Record<string, unknown>
