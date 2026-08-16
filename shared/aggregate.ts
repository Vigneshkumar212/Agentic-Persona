import type { Feedback, FeedbackField, FeedbackSchema, FieldAggregate } from './types'

/**
 * Pure, deterministic aggregation of raw feedback rows into per-field
 * stats — no LLM call needed, so it's cheap to recompute on every view and
 * safe to unit test without a network.
 */

export function latestRoundFeedback(feedbackList: Feedback[]): Feedback[] {
  if (feedbackList.length === 0) return []
  const maxRound = Math.max(...feedbackList.map((f) => f.round))
  return feedbackList.filter((f) => f.round === maxRound)
}

export function computeFieldAggregate(field: FeedbackField, feedbackList: Feedback[]): FieldAggregate {
  const values = feedbackList.map((f) => f.structured[field.key]).filter((v) => v !== undefined && v !== null)

  switch (field.type) {
    case 'rating': {
      const nums = values.filter((v): v is number => typeof v === 'number')
      if (nums.length === 0) return { type: 'rating', average: 0, min: 0, max: 0, count: 0 }
      return {
        type: 'rating',
        average: round2(nums.reduce((a, b) => a + b, 0) / nums.length),
        min: Math.min(...nums),
        max: Math.max(...nums),
        count: nums.length
      }
    }
    case 'enum': {
      const counts: Record<string, number> = {}
      for (const v of values) {
        if (typeof v === 'string') counts[v] = (counts[v] ?? 0) + 1
      }
      return { type: 'enum', counts, total: values.length }
    }
    case 'boolean': {
      let trueCount = 0
      let falseCount = 0
      for (const v of values) {
        if (v === true) trueCount++
        else if (v === false) falseCount++
      }
      return { type: 'boolean', trueCount, falseCount }
    }
    case 'tags': {
      const counts: Record<string, number> = {}
      for (const v of values) {
        if (Array.isArray(v)) {
          for (const tag of v) counts[tag] = (counts[tag] ?? 0) + 1
        }
      }
      return { type: 'tags', counts, total: values.length }
    }
    case 'text':
      return { type: 'text', count: values.length }
  }
}

export function computeAllAggregates(
  schema: FeedbackSchema,
  feedbackList: Feedback[]
): Record<string, FieldAggregate> {
  const result: Record<string, FieldAggregate> = {}
  for (const field of schema.fields) {
    result[field.key] = computeFieldAggregate(field, feedbackList)
  }
  return result
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Short, human-readable one-liner for a computed aggregate (used in prompts and exports). */
export function describeAggregate(agg: FieldAggregate): string {
  switch (agg.type) {
    case 'rating':
      return agg.count > 0 ? `avg ${agg.average} (n=${agg.count}, range ${agg.min}-${agg.max})` : 'no answers'
    case 'boolean':
      return `${agg.trueCount} yes / ${agg.falseCount} no`
    case 'enum':
    case 'tags': {
      const entries = Object.entries(agg.counts)
      return entries.length > 0 ? entries.map(([k, v]) => `${k}: ${v}`).join(', ') : 'no answers'
    }
    case 'text':
      return `${agg.count} response${agg.count === 1 ? '' : 's'}`
  }
}
