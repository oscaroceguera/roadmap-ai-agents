import { describe, expect, it } from "vitest";
import { bash } from "../src/tools/bash";
import { grep } from "../src/tools/grep";
import { ROOT } from "../src/workspace";

describe("grep", () => {
  it("returns workspace-relative matches", async () => {
    const out = await grep({ pattern: "export function formatCents" });
    expect(out.matches).toMatch(/^src\/money\.ts:1:/m);
  });
  it("treats no matches as success", async () => {
    expect(await grep({ pattern: "zzz_not_here" })).toEqual({
      ok: true,
      matches: "(no matches)",
    });
  });
  it("reports a bad regex as an error", async () => {
    expect((await grep({ pattern: "(" })).ok).toBe(false);
  });
});

describe("bash", () => {
  it("runs in the workspace root", async () => {
    const out = await bash({ command: "pwd" });
    expect(String(out.stdout).trim()).toBe(ROOT);
  });
  it("a non-zero exit is information, not a harness error", async () => {
    expect(await bash({ command: "echo boom >&2; exit 3" })).toMatchObject({
      ok: true,
      exitCode: 3,
      stderr: "boom\n",
    });
  });
  it("does not leak secrets from the parent env", async () => {
    process.env.OPENAI_API_KEY = "sk-should-not-leak";
    const out = await bash({ command: 'echo "key=$OPENAI_API_KEY"' });
    expect(out.stdout).toBe("key=\n");
  });
});
