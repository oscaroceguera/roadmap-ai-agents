import { describe, expect, it } from "vitest";
import { tools } from "../src/tools";
import { runTool } from "../src/tools/run";

describe("runTool (the single boundary)", () => {
  it("never throws: a jail escape becomes data", async () => {
    const out = await runTool("read_file", { path: "../../etc/passwd" });
    expect(out).toMatchObject({
      ok: false,
      error: expect.stringMatching(/Refused/),
    });
  });
  it("rejects unknown tools", async () => {
    expect(await runTool("rm_rf", {})).toEqual({
      ok: false,
      error: "unknown tool: rm_rf",
    });
  });
  it("schemas have no execute, so the SDK can never run a tool by itself", () => {
    for (const t of Object.values(tools))
      expect("execute" in t && t.execute).toBeFalsy();
  });
});
