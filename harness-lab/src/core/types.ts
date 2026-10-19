import { input, z } from "zod";

/** One tool call requested by the model. `input` is unvalidated on purpose. */
export const ToolCallSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  input: z.unknown(),
});

export type ToolCall = z.infer<typeof ToolCallSchema>;

export type Message =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; toolCalls?: ToolCall[] }
  | {
      role: "tool";
      toolCallId: string;
      toolName: string;
      content: string;
      isError: boolean;
    };

export interface Usage {
  inputTokens: number;
  outputTokens: number;
}

/** What the model decided this turn: call tools, or answer. */
export type ModelTurn =
  | { type: "tool_calls"; text: string; toolCalls: ToolCall[]; usage: Usage }
  | { type: "final"; text: string; usage: Usage };

/** Tool description the model sees (JSON Schema produced from Zod). */
export interface ToolSpec {
  name: string;
  description: string;
  jsonSchema: Record<string, unknown>;
}

/** The ONLY thing the harness knows about a model. Inject it; fake it in tests. */
export interface Model {
  readonly id: string;
  next(input: {
    messages: readonly Message[];
    tools: readonly ToolSpec[];
  }): Promise<ModelTurn>;
}
