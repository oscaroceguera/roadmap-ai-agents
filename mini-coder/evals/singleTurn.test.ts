import { generateText } from "ai";
import { expect, it } from "vitest";
import { model } from "../src/model";
import { SYSTEM_PROMPT } from "../src/prompt";
import { tools } from "../src/tools";
import basesilne from "./baseline.json";
import { singleTurn } from "./cases";

const RUNS = Number(process.env.EVAL_RUNS ?? 1);
const floors: Record<string, number> = basesilne;

for (const c of singleTurn) {
  it(`single-turn: ${c.name}`, async () => {
    let passed = 0;
    for (let i = 0; i < RUNS; i++) {
      const res = await generateText({
        model,
        tools,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: c.prompt }],
      });
      if (c.expect(res.toolCalls)) passed++;
    }
    const rate = passed / RUNS;
    console.log(
      `${c.name}\t${rate.toFixed(2)}\t(baseline${floors[c.name] ?? "-"})`,
    );
    expect(rate).toBeGreaterThanOrEqual(floors[c.name] ?? 0);
  }, 120_000);
}
