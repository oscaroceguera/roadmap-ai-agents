import { describe, expect, it } from "vitest";
import { runAgent } from "../src/loop";
import { scriptedModel } from "../src/mockModel";

const readOk = { name: "read_file", input: { path: "src/money.ts" } };
const readEscape = { name: "read_file", input: { path: "../../etc/passwd" } };

describe("loop exits — every stop is named", () => {
  it("completed: the model answers with no tool calls", async () => {
    const model = scriptedModel(() => ({ text: "all good" }));
    expect(await runAgent("hi", { model })).toEqual({
      stop: "completed",
      output: "all good",
    });
  });
  it("finish_reason: the provider cut us off", async () => {
    const model = scriptedModel(() => ({ text: "trunc", finish: "length" }));
    expect((await runAgent("hi", { model })).stop).toBe("finish_reason");
  });
  it("error_threshold: 3 harness errors in a row", async () => {
    const model = scriptedModel(() => ({ call: readEscape }));
    expect((await runAgent("hi", { model })).stop).toBe("error_threshold");
  });
  it("a success resets the error streak", async () => {
    const model = scriptedModel((n) =>
      n === 2
        ? { call: readOk }
        : n < 5
          ? { call: readEscape }
          : { text: "ok" },
    );
    expect((await runAgent("hi", { model })).stop).toBe("completed");
  });
  it("max_tokens: cumulative budget", async () => {
    const model = scriptedModel(() => ({ call: readOk, tokens: 200_000 }));
    expect((await runAgent("hi", { model })).stop).toBe("max_tokens");
  });
  it("max_iterations: never stops calling tools", async () => {
    const model = scriptedModel(() => ({ call: readOk }));
    expect((await runAgent("hi", { model })).stop).toBe("max_iterations");
  });
});
