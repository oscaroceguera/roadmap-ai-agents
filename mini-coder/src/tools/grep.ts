import { execFile } from "node:child_process";
import nodePath from "node:path";
import { promisify } from "node:util";
import { clip, ROOT, resolveInWorkspace } from "../workspace";
import type { ToolOutput } from "./run";

const run = promisify(execFile);

export async function grep({
  pattern,
  path = ".",
}: {
  pattern: string;
  path?: string;
}): Promise<ToolOutput> {
  // Check the jail, then pass rg a RELATIVE path. rg prints `./src/money.ts:1:…` for target ".",
  // so strip the "./" below: matches must use the same form the model passes to read_file.
  const target = nodePath.relative(ROOT, resolveInWorkspace(path)) || ".";
  try {
    const { stdout } = await run(
      "rg",
      [
        "--line-number",
        "--no-heading",
        "--max-count",
        "50",
        "--",
        pattern,
        target,
      ],
      { cwd: ROOT, timeout: 10_000, maxBuffer: 1 << 20 },
    );
    return { ok: true, matches: clip(stdout.replace(/^\.\//gm, "")) };
  } catch (e: any) {
    if (e.code === 1) return { ok: true, matches: "(no matches)" }; // rg exit 1 = nothing found, not an error
    if (e.code === "ENOENT")
      return {
        ok: false,
        error: "ripgrep (rg) is not installed on this machine",
      };
    if (e.killed)
      return {
        ok: false,
        error: "grep timed out after 10s; narrow the pattern or path",
      };
    return { ok: false, error: String(e.stderr || e.message) }; // exit 2 = bad regex, etc.
  }
}
