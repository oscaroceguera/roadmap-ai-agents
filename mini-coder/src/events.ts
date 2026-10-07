import { appendFileSync } from "node:fs";
import { StopReason } from "./loop";

export type AgentEvent =
  | { type: "workflow.started"; runId: string; task: string }
  | {
      type: "turn.completed";
      runId: string;
      turn: number;
      inputTokens: number;
      outputTokens: number;
      costUsd: number;
      ms: number;
      finishReason: string;
    }
  | {
      type: "tool.completed";
      runId: string;
      toolCallId: string;
      tool: string;
      ok: boolean;
      ms: number;
    }
  | {
      type: "approval.requested" | "approval.decided";
      runId: string;
      toolCallId: string;
      approved?: boolean;
    }
  | {
      type: "memory.compacted";
      runId: string;
      summarizedTurns: number;
      contextTokens: number;
    }
  | {
      type: "workflow.completed";
      runId: string;
      stop: StopReason;
      output?: string;
    };

export const EVENTS_FILE = process.env.EVENTS_FILE ?? "events.jsonl";

export function emit(event: AgentEvent) {
  const row = { ...event, ts: Date.now() };
  appendFileSync(EVENTS_FILE, `${JSON.stringify(row)}\n`);
}
