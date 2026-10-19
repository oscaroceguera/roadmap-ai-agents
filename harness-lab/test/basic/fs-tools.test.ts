import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { defaultTools } from "../../src/tools/index.js";
import { tmpWorkspace } from "../helpers/tmp.js";

describe("workspace tools", () => {
  it("write -> list -> read round trip", async () => {
    const root = await tmpWorkspace();
    const tools = defaultTools();
    const ctx = { workspaceRoot: root };
    expect(
      await tools.execute(
        "write_file",
        { path: "src/a.txt", content: "hello" },
        ctx,
      ),
    ).toEqual({ ok: true, output: "Wrote 5 bytes to src/a.txt" });
    expect(await tools.execute("list_files", {}, ctx)).toEqual({
      ok: true,
      output: path.join("src", "a.txt"),
    });
    expect(
      await tools.execute("read_file", { path: "src/a.txt" }, ctx),
    ).toEqual({ ok: true, output: "hello" });
  });

  it("cannot escape the workspace", async () => {
    const root = await tmpWorkspace();
    const r = await defaultTools().execute(
      "write_file",
      { path: "../evil.txt", content: "x" },
      { workspaceRoot: root },
    );
    expect(r).toEqual({
      ok: false,
      error: "WorkspaceError: Path escapes workspace: ../evil.txt",
    });
  });

  it("run_tests reports pass and fail", async () => {
    const pass = await tmpWorkspace({
      "a.test.mjs": "import t from 'node:test'; t('ok', () => {});",
    });
    const fail = await tmpWorkspace({
      "a.test.mjs":
        "import t from 'node:test'; t('bad', () => { throw new Error('x'); });",
    });
    const tools = defaultTools();
    const p = await tools.execute("run_tests", {}, { workspaceRoot: pass });
    const f = await tools.execute("run_tests", {}, { workspaceRoot: fail });
    expect(p.ok && p.output.startsWith("exit_code=0")).toBe(true);
    expect(f.ok && f.output.startsWith("exit_code=1")).toBe(true);
    expect(await readFile(path.join(pass, "a.test.mjs"), "utf8")).toContain(
      "node:test",
    );
  });
});
