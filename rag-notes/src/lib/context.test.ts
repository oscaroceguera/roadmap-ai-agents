import { describe, it, expect } from "vitest";
import { buildContext, sourceLabel } from "./context";
import type { RetrievedChunk } from "./retrieve";

function chunk(over: Partial<RetrievedChunk>): RetrievedChunk {
  return {
    id: "c",
    content: "text",
    documentId: "d",
    documentName: "doc",
    index: 0,
    page: null,
    similarity: 0.9,
    ...over,
  };
}

describe("sourceLabel", () => {
  it("adds the page for a PDF chunk", () => {
    expect(sourceLabel({ documentName: "paper.pdf", page: 3 })).toBe(
      "paper.pdf p.3",
    );
  });

  it("labels page 1", () => {
    expect(sourceLabel({ documentName: "paper.pdf", page: 1 })).toBe(
      "paper.pdf p.1",
    );
  });

  it("uses the bare name when there is no page", () => {
    expect(sourceLabel({ documentName: "notes.md", page: null })).toBe(
      "notes.md",
    );
  });
});

describe("buildContext", () => {
  it("numbers and labels PDF and note sources", () => {
    const ctx = buildContext([
      chunk({ documentName: "paper.pdf", page: 3, content: "Bananas." }),
      chunk({ documentName: "notes.md", page: null, content: "Apples." }),
    ]);
    expect(ctx).toBe(
      "[1] (source: paper.pdf p.3)\nBananas.\n\n---\n\n[2] (source: notes.md)\nApples.",
    );
  });

  it("returns an empty string for no chunks", () => {
    expect(buildContext([])).toBe("");
  });
});
