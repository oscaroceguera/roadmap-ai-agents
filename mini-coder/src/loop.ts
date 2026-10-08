// src/loop.ts — Step 14: Step 12's durable loop + the hydrator (compact, then hydrate, before every model call).
import {
  generateText,
  type JSONValue,
  type LanguageModel,
  type ModelMessage,
} from "ai";
import {
  buildContext,
  clipToolResults,
  splitTurns,
  type TurnMessages,
} from "./context/hydrate";
import {
  budgetFor,
  COMPACTION,
  type Compaction,
  WINDOW,
} from "./context/modelLimits";
import { summarize } from "./context/summarize";
import { estimateText, estimateTokens } from "./context/tokens";
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
    window = WINDOW,
    compaction = COMPACTION,
    summaryModel = model,
  }: {
    model?: LanguageModel;
    runId?: string;
    step?: Step;
    window?: number; // tests pass a tiny window so compaction fires for free
    compaction?: Compaction; // "summarize" | "truncate"
    summaryModel?: LanguageModel; // who writes the summary (tests pass a second mock)
  } = {},
) {
  // Everything OUTSIDE a step must be deterministic: on recovery it runs again and must take the
  // same path. So no Date.now(), random numbers or file reads here; those live inside steps.
  // History is kept as TURNS (model message + its tool results), so compaction can drop whole turns.
  // The task is NOT in `turns`: buildContext() pins it first, every time.
  let turns: TurnMessages[] = [];
  let summary = "";
  const budget = budgetFor(window);
  const contextTokens = () =>
    estimateText(SYSTEM_PROMPT) +
    estimateTokens(buildContext(task, summary, turns));
  let tokens = 0;
  let consecutiveErrors = 0;

  await step("started", () => emit({ type: "workflow.started", runId, task }));

  for (let turn = 0; turn < LIMITS.maxIterations; turn++) {
    // 1. Too big? Compact BEFORE calling the model. Trigger on a token estimate, never on a turn count.
    if (contextTokens() > budget.compactAt) {
      // Pure functions: same input → same result, so a DBOS replay takes exactly the same path.
      const { old, recent } = splitTurns(turns, budget.keepRecent); // a. drop or summarize old turns
      const fitted = clipToolResults(recent, budget.keepRecent); // b. still too big? clip old tool results
      if (old.length > 0 || fitted.clipped > 0) {
        summary = await step(`compact-${turn}`, async () => {
          const next =
            old.length > 0 && compaction === "summarize"
              ? await summarize(summaryModel, old, summary)
              : summary;
          await emit({
            type: "memory.compacted",
            runId,
            summarizedTurns: old.length,
            clippedResults: fitted.clipped,
            contextTokens:
              estimateText(SYSTEM_PROMPT) +
              estimateTokens(buildContext(task, next, fitted.turns)),
          });
          return next;
        });
        turns = fitted.turns;
      }
    }

    // 2. Hydrate: build this turn's context fresh (pinned task + summary + recent turns), then call the model.
    const context = buildContext(task, summary, turns);
    const res = await step(`model-${turn}`, () =>
      modelTurn(model, context, runId, turn),
    );

    tokens += res.tokens;
    const thisTurn: TurnMessages = [...res.responseMessages];

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

    thisTurn.push({ role: "tool", content: results }); // ONE message for all results of this turn
    turns.push(thisTurn); // the call and its results: kept or dropped together

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
