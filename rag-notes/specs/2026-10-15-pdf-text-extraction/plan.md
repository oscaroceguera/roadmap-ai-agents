# Phase 2: PDF text extraction — Plan

## 1. Dependency

1.1. `pnpm add unpdf` (in `rag-notes/`).
1.2. Confirm the installed `unpdf` API: `getDocumentProxy`, `extractText(..., { mergePages: false })` returning `{ totalPages, text: string[] }`, and the pdf.js error names for password and invalid input. Note any difference in `requirements.md`.

## 2. Fixtures

Create these with any local tool (for example, export from a text editor or print to PDF; encrypt with `qpdf --encrypt`). These tools are not project dependencies.

2.1. `src/lib/__fixtures__/single.pdf`: one page with a heading, two paragraphs, and one word hyphenated across a line break.
2.2. `src/lib/__fixtures__/multi.pdf`: 3 pages, where page 2 is blank and pages 1 and 3 have distinct text.
2.3. `src/lib/__fixtures__/blank.pdf`: 1–2 pages with no text.
2.4. `src/lib/__fixtures__/encrypted.pdf`: needs a user password.
2.5. Keep each fixture under ~20 KB. Add `src/lib/__fixtures__/README.md` with one line per fixture saying what it contains.

## 3. Extraction module (`src/lib/pdf.ts`)

3.1. Export the `PdfPage` and `PdfText` types, plus `PdfError` with a `code`.
3.2. `normalizePageText(text: string): string`, which implements the 4 normalization rules. Export it so it can be unit-tested.
3.3. `extractPdf(data)`:
  - Load with `getDocumentProxy`. Map pdf.js errors to `PdfError` (`encrypted` or `invalid`).
  - Call `extractText` with `mergePages: false`.
  - Map each page to `{ page: i + 1, text: normalizePageText(t) }` and drop empty pages.
  - If no pages remain, throw `PdfError("no-text")`.
  - Return `{ pages, totalPages }`.
3.4. Add `[extractPdf]` / `[normalizePageText]` tracing that matches the style of `chunk.ts`.

## 4. Tests (`src/lib/pdf.test.ts`)

4.1. `normalizePageText`: joins hyphenated breaks, collapses spaces, keeps paragraph breaks, and returns `""` for whitespace-only input.
4.2. `single.pdf`: 1 page, `page: 1`, contains the expected words, and the hyphenated word is joined.
4.3. `multi.pdf`: `totalPages === 3`, the returned pages are `[1, 3]`, and the text is in order.
4.4. `blank.pdf` rejects with `PdfError` code `no-text`.
4.5. `encrypted.pdf` rejects with code `encrypted`.
4.6. Random bytes (`new Uint8Array([1, 2, 3])`) reject with code `invalid`.

## 5. Roadmap

5.1. Tick the Phase 2 items in `specs/roadmap.md` once validation passes, and record the library choice (`unpdf`).
