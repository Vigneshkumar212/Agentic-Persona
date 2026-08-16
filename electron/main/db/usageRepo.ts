import { randomUUID } from 'node:crypto'
import { getDb } from './database'
import { estimateCostUsd } from '../../../shared/cost'
import type { GenerateUsage } from '../llm/LLMProvider'

export function logUsage(
  projectId: string,
  trialId: string | null,
  operation: string,
  model: string,
  usage: GenerateUsage
): void {
  const cost = estimateCostUsd(model, usage.inputTokens, usage.outputTokens)
  getDb()
    .prepare(
      `INSERT INTO usage_log (id, project_id, trial_id, operation, model, tokens_in, tokens_out, cost_estimate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(randomUUID(), projectId, trialId, operation, model, usage.inputTokens, usage.outputTokens, cost)
}

/**
 * Usage — and therefore budget — is scoped per (project, trial), not per
 * project lifetime. `trialId: null` is its own bucket: the initial
 * project-level persona panel (generated before any trial exists). Each
 * trial gets its own independent bucket, each capped at the same
 * project.budgetTokens ceiling.
 */
export function getUsageTotal(projectId: string, trialId: string | null): number {
  const row = getDb()
    .prepare(
      'SELECT COALESCE(SUM(tokens_in + tokens_out), 0) as total FROM usage_log WHERE project_id = ? AND trial_id IS ?'
    )
    .get(projectId, trialId) as { total: number }
  return row.total
}
