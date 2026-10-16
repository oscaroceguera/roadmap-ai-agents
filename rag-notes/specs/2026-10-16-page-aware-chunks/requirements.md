# Phase 4: Page-aware chunks — Requirements

## Scope

Every chunk from a PDF records the page it came from, and retrieval returns it. `.md`/`.txt` chunks have no page.

### Included

- A nullable `page Int?` column on `Chunk`, with the contract emitted and a planned migration
- `chunkDocument(name, content): { content: string; page: number | null }[]` in `src/lib/chunk.ts`
- PDF chunking per page, with each line treated as a block
- The index route and the chunk-preview route use `chunkDocument`
- `retrieve()` and `/api/search` return `page`
- Vitest tests for `chunkDocument`

### Not included

- Page labels in answer context or in the UI (Phase 5)
- A backfill or bulk re-index script (the database is empty; re-indexing a document fills `page` in)
- A `Document.kind` column
- Any change to `chunkText`'s existing behavior for `.md`/`.txt`

### Data

| Field | Type | Value |
|---|---|---|
| `Chunk.page` | `Int?` | The 1-based PDF page; `null` for `.md`/`.txt` |
| `RetrievedChunk.page` | `number \| null` | Passed through from the row |

### Chunking rules

| Document | Rule |
|---|---|
| `.md` / `.txt` | `chunkText(content)` exactly as today; `page: null` |
| `.pdf` | Split `content` on `PAGE_SEPARATOR`; segment *i* is page *i + 1*. Skip empty segments. For each page, turn each line into its own block (`\n` → `\n\n`) and run `chunkText`. Each chunk gets that page number. |

- A chunk never spans two pages, and overlap never carries text across pages.
- `Chunk.index` stays one sequence across the whole document (0, 1, 2…), in page order.

## Decisions

- **Chunk per page, with lines as blocks.** Page numbers are exact because a chunk never crosses a page. Treating lines as blocks works around unpdf dropping paragraph gaps (found in Phase 2): `chunkText` packs lines up to `maxChars` instead of hard-cutting a dense page mid-word every 1000 characters.
- **Recognize a PDF by its `.pdf` name** (case-insensitive), the same rule `readUpload` uses. A one-page PDF has no separator, so checking for the separator would misclassify it. No new column.
- **Move `PAGE_SEPARATOR` into `chunk.ts`.** The chunker now reads the format, so the constant lives in the dependency-free module, and `upload.ts` imports it from there. Importing it from `upload.ts` instead would pull unpdf into every route that chunks.
- **Nullable `page`, no backfill.** `null` honestly means "this document has no pages". The column is additive and nullable, and the database is empty, so the migration is safe.

## Context

- Prisma 8 workflow: edit `src/prisma/contract.prisma` → `pnpm contract:emit` → `pnpm prisma migration plan` → `pnpm prisma db migrate`. Commit the contract, the snapshot, and the migration package. See `prisma-8.md`.
- The index route still replaces a document's chunks in one transaction.
- `retrieve()` selects columns explicitly with `db.sql`, so `page` must be added to the `select(...)` list.
- Keep the `console.log("[chunkDocument] - …")` tracing style.
- Vitest can't resolve `@/`, so tested lib files use relative imports.
