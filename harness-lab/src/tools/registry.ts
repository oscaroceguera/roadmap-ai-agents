import { z } from "zod";
import type { ToolSpec } from "../core/types.js";

export interface ToolContext {
  workspaceRoot: string;
}

export interface Tool<S extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  inputSchema: S;
  execute(input: z.infer<S>, ctx: ToolContext): Promise<string>;
}

/** Helper that keeps the input type tied to the schema. */
export function defineTool<S extends z.ZodType>(tool: Tool<S>): Tool<S> {
  return tool;
}

export type ToolResult =
  | { ok: true; output: string }
  | { ok: false; error: string };

export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();

  constructor(tools: readonly Tool[] = []) {
    for (const t of tools) this.register(t);
  }

  register(tool: Tool): void {
    if (this.tools.has(tool.name))
      throw new Error(`Duplicate tool: ${tool.name}`);

    this.tools.set(tool.name, tool);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  specs(): ToolSpec[] {
    return [...this.tools.values()].map((t) => ({
      name: t.name,
      description: t.description,
      jsonSchema: z.toJSONSchema(t.inputSchema) as Record<string, unknown>,
    }));
  }

  /** Never throws: errors become data the model can read and recover from. */
  async execute(
    name: string,
    rawInput: unknown,
    ctx: ToolContext,
  ): Promise<ToolResult> {
    const tool = this.tools.get(name);

    if (!tool) return { ok: false, error: `Unknown tool: ${name}` };

    const parsed = tool.inputSchema.safeParse(rawInput);

    if (!parsed.success) {
      return {
        ok: false,
        error: `Invalid input for ${name}: ${z.prettifyError(parsed.error)}`,
      };
    }

    try {
      return { ok: true, output: await tool.execute(parsed.data, ctx) };
    } catch (err) {
      return {
        ok: false,
        error:
          err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      };
    }
  }
}
