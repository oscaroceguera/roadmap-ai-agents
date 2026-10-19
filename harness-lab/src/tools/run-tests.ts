import { execFile } from "node:child_process";
import { z } from "zod";
import { defineTool } from "./registry.js";

/**
 * Runs the workspace's tests with Node's built-in runner. No shell, fixed command,
 * cwd = workspace, hard timeout. (Tutorial 2 replaces this with a proper sandbox.)
 */
export const runTestsTool = defineTool({
  name: "run_tests",
  description:
    "Run the test suite of the workspace (node --test). Returns exit code and output.",
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    return new Promise<string>((resolve) => {
      execFile(
        process.execPath,
        ["--test"],
        { cwd: ctx.workspaceRoot, timeout: 30_000, maxBuffer: 1_000_000 },
        (error, stdout, stderr) => {
          const code = error
            ? typeof error.code === "number"
              ? error.code
              : 1
            : 0;
          resolve(`exit_code=${code}\n${stdout}${stderr}`.trim());
        },
      );
    });
  },
});
