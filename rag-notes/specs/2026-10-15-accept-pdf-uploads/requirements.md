# Phase 3: Accept PDF uploads — Requirements

## Scope

`POST /api/documents` accepts `.pdf` files alongside `.md`/`.txt`. The PDF's text is extracted with `extractPdf` (Phase 2) and stored as the Document's `content`, so the existing index flow (`POST /api/documents/:id/index`) works on it unchanged.

### Included

- A pure helper `readUpload(file: File): Promise<{ name: string; content: string }>` in `src/lib/upload.ts`
- `UploadError` with `status` (always 400 in this phase) and a user-facing `message`
- Storing PDF pages joined with a page separator (see below)
- A thin `POST /api/documents` that calls `readUpload` and maps `UploadError` to `{ error: message }` with its status
- Vitest tests for `readUpload`

### Not included

- A `page` column, page-aware chunks, and page citations (Phases 4–5)
- UI changes: the file input `accept` rule and error display (Phase 6)
- An upload size limit (Phase 6)
- Storing the original PDF bytes

### Stored content

| Upload | `content` |
|---|---|
| `.md` / `.txt` | `await file.text()`, unchanged from today |
| `.pdf` | Normalized text for every page `1..totalPages`, joined with `PAGE_SEPARATOR = "\n\f\n"`. A page dropped by `extractPdf` (blank) is stored as `""`, so the Nth segment is always page N. |

`content.split(PAGE_SEPARATOR)` gives exactly `totalPages` segments. Phase 4 relies on this.

### Errors (HTTP 400, body `{ error }`)

| Condition | Message |
|---|---|
| No `file` field | `No file` (unchanged) |
| Extension is not `.md`, `.txt`, or `.pdf` | `Only .md, .txt or .pdf files.` |
| `PdfError` `invalid` | `This file isn't a readable PDF.` |
| `PdfError` `encrypted` | `This PDF is password-protected. Remove the password and try again.` |
| `PdfError` `no-text` | `This PDF has no selectable text (it may be scanned).` |

A rejected upload creates no Document row.

## Decisions

- **Separator `\n\f\n`** (form feed between newlines). It keeps the `Document` table unchanged and lets Phase 4 recover pages by splitting. `chunkText` already splits on `\n\s*\n` and `\s` matches `\f`, so a page boundary acts as a paragraph break and the `\f` never reaches a chunk or an embedding.
- **Blank pages are stored as empty segments** rather than skipped, so the page numbers implied by segment position stay exact.
- **A pure helper in `src/lib`, tested with Vitest.** The route stays thin and the logic is tested without a database, using the Phase 2 fixtures.
- **Plain, actionable messages** for whoever uploads the file. These are the final user-facing copy; Phase 6 only displays them.
- **Use `File` from the platform.** Node 20+ provides `File` globally, so tests build one from the fixture bytes.

## Context

- Follow `src/lib/pdf.ts`: exported pure functions, a typed error class, and `console.log("[readUpload] - …")` tracing.
- Export `PAGE_SEPARATOR` from `src/lib/upload.ts` for Phase 4.
- The route keeps today's response shape: `{ id, name, length }`.
- Extension checks stay case-insensitive (`/\.(md|txt|pdf)$/i`), matching the current route.
- Copy tone: short, plain, and saying what to do next when possible. No codes or jargon.
