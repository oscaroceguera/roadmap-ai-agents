import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ModelMessage } from "ai";
import { describe, expect, it } from "vitest";
import {
  buildContext,
  clipToolResults,
  splitTurns,
} from "../src/context/hydrate";
import { estimateTokens } from "../src/context/tokens";
import { EVENTS_FILE } from "../src/events";
import { runAgent } from "../src/loop";
import { scriptedModel } from "../src/mockModel";

const turn = (text: string): ModelMessage[] => [
  { role: "assistant", content: text },
];

describe("buildContext", () => {
  it("pins the task first and ends with the most recent turn", () => {
    const recent = turn("recent work");
    const ctx = buildContext("TASK", "old work", [turn("older"), recent]);
    expect(ctx[0]).toEqual({ role: "user", content: "TASK" });
    expect(ctx[1].content).toContain("old work");
    expect(ctx.at(-1)).toEqual(recent[0]);
  });
  it("adds no summary message when there's no summary yet", () => {
    expect(buildContext("TASK", "", [turn("a")])).toHaveLength(2);
  });
});

describe("splitTurns", () => {
  const t = (n: number) => turn("x".repeat(n * 4)); // n tokens each
  it("keeps the newest turns that fit in keepRecent, and marks the rest as old", () => {
    const { old, recent } = splitTurns([t(100), t(100), t(100), t(100)], 250);
    expect(old).toHaveLength(2);
    expect(recent).toHaveLength(2);
  });
  it("always keeps the last turn, even if it alone is bigger than keepRecent", () => {
    const { old, recent } = splitTurns([t(100), t(500)], 250);
    expect(old).toHaveLength(1);
    expect(recent).toHaveLength(1);
  });
});

describe("compaction inside the loop", () => {
  it("fires mid-run, and every prompt the model sees stays under the window", async () => {
    // 6 files of ~2,400 chars (~600 tokens each) in the test workspace; the window is only 2,000 tokens.
    for (let i = 1; i <= 6; i++) {
      writeFileSync(
        path.join(process.env.WORKSPACE!, `big-${i}.md`),
        `# File ${i}\n${"lorem ipsum ".repeat(200)}`,
      );
    }
    const model = scriptedModel((n) =>
      n < 6
        ? { call: { name: "read_file", input: { path: `big-${n + 1}.md` } } }
        : { text: "read them all" },
    );
    const summaryModel = scriptedModel(() => ({
      text: "Read big-1.md … so far; each is lorem ipsum.",
    }));

    const res = await runAgent("Read big-1.md to big-6.md", {
      model,
      summaryModel,
      runId: "ctx-test",
      window: 2_000,
    });
    expect(res.stop).toBe("completed");

    const events = readFileSync(EVENTS_FILE, "utf-8")
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l))
      .filter((e) => e.runId === "ctx-test");
    expect(
      events.filter((e) => e.type === "memory.compacted").length,
    ).toBeGreaterThan(0);

    // The mock records every prompt it received: none may be over the window.
    for (const call of model.doGenerateCalls) {
      expect(
        estimateTokens(call.prompt as unknown as ModelMessage[]),
      ).toBeLessThan(2_000);
      expect(call.prompt.find((m) => m.role === "user")?.content).toEqual([
        { type: "text", text: "Read big-1.md to big-6.md" },
      ]);
    }
  });
});

describe("clipToolResults", () => {
  const result = (id: string, chars: number) => ({
    type: "tool-result" as const,
    toolCallId: id,
    toolName: "read_file",
    output: {
      type: "json" as const,
      value: { ok: true, content: "x".repeat(chars) },
    },
  });
  it("clips the OLDEST results of one huge turn until it fits, and keeps the calls", () => {
    const hugeTurn: ModelMessage[] = [
      {
        role: "tool",
        content: [result("a", 4_000), result("b", 4_000), result("c", 4_000)],
      },
    ];
    const { turns, clipped } = clipToolResults([hugeTurn], 1_500);
    expect(clipped).toBe(2);
    const parts = (
      turns[0][0] as {
        content: {
          toolCallId: string;
          output: { value: { clipped?: boolean } };
        }[];
      }
    ).content;
    expect(parts.map((p) => p.toolCallId)).toEqual(["a", "b", "c"]); // every call still has its result
    expect(parts.map((p) => p.output.value.clipped ?? false)).toEqual([
      true,
      true,
      false,
    ]); // newest kept
    expect(estimateTokens(turns.flat())).toBeLessThanOrEqual(1_500);
  });
});
