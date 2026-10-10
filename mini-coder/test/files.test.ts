import { describe, expect, it } from "vitest";
import { readFile } from "../src/tools/readFile";
import { writeFile } from "../src/tools/writeFile";

describe("read_file", () => {
  it("reads a file inside the workspace", async () => {
    const out = await readFile({ path: "src/money.ts" });
    expect(out.ok).toBe(true);
    expect(out.content).toContain("formatCents");
  });
  it("gives an actionable error for a missing file", async () => {
    const out = await readFile({ path: "src/nope.ts" });
    expect(out).toMatchObject({
      ok: false,
      error: expect.stringMatching(/Use grep/),
    });
  });
  it("gives an actionable error for a directory", async () => {
    const out = await readFile({ path: "src" });
    expect(out).toMatchObject({
      ok: false,
      error: expect.stringMatching(/is a directory/),
    });
  });
  it("throws (does not return) on a jail escape — runTool catches it later", async () => {
    await expect(readFile({ path: "../../etc/passwd" })).rejects.toThrow(
      /Refused/,
    );
  });
});

describe("write_file", () => {
  it("creates nested dirs and is idempotent", async () => {
    const a = await writeFile({ path: "notes/a/b.md", content: "hi" });
    const b = await writeFile({ path: "notes/a/b.md", content: "hi" });
    expect(a).toEqual(b);
    expect((await readFile({ path: "notes/a/b.md" })).content).toBe("hi");
  });
});
