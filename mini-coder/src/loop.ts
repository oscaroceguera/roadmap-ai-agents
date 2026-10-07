import {
  generateText,
  type JSONValue,
  type LanguageModel,
  type ModelMessage,
} from "ai";
import { emit } from "./events";
import { model as defaultModel, PRICE_PER_1M } from "./model";
import { SYSTEM_PROMPT } from "./prompt";
import { tools } from "./tools";
import { runTool, type ToolOutput } from "./tools/run";

export type StopReason =
  | "completed"
  | "finish_reason"
  | "max_iterations"
  | "max_tokens"
  | "error_threshold";

export const LIMITS = {
  maxIterations: 25,
  maxTokens: 300_000,
  maxConsecutiveErrors: 3,
};

// `model` is a parameter so tests can pass a scripted mock (free, no network).
export async function runAgent(
  task: string,
  {
    model = defaultModel,
    runId = crypto.randomUUID(),
  }: { model?: LanguageModel; runId?: string } = {},
) {
  // The system prompt goes in `system:`, not in messages (AI SDK 6 warns: injection risk).
  const messages: ModelMessage[] = [{ role: "user", content: task }];
  let tokens = 0;
  let consecutiveErrors = 0;
  await emit({ type: "workflow.started", runId, task });

  for (let turn = 0; turn < LIMITS.maxIterations; turn++) {
    const t0 = performance.now();

    // tools have NO execute → the SDK returns the calls and runs nothing
    const res = await generateText({
      model,
      system: SYSTEM_PROMPT,
      messages,
      tools,
    });

    tokens += (res.usage.inputTokens ?? 0) + (res.usage.outputTokens ?? 0);
    messages.push(...res.response.messages);
    await emit({
      type: "turn.completed",
      runId,
      turn,
      inputTokens: res.usage.inputTokens ?? 0,
      outputTokens: res.usage.outputTokens ?? 0,
      costUsd:
        ((res.totalUsage.inputTokens ?? 0) * PRICE_PER_1M.input +
          (res.usage.outputTokens ?? 0) * PRICE_PER_1M.output) /
        1_000_1000,
      ms: performance.now() - t0,
      finishReason: res.finishReason,
    });

    if (res.toolCalls.length === 0) {
      const reason =
        res.finishReason === "stop" ? "completed" : "finish_reason";
      return finish(runId, reason, res.text);
    }

    const results = [];
    for (const call of res.toolCalls) {
      const t1 = performance.now();
      const out = await runTool(call.toolName, call.input);

      consecutiveErrors = out.ok ? 0 : consecutiveErrors + 1;

      await emit({
        type: "tool.completed",
        runId,
        toolCallId: call.toolCallId,
        tool: call.toolName,
        ok: out.ok,
        ms: performance.now() - t1,
      });

      results.push(toolResultPart(call, out));
    }
    messages.push({ role: "tool", content: results }); // ONE message for all results of this turn

    if (consecutiveErrors >= LIMITS.maxConsecutiveErrors)
      return finish(runId, "error_threshold");
    if (tokens >= LIMITS.maxTokens) return finish(runId, "max_tokens");
  }
  return finish(runId, "max_iterations");
}

function toolResultPart(
  call: { toolCallId: string; toolName: string },
  out: ToolOutput,
) {
  return {
    type: "tool-result" as const,
    toolCallId: call.toolCallId,
    toolName: call.toolName,
    output: { type: "json" as const, value: out as JSONValue },
  };
}

// Every exit goes through here, so every stop is a named, logged event. No bare `break`.
async function finish(runId: string, stop: StopReason, output?: string) {
  await emit({ type: "workflow.completed", runId, stop, output });

  return { stop, output };
}
