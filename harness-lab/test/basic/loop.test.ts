import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { call, FakeModel, final } from "../../src/core/fake-model.js";
import { memoryLogger } from "../../src/core/logger.js";
import { runAgent } from "../../src/core/loop.js";
import { defaultTools } from "../../src/tools/index.js";
import { tmpWorkspace } from "../helpers/tmp.js";

describe("runAgent", () => {
  it("runs tool calls until a final answer", async () => {
    const root = await tmpWorkspace();
    const model = new FakeModel([
      call("write_file", { path: "hello.txt", content: "hi" }),
      call("read_file", { path: "hello.txt" }),
      final("Created hello.txt"),
    ]);
    const logger = memoryLogger();
    const res = await runAgent({
      model,
      tools: defaultTools(),
      workspaceRoot: root,
      task: "make hello",
      logger,
    });

    expect(res).toMatchObject({
      stopReason: "final_answer",
      finalText: "Created hello.txt",
      steps: 3,
    });
    expect(res.usage).toEqual({ inputTokens: 30, outputTokens: 15 });
    expect(await readFile(path.join(root, "hello.txt"), "utf8")).toBe("hi");
    // the model saw the tool result of step 2 on its 3rd call
    expect(model.calls[2]?.messages.at(-1)).toMatchObject({
      role: "tool",
      content: "hi",
      isError: false,
    });
    expect(logger.entries.map((e) => e.event)).toEqual([
      "model.turn",
      "tool.result",
      "model.turn",
      "tool.result",
      "model.turn",
    ]);
  });

  it("stops at maxSteps", async () => {
    const root = await tmpWorkspace();
    const model = new FakeModel(
      Array.from({ length: 5 }, () => call("list_files", {})),
    );
    const res = await runAgent({
      model,
      tools: defaultTools(),
      workspaceRoot: root,
      task: "loop",
      maxSteps: 3,
      logger: memoryLogger(),
    });
    expect(res).toMatchObject({ stopReason: "max_steps", steps: 3 });
  });

  it("feeds tool errors back so the model can recover", async () => {
    const root = await tmpWorkspace();
    const model = new FakeModel([
      call("read_file", { path: "missing.txt" }),
      (msgs) =>
        final(`saw error: ${(msgs.at(-1) as { isError: boolean }).isError}`),
    ]);
    const res = await runAgent({
      model,
      tools: defaultTools(),
      workspaceRoot: root,
      task: "x",
      logger: memoryLogger(),
    });
    expect(res.finalText).toBe("saw error: true");
  });
});
