import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { clip, ROOT, resolveInWorkspace } from "../src/workspace";

describe("resolveInWorkspace (the path jail)", () => {
  it("allows a relative path inside", () => {
    expect(resolveInWorkspace("src/money.ts")).toBe(
      path.join(ROOT, "src/money.ts"),
    );
  });
  it("refuses ../ escapes", () => {
    expect(() => resolveInWorkspace("../../etc/passwd")).toThrow(/Refused/);
  });
  it("refuses absolute paths outside", () => {
    expect(() => resolveInWorkspace("/etc/passwd")).toThrow(/Refused/);
  });
  it("refuses a symlink that points outside", () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "outside-"));
    fs.writeFileSync(path.join(outside, "secret.txt"), "nope");
    fs.symlinkSync(outside, path.join(ROOT, "sneaky"));
    expect(() => resolveInWorkspace("sneaky/secret.txt")).toThrow(
      /resolves outside/,
    );
  });
  it("ROOT is a realpath (macOS /tmp → /private/tmp)", () => {
    expect(ROOT).toBe(fs.realpathSync(ROOT));
  });
});

describe("clip", () => {
  it("leaves short strings alone", () => expect(clip("hello")).toBe("hello"));
  it("keeps head and tail of long strings", () => {
    const out = clip("a".repeat(5_000) + "b".repeat(5_000), 1_000);
    expect(out.startsWith("a".repeat(500))).toBe(true);
    expect(out.endsWith("b".repeat(500))).toBe(true);
    expect(out).toContain("chars clipped");
  });
});
