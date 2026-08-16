import { describe, expect, it } from 'vitest'
import { computeAllAggregates, computeFieldAggregate, latestRoundFeedback } from './aggregate'
import type { Feedback, FeedbackField, FeedbackSchema } from './types'

function makeFeedback(overrides: Partial<Feedback>): Feedback {
  return {
    id: overrides.id ?? Math.random().toString(36),
    trialId: 't1',
    personaId: overrides.personaId ?? 'p1',
    round: overrides.round ?? 1,
    structured: overrides.structured ?? {},
    freeformText: overrides.freeformText ?? '',
    createdAt: '2026-01-01T00:00:00.000Z',
    tokensIn: 0,
    tokensOut: 0
  }
}

describe('latestRoundFeedback', () => {
  it('keeps only the highest round', () => {
    const rows = [
      makeFeedback({ id: 'a', round: 1 }),
      makeFeedback({ id: 'b', round: 2 }),
      makeFeedback({ id: 'c', round: 1 })
    ]
    const latest = latestRoundFeedback(rows)
    expect(latest.map((r) => r.id)).toEqual(['b'])
  })

  it('returns an empty array for no feedback', () => {
    expect(latestRoundFeedback([])).toEqual([])
  })
})

describe('computeFieldAggregate', () => {
  it('averages rating fields and tracks min/max', () => {
    const field: FeedbackField = { key: 'satisfaction', label: 'Satisfaction', type: 'rating', required: true }
    const rows = [
      makeFeedback({ structured: { satisfaction: 4 } }),
      makeFeedback({ structured: { satisfaction: 2 } }),
      makeFeedback({ structured: { satisfaction: 5 } })
    ]
    const agg = computeFieldAggregate(field, rows)
    expect(agg).toEqual({ type: 'rating', average: 3.67, min: 2, max: 5, count: 3 })
  })

  it('handles a rating field with no answers', () => {
    const field: FeedbackField = { key: 'satisfaction', label: 'Satisfaction', type: 'rating', required: true }
    const agg = computeFieldAggregate(field, [])
    expect(agg).toEqual({ type: 'rating', average: 0, min: 0, max: 0, count: 0 })
  })

  it('counts enum distributions', () => {
    const field: FeedbackField = { key: 'reaction', label: 'Reaction', type: 'enum', required: true }
    const rows = [
      makeFeedback({ structured: { reaction: 'love it' } }),
      makeFeedback({ structured: { reaction: 'meh' } }),
      makeFeedback({ structured: { reaction: 'love it' } })
    ]
    const agg = computeFieldAggregate(field, rows)
    expect(agg).toEqual({ type: 'enum', counts: { 'love it': 2, meh: 1 }, total: 3 })
  })

  it('counts boolean true/false', () => {
    const field: FeedbackField = { key: 'would_buy', label: 'Would buy', type: 'boolean', required: true }
    const rows = [
      makeFeedback({ structured: { would_buy: true } }),
      makeFeedback({ structured: { would_buy: false } }),
      makeFeedback({ structured: { would_buy: true } })
    ]
    const agg = computeFieldAggregate(field, rows)
    expect(agg).toEqual({ type: 'boolean', trueCount: 2, falseCount: 1 })
  })

  it('counts tag frequencies across multi-select answers', () => {
    const field: FeedbackField = { key: 'concerns', label: 'Concerns', type: 'tags', required: false }
    const rows = [
      makeFeedback({ structured: { concerns: ['price', 'onboarding'] } }),
      makeFeedback({ structured: { concerns: ['price'] } })
    ]
    const agg = computeFieldAggregate(field, rows)
    expect(agg).toEqual({ type: 'tags', counts: { price: 2, onboarding: 1 }, total: 2 })
  })

  it('just counts responses for text fields', () => {
    const field: FeedbackField = { key: 'notes', label: 'Notes', type: 'text', required: false }
    const rows = [makeFeedback({ structured: { notes: 'good' } }), makeFeedback({ structured: {} })]
    const agg = computeFieldAggregate(field, rows)
    expect(agg).toEqual({ type: 'text', count: 1 })
  })
})

describe('computeAllAggregates', () => {
  it('computes an aggregate per schema field', () => {
    const schema: FeedbackSchema = {
      fields: [
        { key: 'rating', label: 'Rating', type: 'rating', required: true },
        { key: 'would_buy', label: 'Would buy', type: 'boolean', required: true }
      ],
      includesFreeformComments: true
    }
    const rows = [makeFeedback({ structured: { rating: 4, would_buy: true } })]
    const result = computeAllAggregates(schema, rows)
    expect(Object.keys(result)).toEqual(['rating', 'would_buy'])
    expect(result.rating.type).toBe('rating')
    expect(result.would_buy.type).toBe('boolean')
  })
})
