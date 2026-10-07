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

// A step wraps one side effect: a model call, a tool call, or an event.
// Plain run → just call it. Durable run (src/workflow.ts) → DBOS.runStep, which saves the result
// in Postgres and, after a crash, returns the SAVED result instead of running it again.
export type Step = <T>(name: string, fn: () => Promise<T>) => Promise<T>;
const justRun: Step = (_name, fn) => fn();

type ToolCall = { toolCallId: string; toolName: string; input: unknown };

// What one model step returns. PLAIN DATA ONLY: DBOS stores it as JSON and hands it back on replay,
// so it can't be the raw GenerateTextResult (that has methods and getters, which don't survive JSON).
type Turn = {
  text: string;
  finishReason: string;
  tokens: number;
  toolCalls: ToolCall[];
  responseMessages: ModelMessage[];
};

// `model` and `step` are parameters: tests pass a scripted model and a recording step, for free.
export async function runAgent(
  task: string,
  {
    model = defaultModel,
    runId = crypto.randomUUID(),
    step = justRun,
  }: { model?: LanguageModel; runId?: string; step?: Step } = {},
) {
  // Everything OUTSIDE a step must be deterministic: on recovery it runs again and must take the
  // same path. So no Date.now(), random numbers or file reads here; those live inside steps.
  const messages: ModelMessage[] = [{ role: "user", content: task }];
  let tokens = 0;
  let consecutiveErrors = 0;

  await step("started", () => emit({ type: "workflow.started", runId, task }));

  for (let turn = 0; turn < LIMITS.maxIterations; turn++) {
    const res = await step(`model-${turn}`, () =>
      modelTurn(model, messages, runId, turn),
    );

    tokens += res.tokens;
    messages.push(...res.responseMessages);

    if (res.toolCalls.length === 0) {
      const reason =
        res.finishReason === "stop" ? "completed" : "finish_reason";
      return finish(step, runId, reason, res.text);
    }

    const results = [];
    for (const call of res.toolCalls) {
      const out = await step(`tool-${call.toolCallId}`, () =>
        toolStep(runId, call),
      );

      consecutiveErrors = out.ok ? 0 : consecutiveErrors + 1;

      results.push(toolResultPart(call, out));
    }

    messages.push({ role: "tool", content: results }); // ONE message for all results of this turn

    if (consecutiveErrors >= LIMITS.maxConsecutiveErrors)
      return finish(step, runId, "error_threshold");
    if (tokens >= LIMITS.maxTokens) return finish(step, runId, "max_tokens");
  }
  return finish(step, runId, "max_iterations");
}

// ONE model call + its event. Timing lives in here, not in the loop (determinism, above).
async function modelTurn(
  model: LanguageModel,
  messages: ModelMessage[],
  runId: string,
  turn: number,
): Promise<Turn> {
  const t0 = performance.now();

  // tools have NO execute → the SDK returns the calls and runs nothing
  const res = await generateText({
    model,
    system: SYSTEM_PROMPT,
    messages,
    tools,
  });

  const inputTokens = res.usage.inputTokens ?? 0;
  const outputTokens = res.usage.outputTokens ?? 0;

  await emit({
    type: "turn.completed",
    runId,
    turn,
    inputTokens,
    outputTokens,
    costUsd:
      (inputTokens * PRICE_PER_1M.input + outputTokens * PRICE_PER_1M.output) /
      1_000_000,
    ms: performance.now() - t0,
    finishReason: res.finishReason,
  });

  return {
    text: res.text,
    finishReason: res.finishReason,
    tokens: inputTokens + outputTokens,
    toolCalls: res.toolCalls.map((c) => ({
      toolCallId: c.toolCallId,
      toolName: c.toolName,
      input: c.input,
    })),
    responseMessages: res.response.messages,
  };
}

// ONE tool call + its event, through the single mediated boundary.
async function toolStep(runId: string, call: ToolCall): Promise<ToolOutput> {
  const t0 = performance.now();
  const out = await runTool(call.toolName, call.input);

  await emit({
    type: "tool.completed",
    runId,
    toolCallId: call.toolCallId,
    tool: call.toolName,
    ok: out.ok,
    ms: performance.now() - t0,
  });

  return out;
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
async function finish(
  step: Step,
  runId: string,
  stop: StopReason,
  output?: string,
) {
  await step("finish", () =>
    emit({ type: "workflow.completed", runId, stop, output }),
  );

  return { stop, output };
}
