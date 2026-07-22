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

export function getProjectUsageTotal(projectId: string): number {
  const row = getDb()
    .prepare('SELECT COALESCE(SUM(tokens_in + tokens_out), 0) as total FROM usage_log WHERE project_id = ?')
    .get(projectId) as { total: number }
  return row.total
}
