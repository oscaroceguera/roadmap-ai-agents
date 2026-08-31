import { appendFileSync, mkdirSync } from "node:fs";
import type { AgentRun } from "../src/agent";

// $ per 1M tokens. OpenAI standard (non-batch, non-flex) rates.
// Verified 2026-08-31 against https://developers.openai.com/api/docs/pricing
// `cachedIn` is an EXPLICIT price, not a multiplier — the cached/base ratio is
// 0.1x across gpt-5.x but 0.5x on gpt-4o and 0.25x on o3. A single constant
// would be wrong for half this table.
const PRICES: Record<string, { in: number; cachedIn: number; out: number }> = {
  "gpt-5.6-sol": { in: 4, cachedIn: 0.4, out: 20 },
  "gpt-5.6-terra": { in: 2, cachedIn: 0.2, out: 12 },
  "gpt-5.6-luna": { in: 0.2, cachedIn: 0.02, out: 1.2 },
  "gpt-5.5": { in: 5, cachedIn: 0.5, out: 30 },
  "gpt-5.4": { in: 2.5, cachedIn: 0.25, out: 15 },
  "gpt-5.4-mini": { in: 0.75, cachedIn: 0.075, out: 4.5 },
  "gpt-5": { in: 1.25, cachedIn: 0.125, out: 10 },
  "gpt-5-mini": { in: 0.25, cachedIn: 0.025, out: 2 },
};

export function costUsd(model: string, u: AgentRun["usage"]): number {
  const p = PRICES[model];
  if (!p) throw new Error(`No price for model "${model}" — add it to PRICES.`);
  const uncached = u.uncachedInputTokens * p.in;
  const cacheRead = u.cacheReadTokens * p.cachedIn;
  // OpenAI publishes no separate cache-WRITE price — writes bill as normal input.
  const cacheWrite = u.cacheWriteTokens * p.in;
  const output = u.outputTokens * p.out;
  return (uncached + cacheRead + cacheWrite + output) / 1_000_000;
}

export type TraceRow = {
  ts: string;
  case: string;
  run: number;
  model: string;
  ms: number;
  uncachedInputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
  usd: number;
  pass: boolean;
  toolCalls: string[];
};

export function trace(row: TraceRow): void {
  mkdirSync("evals/traces", { recursive: true });
  const day = row.ts.slice(0, 10);
  appendFileSync(`evals/traces/${day}.jsonl`, `${JSON.stringify(row)}\n`);
}
