import { describe, expect, it } from "vitest";
import { call, FakeModel, final } from "../../src/core/fake-model.js";
import { memoryLogger } from "../../src/core/logger.js";
import { runAgent } from "../../src/core/loop.js";
import { HookBus, type HookType } from "../../src/hooks/bus.js";
import { defaultTools } from "../../src/tools/index.js";
import { tmpWorkspace } from "../helpers/tmp.js";

describe("HookBus", () => {
  it("rejects malformed events", async () => {
    await expect(
      new HookBus().emit({ type: "Stop" } as never),
    ).rejects.toThrow();
  });

  it("emits PreToolUse/PostToolUse/Stop and lets PreToolUse block", async () => {
    const bus = new HookBus();
    const seen: HookType[] = [];
    for (const t of ["PreToolUse", "PostToolUse", "Stop"] as const)
      bus.on(t, (e) => {
        seen.push(e.type);
      });
    bus.on("PreToolUse", (e) =>
      e.toolName === "write_file"
        ? { decision: "block", reason: "read-only session" }
        : undefined,
    );
    const root = await tmpWorkspace({ "a.txt": "A" });
    const model = new FakeModel([
      call("read_file", { path: "a.txt" }, "1"),
      call("write_file", { path: "a.txt", content: "X" }, "2"),
      (m) => final(String(m.at(-1)?.content)),
    ]);
    const res = await runAgent({
      model,
      tools: defaultTools(),
      workspaceRoot: root,
      task: "t",
      logger: memoryLogger(),
      hooks: bus,
    });
    expect(res.finalText).toBe("Blocked by hook: read-only session");
    expect(seen).toEqual([
      "PreToolUse",
      "PostToolUse",
      "PreToolUse",
      "PostToolUse",
      "Stop",
    ]);
  });
});
