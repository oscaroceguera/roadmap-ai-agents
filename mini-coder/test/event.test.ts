import fs from "node:fs";
import { expect, it } from "vitest";
import { emit } from "../src/events";

it("emit appends one JSON line with a timestamp", () => {
  emit({ type: "workflow.started", runId: "r1", task: "t" });
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
