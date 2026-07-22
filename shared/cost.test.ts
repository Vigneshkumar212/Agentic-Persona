import { describe, expect, it } from 'vitest'
import { buildCostEstimate, checkBudget, estimateCostUsd, estimatePersonaGenerationTokens } from './cost'
import { PRICE_TABLE, DEFAULT_MODEL, getModelPricing } from './cost'

describe('estimateCostUsd', () => {
  it('computes input+output cost from the price table', () => {
    const pricing = getModelPricing(DEFAULT_MODEL)
    const cost = estimateCostUsd(DEFAULT_MODEL, 1_000_000, 1_000_000)
    expect(cost).toBeCloseTo(pricing.inputPerMillion + pricing.outputPerMillion, 4)
  })

  it('falls back to the default model for unknown model ids', () => {
    const known = estimateCostUsd(DEFAULT_MODEL, 500_000, 0)
    const unknown = estimateCostUsd('not-a-real-model', 500_000, 0)
    expect(unknown).toBe(known)
  })

  it('returns 0 for 0 tokens', () => {
    expect(estimateCostUsd(DEFAULT_MODEL, 0, 0)).toBe(0)
  })
})

describe('buildCostEstimate', () => {
  it('bundles model, tokens, and cost together', () => {
    const estimate = buildCostEstimate(DEFAULT_MODEL, 1000, 500)
    expect(estimate.model).toBe(DEFAULT_MODEL)
    expect(estimate.estimatedInputTokens).toBe(1000)
    expect(estimate.estimatedOutputTokens).toBe(500)
    expect(estimate.estimatedCostUsd).toBeGreaterThan(0)
  })
})

describe('estimatePersonaGenerationTokens', () => {
  it('grows input tokens as more personas carry prior summaries', () => {
    const { inputTokens: five } = estimatePersonaGenerationTokens(5)
    const { inputTokens: ten } = estimatePersonaGenerationTokens(10)
    // Roughly double the personas should cost more than double the input
    // tokens, since later personas also carry more prior summaries.
    expect(ten).toBeGreaterThan(five * 2)
  })

  it('scales output tokens linearly with persona count', () => {
    const { outputTokens } = estimatePersonaGenerationTokens(4, 400, 25, 220)
    expect(outputTokens).toBe(4 * 220)
  })

  it('returns zero tokens for zero personas', () => {
    const { inputTokens, outputTokens } = estimatePersonaGenerationTokens(0)
    expect(inputTokens).toBe(0)
    expect(outputTokens).toBe(0)
  })
})

describe('checkBudget', () => {
  it('treats a budget of 0 as unlimited', () => {
    const result = checkBudget(1_000_000, 0)
    expect(result.withinBudget).toBe(true)
    expect(result.remainingTokens).toBe(Infinity)
  })

  it('flags over-budget usage', () => {
    const result = checkBudget(1500, 1000)
    expect(result.withinBudget).toBe(false)
    expect(result.remainingTokens).toBe(-500)
  })

  it('flags within-budget usage', () => {
    const result = checkBudget(500, 1000)
    expect(result.withinBudget).toBe(true)
    expect(result.remainingTokens).toBe(500)
  })
})

describe('PRICE_TABLE', () => {
  it('has a pricing entry for the default model', () => {
    expect(PRICE_TABLE.some((p) => p.model === DEFAULT_MODEL)).toBe(true)
  })
})
