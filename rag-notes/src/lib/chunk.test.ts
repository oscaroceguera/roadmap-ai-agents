import { describe, it, expect } from "vitest";
import { chunkDocument, chunkText, PAGE_SEPARATOR } from "./chunk";

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

describe("chunkDocument", () => {
  const pdf = (...pages: string[]) => pages.join(PAGE_SEPARATOR);

  it("chunks .md exactly like chunkText, with no page", () => {
    const text = "# A\nalpha\n\n# B\nbeta";
    expect(chunkDocument("notes.md", text)).toEqual(
      chunkText(text).map((content) => ({ content, page: null })),
    );
  });

  it("chunks .txt with no page", () => {
    const chunks = chunkDocument("a.txt", "one\n\ntwo");
    expect(chunks.every((c) => c.page === null)).toBe(true);
  });

  it("recognizes .PDF case-insensitively", () => {
    const chunks = chunkDocument("SCAN.PDF", pdf("first", "second"));
    expect(chunks.map((c) => c.page)).toEqual([1, 2]);
  });

  it("gives each chunk its 1-based page and skips empty pages", () => {
    const chunks = chunkDocument("a.pdf", pdf("apples", "", "bananas"));
    expect(chunks).toEqual([
      { content: "apples", page: 1 },
      { content: "bananas", page: 3 },
    ]);
  });

  it("never mixes text from two pages, even through overlap", () => {
    const page = (word: string) =>
      Array.from({ length: 120 }, (_, i) => `${word} line ${i}`).join("\n");
    const chunks = chunkDocument("a.pdf", pdf(page("apple"), page("banana")));

    expect(chunks.filter((c) => c.page === 2).length).toBeGreaterThan(1);
    for (const c of chunks) {
      const word = c.page === 1 ? "banana" : "apple";
      expect(c.content).not.toContain(word);
    }
  });

  it("splits a dense page at line boundaries, not mid-word", () => {
    const lines = Array.from(
      { length: 100 },
      (_, i) => `Line${i} has some words in it`,
    );
    const chunks = chunkDocument("a.pdf", lines.join("\n"));

    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.content.length).toBeLessThanOrEqual(1500);
      expect(c.content.endsWith("in it")).toBe(true);
    }
  });

  it("treats a one-page PDF with no separator as page 1", () => {
    const chunks = chunkDocument("a.pdf", "only page");
    expect(chunks).toEqual([{ content: "only page", page: 1 }]);
  });
});
