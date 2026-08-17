import { randomUUID } from 'node:crypto'
import { getDb } from './database'
import { estimateCostUsd } from '../../../shared/cost'
import type { GenerateUsage } from '../llm/LLMProvider'
import type { OperationUsageBucket, ProjectUsageTotal, TrialUsageBucket } from '../../../shared/types'

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

/** Rollup across every project, for the top-level usage dashboard. */
export function getAllProjectsUsage(): ProjectUsageTotal[] {
  return getDb()
    .prepare(
      `SELECT
         project_id AS projectId,
         COALESCE(SUM(tokens_in + tokens_out), 0) AS totalTokens,
         COALESCE(SUM(cost_estimate), 0) AS totalCost,
         COUNT(*) AS callCount
       FROM usage_log
       GROUP BY project_id`
    )
    .all() as ProjectUsageTotal[]
}

/** One row per budget bucket: trialId null = the project-level persona panel, otherwise that trial. */
export function getProjectUsageByTrial(projectId: string): TrialUsageBucket[] {
  return getDb()
    .prepare(
      `SELECT
         trial_id AS trialId,
         COALESCE(SUM(tokens_in + tokens_out), 0) AS totalTokens,
         COALESCE(SUM(cost_estimate), 0) AS totalCost,
         COUNT(*) AS callCount
       FROM usage_log
       WHERE project_id = ?
       GROUP BY trial_id`
    )
    .all(projectId) as TrialUsageBucket[]
}

export function getProjectUsageByOperation(projectId: string): OperationUsageBucket[] {
  return getDb()
    .prepare(
      `SELECT
         operation,
         COALESCE(SUM(tokens_in + tokens_out), 0) AS totalTokens,
         COALESCE(SUM(cost_estimate), 0) AS totalCost,
         COUNT(*) AS callCount
       FROM usage_log
       WHERE project_id = ?
       GROUP BY operation
       ORDER BY totalTokens DESC`
    )
    .all(projectId) as OperationUsageBucket[]
}
