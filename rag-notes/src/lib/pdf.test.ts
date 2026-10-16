import { readFile } from "node:fs/promises";
import { describe, it, expect } from "vitest";
import { extractPdf, normalizePageText, PdfError } from "./pdf";

const fixture = (name: string) =>
  readFile(new URL(`./__fixtures__/${name}`, import.meta.url));

async function expectPdfError(data: Uint8Array, code: PdfError["code"]) {
  const err = await extractPdf(data).catch((e) => e);
  expect(err).toBeInstanceOf(PdfError);
  expect(err.code).toBe(code);
}

describe("normalizePageText", () => {
  it("joins a word hyphenated across a line break", () => {
    expect(normalizePageText("a lively exam-\nple here")).toBe(
      "a lively example here",
    );
  });

  it("collapses spaces and tabs and trims lines", () => {
    expect(normalizePageText("  one \t  two  \n  three ")).toBe(
      "one two\nthree",
    );
  });

  it("keeps paragraph breaks as a single blank line", () => {
    expect(normalizePageText("first\n\n\n\nsecond")).toBe("first\n\nsecond");
  });

  it("joins hyphenated words with accented letters", () => {
    expect(normalizePageText("una café-\nteria")).toBe("una caféteria");
  });

  it("joins a hyphen followed by trailing spaces", () => {
    expect(normalizePageText("exam-  \nple")).toBe("example");
  });

  it("keeps number ranges split across lines", () => {
    expect(normalizePageText("pages 10-\n12")).toBe("pages 10-\n12");
  });

  it("removes NUL characters, which Postgres text rejects", () => {
    expect(normalizePageText("ca\u0000fé\u0000")).toBe("café");
  });

  it("returns an empty string for whitespace-only input", () => {
    expect(normalizePageText(" \n\t\n ")).toBe("");
  });
});

describe("extractPdf", () => {
  it("extracts one page with its text and joins hyphenated words", async () => {
    const { pages, totalPages } = await extractPdf(await fixture("single.pdf"));

    expect(totalPages).toBe(1);
    expect(pages).toHaveLength(1);
    expect(pages[0].page).toBe(1);
    expect(pages[0].text).toContain("# Sourdough notes");
    expect(pages[0].text).toContain("example of fermentation");
    expect(pages[0].text).not.toContain("exam-");
  });

  it("drops blank pages but keeps original page numbers", async () => {
    const { pages, totalPages } = await extractPdf(await fixture("multi.pdf"));

    expect(totalPages).toBe(3);
    expect(pages.map((p) => p.page)).toEqual([1, 3]);
    expect(pages[0].text).toContain("apples");
    expect(pages[1].text).toContain("bananas");
  });

  it("rejects a PDF with no text as no-text", async () => {
    await expectPdfError(await fixture("blank.pdf"), "no-text");
  });

  it("rejects a password-protected PDF as encrypted", async () => {
    await expectPdfError(await fixture("encrypted.pdf"), "encrypted");
  });

  it("leaves the caller's ArrayBuffer intact", async () => {
    const bytes = await fixture("single.pdf");
    const ab = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    );

    await extractPdf(ab);

    expect(ab.byteLength).toBe(bytes.byteLength);
  });

  it("rejects bytes that are not a PDF as invalid", async () => {
    await expectPdfError(new Uint8Array([1, 2, 3]), "invalid");
  });
});
