import { bash } from "./bash";
import { grep } from "./grep";
import { readFile } from "./readFile";
import { writeFile } from "./writeFile";

export type ToolOutput =
  | { ok: true; [k: string]: unknown }
  | { ok: false; error: string; [k: string]: unknown };

export async function runTool(name: string, input: any): Promise<ToolOutput> {
  try {
    switch (name) {
      case "read_file":
        return await readFile(input);
      case "write_file":
        return await writeFile(input);
      case "grep":
        return await grep(input);
      case "bash":
        return await bash(input);
      default:
        return { ok: false, error: `unknown tool: ${name}` };
    }
  } catch (e) {
    // No exception ever leaves runTool: errors are data the model reads next turn.
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
