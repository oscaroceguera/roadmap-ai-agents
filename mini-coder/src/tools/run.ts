import { bash } from "./bash";
import { grep } from "./grep";
import { readFile } from "./readFile";
import { writeFile } from "./writeFile";

export type ToolOutput =
  | { ok: true; [k: string]: unknown }
  | { ok: false; error: string; [k: string]: unknown };

export async function runTool(name: string, input: any): Promise<ToolOutput> {
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
}
