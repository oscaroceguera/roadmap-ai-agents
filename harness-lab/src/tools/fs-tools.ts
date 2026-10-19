import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { resolveInWorkspace } from "../core/workspace.js";
import { defineTool } from "./registry.js";

export const readFileTool = defineTool({
  name: "read_file",
  description: "Read a UTF-8 text file inside the workspace.",
  inputSchema: z.object({ path: z.string().min(1) }),
  async execute({ path: p }, ctx) {
    return readFile(resolveInWorkspace(ctx.workspaceRoot, p), "utf8");
  },
});

export const writeFileTool = defineTool({
  name: "write_file",
  description: "Create or overwrite a UTF-8 text file inside the workspace.",
  inputSchema: z.object({ path: z.string().min(1), content: z.string() }),
  async execute({ path: p, content }, ctx) {
    const target = resolveInWorkspace(ctx.workspaceRoot, p);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
    return `Wrote ${Buffer.byteLength(content)} bytes to ${p}`;
  },
});

export const listFilesTool = defineTool({
  name: "list_files",
  description:
    "List files (recursively) under a workspace directory. Skips node_modules and .git.",
  inputSchema: z.object({ dir: z.string().default(".") }),
  async execute({ dir }, ctx) {
    const base = resolveInWorkspace(ctx.workspaceRoot, dir);
    const entries = await readdir(base, {
      recursive: true,
      withFileTypes: true,
    });
    return entries
      .filter((e) => e.isFile())
      .map((e) =>
        path.relative(ctx.workspaceRoot, path.join(e.parentPath, e.name)),
      )
      .filter(
        (p) =>
          !p.split(path.sep).some((s) => s === "node_modules" || s === ".git"),
      )
      .sort()
      .join("\n");
  },
});
