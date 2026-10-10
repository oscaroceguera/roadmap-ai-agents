import fs from "node:fs";
import { expect, it } from "vitest";
import { type AgentEvent, emit } from "../src/events";

it("emit appends one JSON line with a timestamp", async () => {
  await emit({ type: "workflow.started", runId: "r1", task: "t" });
  const lines = fs
    .readFileSync(process.env.EVENTS_FILE!, "utf-8")
    .trim()
    .split("\n");
  expect(JSON.parse(lines.at(-1)!)).toMatchObject({
    type: "workflow.started",
    runId: "r1",
    ts: expect.any(Number),
  });
});

it("the event type catches typos at compile time", () => {
  // @ts-expect-error: a misspelled event type must not compile
  const bad: AgentEvent = { type: "turn.completed", runId: "r" };
  expect(bad).toBeDefined();
});
