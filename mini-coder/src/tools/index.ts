import { tool } from "ai";
import { z } from "zod";

export const tools = {
  read_file: tool({
    description:
      "Read a UTF-8 text file inside the workspace. Paths are relative to the repo root.",
    inputSchema: z.object({ path: z.string() }),
  }),
  write_file: tool({
    description:
      "Create or overwrite a file inside the workspace with the full new content.",
    inputSchema: z.object({ path: z.string(), content: z.string() }),
  }),
  grep: tool({
    description:
      "Search file contents with a regex (ripgrep). Use this to FIND where something is defined or used before reading files.",
    inputSchema: z.object({
      pattern: z.string(),
      path: z.string().default("."),
    }),
  }),
  bash: tool({
    description:
      "Run a shell command in the repo root, e.g. `npx vitest run`, `npx tsc --noEmit`. 60s timeout.",
    inputSchema: z.object({ command: z.string() }),
  }),
};
