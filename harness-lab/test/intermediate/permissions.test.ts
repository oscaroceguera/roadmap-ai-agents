import { describe, expect, it } from "vitest";
import {
  defaultPolicy,
  evaluate,
  globToRegExp,
  PolicySchema,
} from "../../src/policy/permissions.js";

describe("permissions", () => {
  it("globs", () => {
    expect(globToRegExp("src/**").test("src/a/b.ts")).toBe(true);
    expect(globToRegExp("**/.env*").test(".env")).toBe(true);
    expect(globToRegExp("**/.env*").test("config/.env.local")).toBe(true);
    expect(globToRegExp("*.md").test("docs/a.md")).toBe(false);
  });
  it.each([
    ["read_file", { path: "src/a.ts" }, "allow"],
    ["read_file", { path: ".env" }, "deny"],
    ["write_file", { path: "src/a.ts" }, "allow"],
    ["write_file", { path: "./test/a.test.ts" }, "allow"],
    ["write_file", { path: "package.json" }, "ask"],
    ["write_file", { path: ".git/config" }, "deny"],
    ["delete_everything", {}, "ask"],
  ] as const)("%s %j -> %s", (tool, input, expected) => {
    expect(evaluate(defaultPolicy, tool, input)).toBe(expected);
  });
  it("validates policy files with Zod", () => {
    expect(
      PolicySchema.safeParse({ rules: [{ tool: "x", decision: "maybe" }] })
        .success,
    ).toBe(false);
  });
});
