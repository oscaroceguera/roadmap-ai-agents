import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { memoryLogger } from "../../src/core/logger.js";
import { runAgent } from "../../src/core/loop.js";
import { aiSdkModel, toModelMessages } from "../../src/models/ai-sdk-model.js";
import { defaultTools } from "../../src/tools/index.js";
import { tmpWorkspace } from "../helpers/tmp.js";

const usage = {
  inputTokens: {
    total: 12,
    noCache: 12,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 7, text: 7, reasoning: undefined },
};

describe("aiSdkModel adapter (MockLanguageModelV4, no API key)", () => {
  it("maps tool calls and final text through the real AI SDK generateText", async () => {
    const mock = new MockLanguageModelV4({
      doGenerate: [
        {
          content: [
            {
              type: "tool-call",
              toolCallId: "c1",
              toolName: "write_file",
              input: JSON.stringify({ path: "a.txt", content: "A" }),
            },
          ],
          finishReason: { unified: "tool-calls", raw: undefined },
          usage,
          warnings: [],
        },
        {
          content: [{ type: "text", text: "done" }],
          finishReason: { unified: "stop", raw: undefined },
          usage,
          warnings: [],
        },
      ],
    });
    const root = await tmpWorkspace();
    const res = await runAgent({
      model: aiSdkModel(mock, "mock"),
      tools: defaultTools(),
      workspaceRoot: root,
      task: "write a.txt",
      logger: memoryLogger(),
    });
    expect(res).toMatchObject({
      stopReason: "final_answer",
      finalText: "done",
      steps: 2,
      usage: { inputTokens: 24, outputTokens: 14 },
    });
    // The tools were advertised to the provider, and the 2nd call contained our tool result.
    expect(mock.doGenerateCalls[0]?.tools?.map((t) => t.name)).toEqual([
      "read_file",
      "write_file",
      "list_files",
      "run_tests",
    ]);
    expect(JSON.stringify(mock.doGenerateCalls[1]?.prompt)).toContain(
      "Wrote 1 bytes to a.txt",
    );
  });

  it("converts messages purely", () => {
    expect(
      toModelMessages([
        {
          role: "tool",
          toolCallId: "1",
          toolName: "x",
          content: "bad",
          isError: true,
        },
      ]),
    ).toEqual([
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "1",
            toolName: "x",
            output: { type: "error-text", value: "bad" },
          },
        ],
      },
    ]);
  });
});
