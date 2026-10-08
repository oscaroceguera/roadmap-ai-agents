// evals/longContext.test.ts — 🪙 L3.5: a long run must compact, stay under the window, and still remember file-01.
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import type { Compaction } from "../src/context/modelLimits";
import { EVENTS_FILE } from "../src/events";
import { runAgent } from "../src/loop";
import { LAST_TITLE, PLANTED_FACT, writeBigFiles } from "./bigFiles";

const WINDOW = 12_000; // small on purpose: 10 files × ~1,750 tokens can't all fit
const TASK = `Read big/file-01.md through big/file-10.md, in order. Then answer in one line:
what is the project codename mentioned in file-01, and what is the title of file-10?`;

writeBigFiles(process.env.WORKSPACE!); // the test workspace from test/setup.ts

for (const compaction of ["truncate", "summarize"] as Compaction[]) {
  it(`long-context (${compaction})`, async () => {
    const runId = `long-${compaction}-${Date.now()}`;
    const res = await runAgent(TASK, { runId, window: WINDOW, compaction });
    const events = readFileSync(EVENTS_FILE, "utf-8")
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l))
      .filter((e) => e.runId === runId);
    const compactions = events.filter((e) => e.type === "memory.compacted");
    const remembered = res.output?.includes(PLANTED_FACT) ?? false;
    console.log(
      `${compaction}\tcompactions=${compactions.length}\tremembered fact=${remembered}\ttitle=${res.output?.includes(LAST_TITLE)}\t→ ${res.output}`,
    );

    expect(compactions.length).toBeGreaterThan(0); // compaction fired mid-run
    for (const c of compactions) expect(c.contextTokens).toBeLessThan(WINDOW);
    // The real check: what the PROVIDER counted for every turn, not our estimate.
    const biggest = Math.max(
      ...events
        .filter((e) => e.type === "turn.completed")
        .map((e) => e.inputTokens),
    );
    console.log(
      `${compaction}\tbiggest prompt=${biggest} tokens (window ${WINDOW})`,
    );
    expect(biggest).toBeLessThan(WINDOW);
    // The number to record is `remembered` per strategy. Only summarization is REQUIRED to keep the fact.
    if (compaction === "summarize") expect(remembered).toBe(true);
  }, 300_000);
}
