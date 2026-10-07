import { appendFileSync, existsSync, readFileSync } from "node:fs";
import type { StopReason } from "./loop";

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

export type EventRow = AgentEvent & { ts: number };

// Two sinks, one rule: EVENTS_FILE set → JSONL (tests set it in test/setup.ts), otherwise → Postgres.
export const EVENTS_FILE = process.env.EVENTS_FILE ?? "events.jsonl";
export const SINK: "jsonl" | "postgres" = process.env.EVENTS_FILE
  ? "jsonl"
  : "postgres";

// Lazy: db.ts throws without DATABASE_URL, so it's only loaded the first time Postgres is actually used.
let pg: Promise<typeof import("./db")> | undefined;
const postgresSink = () => (pg ??= import("./db"));

export async function emit(event: AgentEvent): Promise<void> {
  const row: EventRow = { ...event, ts: Date.now() };
  if (SINK === "jsonl") {
    appendFileSync(EVENTS_FILE, `${JSON.stringify(row)}\n`);
    return;
  }
  await (await postgresSink()).insertEvent(row);
}

export async function readEvents(limit = 20): Promise<EventRow[]> {
  if (SINK === "postgres") return (await postgresSink()).recentEvents(limit);
  if (!existsSync(EVENTS_FILE)) return [];
  return readFileSync(EVENTS_FILE, "utf-8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .slice(-limit)
    .map((line) => JSON.parse(line));
}

export async function costByRun(limit = 5) {
  if (SINK === "jsonl")
    throw new Error("`cost` reads Postgres: run it without EVENTS_FILE set");
  return (await postgresSink()).costByRun(limit);
}

// Call once before the process exits. A no-op if Postgres was never touched.
export async function closeEvents() {
  if (pg) await (await pg).close();
}
