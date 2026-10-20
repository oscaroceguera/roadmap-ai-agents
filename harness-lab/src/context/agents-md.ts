import { readFile } from "node:fs/promises";
import path from "node:path";

/** AGENTS.md is a short MAP of the repo (where things are, how to test), not an encyclopedia. */
export async function loadAgentsMd(
  workspaceRoot: string,
  maxChars = 4_000,
): Promise<string | undefined> {
  try {
    const text = await readFile(path.join(workspaceRoot, "AGENTS.md"), "utf8");
    return text.length > maxChars
      ? `${text.slice(0, maxChars)}\n…[AGENTS.md truncated]`
      : text;
  } catch {
    return undefined;
  }
}

export function buildSystemPrompt(
  base: string,
  agentsMd: string | undefined,
): string {
  return agentsMd ? `${base}\n\n<agents_md>\n${agentsMd}\n</agents_md>` : base;
}
