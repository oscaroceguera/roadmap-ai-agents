import {
  generateText,
  jsonSchema,
  tool,
  type LanguageModel,
  type ModelMessage,
  type ToolSet,
} from "ai";
import type { Message, Model, ModelTurn, ToolSpec } from "../core/types.js";

/** Pure: our Message[] -> AI SDK ModelMessage[]. */
export function toModelMessages(messages: readonly Message[]): ModelMessage[] {
  return messages.map((m): ModelMessage => {
    switch (m.role) {
      case "system":
      case "user":
        return { role: m.role, content: m.content };
      case "assistant":
        return {
          role: "assistant",
          content: [
            ...(m.content ? [{ type: "text" as const, text: m.content }] : []),
            ...(m.toolCalls ?? []).map((tc) => ({
              type: "tool-call" as const,
              toolCallId: tc.id,
              toolName: tc.name,
              input: tc.input,
            })),
          ],
        };
      case "tool":
        return {
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: m.toolCallId,
              toolName: m.toolName,
              output: m.isError
                ? { type: "error-text", value: m.content }
                : { type: "text", value: m.content },
            },
          ],
        };
    }
  });
}

/** Pure: our ToolSpec[] -> AI SDK tools WITHOUT execute, so the SDK returns calls to OUR loop. */
export function toToolSet(specs: readonly ToolSpec[]): ToolSet {
  return Object.fromEntries(
    specs.map((s) => [
      s.name,
      tool({
        description: s.description,
        inputSchema: jsonSchema(s.jsonSchema),
      }),
    ]),
  );
}

/** Adapter: any AI SDK LanguageModel becomes a harness Model. One model call per step. */
export function aiSdkModel(languageModel: LanguageModel, id = "ai-sdk"): Model {
  return {
    id,
    async next({ messages, tools }): Promise<ModelTurn> {
      const res = await generateText({
        model: languageModel,
        messages: toModelMessages(messages),
        tools: toToolSet(tools),
        allowSystemInMessages: true,
      });
      const usage = {
        inputTokens: res.usage.inputTokens ?? 0,
        outputTokens: res.usage.outputTokens ?? 0,
      };
      if (res.toolCalls.length > 0) {
        return {
          type: "tool_calls",
          text: res.text,
          usage,
          toolCalls: res.toolCalls.map((tc) => ({
            id: tc.toolCallId,
            name: tc.toolName,
            input: tc.input,
          })),
        };
      }
      return { type: "final", text: res.text, usage };
    },
  };
}
