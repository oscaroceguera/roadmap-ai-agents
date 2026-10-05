import { appendFileSync } from "node:fs";

export type EventInput = {
  type: string;
  runId: string;
  [k: string]: unknown;
};

export const EVENTS_FILE = process.env.EVENTS_FILE ?? "events.jsonl";

export function emit(event: EventInput) {
  const row = { ...event, ts: Date.now() };
  appendFileSync(EVENTS_FILE, `${JSON.stringify(row)}\n`);
}
