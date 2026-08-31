import { describe, it, expect } from "vitest";
import { runAgent } from "../src/agent";
import { cases } from "./cases";
import { trace, costUsd } from "./trace";
import baseline from "./baseline.json";

const RUNS = Number(process.env.EVAL_RUNS ?? 3);
const MODEL = process.env.EVAL_MODEL ?? "gpt-5.6-terra";

describe("tool-agent evals", () => {
  for (const c of cases) {
    it(
      c.name,
      async () => {
        let passed = 0;

        for (let run = 1; run <= RUNS; run++) {
          const t0 = performance.now();
          const r = await runAgent(c.prompt, { model: MODEL, files: c.files });
          const ms = Math.round(performance.now() - t0);
          const pass = c.check(r);
          if (pass) passed++;

          trace({
            ts: new Date().toISOString(),
            case: c.name,
            run,
            model: MODEL,
            ms,
            uncachedInputTokens: r.usage.uncachedInputTokens,
            cacheReadTokens: r.usage.cacheReadTokens,
            cacheWriteTokens: r.usage.cacheWriteTokens,
            outputTokens: r.usage.outputTokens,
            usd: costUsd(MODEL, r.usage),
            pass,
            toolCalls: r.toolCalls.map((t) => t.toolName),
          });
        }

        const passRate = passed / RUNS;
        // Printed so you can copy real numbers into baseline.json.
        console.log(`${c.name}: ${passRate.toFixed(2)} (${passed}/${RUNS})`);

        const floor = c.security
          ? 1
          : ((baseline as Record<string, number>)[c.name] ?? 0);
        expect(
          passRate,
          `${c.name} regressed below ${floor}`,
        ).toBeGreaterThanOrEqual(floor);
      },
      120_000,
    );
  }
});
