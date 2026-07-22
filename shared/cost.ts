import type { CostEstimate, ModelPricing } from './types'
import { AVAILABLE_MODELS, DEFAULT_MODEL } from './models'

/**
 * Pure, network-free cost/token math shared by the main process (actual
 * budget enforcement) and the renderer (live estimates in the project
 * wizard as the user types, with no IPC round trip needed).
 */

export { DEFAULT_MODEL }

export const PRICE_TABLE: ModelPricing[] = AVAILABLE_MODELS.map((m) => ({
  model: m.id,
  inputPerMillion: m.inputPerMillion,
  outputPerMillion: m.outputPerMillion
}))

export function getModelPricing(model: string): ModelPricing {
  return (
    PRICE_TABLE.find((p) => p.model === model) ??
    PRICE_TABLE.find((p) => p.model === DEFAULT_MODEL)!
  )
}

export function estimateCostUsd(
  model: string,
  estimatedInputTokens: number,
  estimatedOutputTokens: number
): number {
  const pricing = getModelPricing(model)
  const inputCost = (estimatedInputTokens / 1_000_000) * pricing.inputPerMillion
  const outputCost = (estimatedOutputTokens / 1_000_000) * pricing.outputPerMillion
  return round4(inputCost + outputCost)
}

export function buildCostEstimate(
  model: string,
  estimatedInputTokens: number,
  estimatedOutputTokens: number
): CostEstimate {
  return {
    model,
    estimatedInputTokens,
    estimatedOutputTokens,
    estimatedCostUsd: estimateCostUsd(model, estimatedInputTokens, estimatedOutputTokens)
  }
}

/**
 * Rough, conservative persona-generation estimate used by the project
 * wizard's live cost preview before any tokens are actually counted.
 * Assumes each persona prompt grows slightly as carry-over summaries
 * accumulate, and a fixed-size structured output per persona.
 */
export function estimatePersonaGenerationTokens(
  personaCount: number,
  basePromptTokens = 400,
  perPriorSummaryTokens = 25,
  outputTokensPerPersona = 220
): { inputTokens: number; outputTokens: number } {
  let inputTokens = 0
  for (let i = 0; i < personaCount; i++) {
    inputTokens += basePromptTokens + i * perPriorSummaryTokens
  }
  const outputTokens = personaCount * outputTokensPerPersona
  return { inputTokens, outputTokens }
}

export interface BudgetCheckResult {
  withinBudget: boolean
  usedTokens: number
  budgetTokens: number
  remainingTokens: number
}

/**
 * A budget of 0 means "no limit" — callers should treat 0 as unlimited.
 */
export function checkBudget(usedTokens: number, budgetTokens: number): BudgetCheckResult {
  if (budgetTokens <= 0) {
    return { withinBudget: true, usedTokens, budgetTokens, remainingTokens: Infinity }
  }
  const remainingTokens = budgetTokens - usedTokens
  return {
    withinBudget: remainingTokens >= 0,
    usedTokens,
    budgetTokens,
    remainingTokens
  }
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000
}
