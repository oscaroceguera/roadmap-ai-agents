import type { Message, Model, ModelTurn, ToolSpec } from "./types.js";

/** A turn can be static or computed from what the model "sees". */
export type ScriptedTurn =
  | ModelTurn
  | ((messages: readonly Message[]) => ModelTurn);

/** Deterministic model for tests: replays a script and records every call. */
export class FakeModel implements Model {
  readonly id = "fake-model";
  readonly calls: { messages: Message[]; tools: ToolSpec[] }[] = [];
  private index = 0;

  constructor(private readonly script: readonly ScriptedTurn[]) {}

  async next(input: {
    messages: readonly Message[];
    tools: readonly ToolSpec[];
  }): Promise<ModelTurn> {
    this.calls.push({ messages: [...input.messages], tools: [...input.tools] });
    const turn = this.script[this.index++];
    if (!turn)
      throw new Error(
        `FakeModel script exhausted after ${this.index - 1} turns`,
      );
    return typeof turn === "function" ? turn(input.messages) : turn;
  }
}

const u = { inputTokens: 10, outputTokens: 5 };
export const call = (
  name: string,
  input: unknown,
  id = `call_${name}`,
): ModelTurn => ({
  type: "tool_calls",
  text: "",
  toolCalls: [{ id, name, input }],
  usage: u,
});
export const final = (text: string): ModelTurn => ({
  type: "final",
  text,
  usage: u,
});
