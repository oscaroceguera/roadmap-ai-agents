import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildSystemPrompt,
  loadAgentsMd,
} from "../../src/context/agents-md.js";
import {
  compactMessages,
  estimateTokens,
  listToolsSummarizer,
} from "../../src/context/butget.js";
import { offloadIfLarge } from "../../src/context/offload.js";
import { call, FakeModel, final } from "../../src/core/fake-model.js";
import { memoryLogger } from "../../src/core/logger.js";
import { runAgent } from "../../src/core/loop.js";
import type { Message } from "../../src/core/types.js";
import { defaultTools } from "../../src/tools/index.js";
import { tmpWorkspace } from "../helpers/tmp.js";

const tool = (i: number): Message[] => [
  {
    role: "assistant",
    content: "",
    toolCalls: [{ id: `c${i}`, name: "read_file", input: {} }],
  },
  {
    role: "tool",
    toolCallId: `c${i}`,
    toolName: "read_file",
    content: `content ${i}`,
    isError: false,
  },
];

describe("context management", () => {
  it("estimates ~4 chars per token", () => {
    expect(estimateTokens([{ role: "user", content: "x".repeat(400) }])).toBe(
      101,
    ); // 400 + "[]"
  });

  it("compacts the middle and never orphans a tool result", async () => {
    const msgs: Message[] = [
      { role: "system", content: "S" },
      { role: "user", content: "T" },
      ...tool(1),
      ...tool(2),
      ...tool(3),
    ];
    const out = await compactMessages(msgs, listToolsSummarizer, 3);
    expect(out.map((m) => m.role)).toEqual([
      "system",
      "user",
      "user",
      "assistant",
      "tool",
    ]);
    expect(out[2]?.content).toContain("- read_file: content 1");
  });

  it("offloads large outputs to a file and returns a reference", async () => {
    const root = await tmpWorkspace();
    const dir = path.join(root, ".harness/outputs");
    const big = "L".repeat(5000);
    const ref = await offloadIfLarge(
      "call_1",
      big,
      { thresholdChars: 1000, dir, previewChars: 10 },
      root,
    );
    expect(ref).toBe(
      "LLLLLLLLLL\n…[truncated 4990 chars; full output saved to .harness/outputs/call_1.txt — use read_file to see it]",
    );
    expect(await readFile(path.join(dir, "call_1.txt"), "utf8")).toBe(big);
    expect(
      await offloadIfLarge("x", "small", { thresholdChars: 1000, dir }, root),
    ).toBe("small");
  });

  it("loads AGENTS.md as a map into the system prompt", async () => {
    const root = await tmpWorkspace({
      "AGENTS.md": "# Map\n- tests: node --test",
    });
    expect(buildSystemPrompt("BASE", await loadAgentsMd(root))).toBe(
      "BASE\n\n<agents_md>\n# Map\n- tests: node --test\n</agents_md>",
    );
    expect(await loadAgentsMd(await tmpWorkspace())).toBeUndefined();
  });

  it("the loop compacts when over budget", async () => {
    const root = await tmpWorkspace({ "big.txt": "B".repeat(4000) });
    const model = new FakeModel([
      call("read_file", { path: "big.txt" }, "a"),
      call("read_file", { path: "big.txt" }, "b"),
      final("ok"),
    ]);
    const logger = memoryLogger();
    await runAgent({
      model,
      tools: defaultTools(),
      workspaceRoot: root,
      task: "t",
      logger,
      context: { maxTokens: 1500, keepLast: 2 },
    });
    expect(logger.entries.some((e) => e.event === "context.compacted")).toBe(
      true,
    );
    expect(estimateTokens(model.calls[2]!.messages)).toBeLessThan(1500);
  });
});
