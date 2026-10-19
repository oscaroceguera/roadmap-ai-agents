import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// A guardrail test: if someone relaxes strictness, CI tells them.
describe("project setup", () => {
  const ts = JSON.parse(readFileSync("tsconfig.json", "utf8")) as {
    compilerOptions: Record<string, unknown>;
  };

  it.each(["strict", "noUncheckedIndexedAccess", "exactOptionalPropertyTypes"])(
    "tsconfig has %s",
    (flag) => {
      expect(ts.compilerOptions[flag]).toBe(true);
    },
  );
});
