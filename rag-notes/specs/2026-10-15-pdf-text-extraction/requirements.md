# Phase 2: PDF text extraction — Requirements

## Scope

Add a pure function in `src/lib/pdf.ts` that turns a PDF buffer into normalized text for each page. Nothing calls it yet; Phase 3 connects it to uploads.

### Included

- `extractPdf(data: Uint8Array | ArrayBuffer): Promise<PdfText>`
- Text normalization for each page
- A typed `PdfError` for PDFs that can't be used
- Vitest tests against small committed fixture PDFs
- The `unpdf` dependency

### Not included

- Upload route changes, the `.pdf` accept rule, and HTTP error mapping (Phase 3)
- Page-aware chunking and a `page` column (Phase 4)
- OCR, metadata (title/author), images, and layout or table fidelity

### Data shape

```ts
type PdfPage = { page: number; text: string }; // page is 1-based, from the original PDF
type PdfText = { pages: PdfPage[]; totalPages: number };

type PdfErrorCode = "invalid" | "encrypted" | "no-text";
class PdfError extends Error { code: PdfErrorCode }
```

| Field | Meaning |
|---|---|
| `pages` | Only pages that have text after normalization, in document order |
| `pages[].page` | The original 1-based page number, kept even when pages before it are dropped |
| `pages[].text` | The normalized text of that page |
| `totalPages` | The PDF's page count, including blank pages |

### Normalization rules (per page)

1. Join words hyphenated across a line break: `exam-\nple` → `example`.
2. Collapse runs of spaces and tabs into one space; trim each line.
3. Collapse 3 or more newlines into one blank line (`\n\n`), so `chunkText` still sees paragraph breaks.
4. Trim the page. If the result is empty, drop the page.

### Errors

| Condition | Code |
|---|---|
| The bytes are not a parseable PDF | `invalid` |
| The PDF needs a password | `encrypted` |
| Every page is empty after normalization | `no-text` |

## Decisions

- **`unpdf`** is the single allowed extraction library (see `tech-stack.md`). It wraps pdf.js in a serverless-friendly build with no worker setup, and `extractText(pdf, { mergePages: false })` already returns text per page.
- **Throw a typed `PdfError` instead of returning a result object.** This matches how the rest of `src/lib` signals failure, and Phase 3 can map `err.code` to a 400 message in one `catch`.
- **Classify pdf.js errors by `name`** (`PasswordException` → `encrypted`, `InvalidPDFException` and other parse errors → `invalid`). Check the exact names against the installed `unpdf` while implementing.
- **Return per-page text now**, even though Phase 3 stores the joined text. Phase 4 needs page numbers, so this avoids a second API change.
- **Use committed fixture PDFs** rather than generating them, so no PDF-writer dependency is needed.

## Context

- Follow `src/lib/chunk.ts`: one exported pure function with small helpers, and `console.log("[extractPdf] - …")` tracing.
- Tests sit next to the code as `src/lib/pdf.test.ts`. Fixtures go in `src/lib/__fixtures__/` and stay at a few KB each.
- Read fixtures with `node:fs/promises` relative to the test file.
- Error messages are for developers in this phase; user-facing copy comes in Phase 3/6.
