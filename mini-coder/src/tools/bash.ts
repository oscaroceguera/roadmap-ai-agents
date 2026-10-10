import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { clip, ROOT } from "../workspace";
import type { ToolOutput } from "./run";

// HOME outside the workspace: npx/npm write caches (.npm/, Library/) into $HOME,
// and with HOME=ROOT they'd show up in the agent's `ls` and in every eval's git diff.
const SANDBOX_HOME = path.join(os.tmpdir(), "mini-coder-home");

export function bash({ command }: { command: string }): Promise<ToolOutput> {
  return new Promise((resolve) => {
    execFile(
      "bash",
      ["-c", command],
      {
        cwd: ROOT,
        timeout: 60_000,
        maxBuffer: 4 << 20,
        // Scrubbed env: the shell must NOT see OPENAI_API_KEY or DATABASE_URL.
        // That removes the "private data" leg of the lethal trifecta.
        // NO_COLOR: without it vitest's output is full of ANSI escapes the model pays tokens for.
        env: { PATH: process.env.PATH, HOME: SANDBOX_HOME, CI: "1", NO_COLOR: "1" },
      },
      (err: any, stdout, stderr) => {
        if (err?.killed)
          return resolve({ ok: false, error: "timed out after 60s" });
        if (typeof err?.code === "string")
          return resolve({ ok: false, error: err.message }); // spawn failure (ENOENT…)
        // numeric err.code = the command's exit code → information for the model, not a harness error
        resolve({
          ok: true,
          exitCode: err?.code ?? 0,
          stdout: clip(stdout),
          stderr: clip(stderr, 4_000),
        });
      },
    );
  });
}
