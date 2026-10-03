import fs from "node:fs/promises";
import { clip, resolveInWorkspace } from "../workspace";
import type { ToolOutput } from "./run";

export async function readFile({
  path,
}: {
  path: string;
}): Promise<ToolOutput> {
  const abs = resolveInWorkspace(path); // throws "Refused: …" → runTool turns it into { ok: false }
  try {
    const content = await fs.readFile(abs, "utf-8");
    return { ok: true, path, content: clip(content) };
    // L3.7 wraps `content` in <file path="…" trust="untrusted"> before it reaches the model
  } catch (e: any) {
    if (e.code === "ENOENT") {
      // An error the agent can act on next turn (L3.2 done-when): tell it what to do instead.
      return {
        ok: false,
        error: `File not found: ${path}. Use grep to find the right path.`,
      };
    }
    if (e.code === "EISDIR")
      return {
        ok: false,
        error: `${path} is a directory. Use grep or bash \`ls ${path}\`.`,
      };
    return { ok: false, error: `Could not read ${path}: ${e.message}` };
  }
}
