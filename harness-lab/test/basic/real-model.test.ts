import { describe, expect, it } from "vitest";
import { memoryLogger } from "../../src/core/logger.js";
import { runAgent } from "../../src/core/loop.js";
import { modelFromEnv } from "../../src/models/from-env.js";
import { defaultTools } from "../../src/tools/index.js";
import { tmpWorkspace } from "../helpers/tmp.js";

// Opt-in: runs only when OPENAI_API_KEY is set. Costs real money (a few cents at most).
describe.skipIf(!process.env.OPENAI_API_KEY)("real model smoke test", () => {
  it("creates a file using tools", async () => {
    const root = await tmpWorkspace();
    const res = await runAgent({
      model: modelFromEnv(),
      tools: defaultTools(),
      workspaceRoot: root,
      logger: memoryLogger(),
      maxSteps: 6,
      task: "Create hi.txt containing exactly: hi",
    });
    expect(res.stopReason).toBe("final_answer");
  }, 60_000);
});
