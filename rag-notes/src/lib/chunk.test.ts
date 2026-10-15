import { describe, it, expect } from "vitest";
import { chunkText } from "./chunk";

describe("chunkText", () => {
  it("keeps a short doc as one chunk", () => {
    expect(chunkText("Hello\n\nWorld")).toEqual(["Hello\n\nWorld"]);
  });

  it("never produces a chunk much bigger than maxChars", () => {
    const text = Array.from({ length: 50 }, (_, i) =>
      `Paragraph ${i} `.repeat(20),
    ).join("\n\n");

    for (const c of chunkText(text, { maxChars: 500 })) {
      expect(c.length).toBeLessThanOrEqual(750);
    }
  });

  it("starts a new chunk at each heading", () => {
    const chunks = chunkText("# A\nalpha\n\n# B\nbeta");
    expect(chunks).toHaveLength(2);
    expect(chunks[1].startsWith("# B")).toBe(true);
  });

  it("lose no text", () => {
    const text = "one\n\ntwo\n\nthree";
    const joined = chunkText(text).join(" ");
    for (const w of ["one", "two", "three"]) {
      expect(joined).toContain(w);
    }
  });
});
