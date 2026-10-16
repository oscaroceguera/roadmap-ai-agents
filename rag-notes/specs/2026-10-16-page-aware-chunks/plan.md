# Phase 4: Page-aware chunks — Plan

## 1. Schema and migration

1.1. Add `page Int?` to `model Chunk` in `src/prisma/contract.prisma`.
1.2. Run `pnpm contract:emit`, then `pnpm prisma migration plan`. Check that the generated migration only adds the nullable `page` column.
1.3. Apply it to the local dev database with `pnpm prisma db migrate`. Check with `pnpm prisma db verify` (or `migration status`).
1.4. `pnpm tsc --noEmit` passes.

## 2. `chunkDocument` tests (`src/lib/chunk.test.ts`), written first

2.1. `.md`: equals `chunkText(content)` with `page: null` on every chunk.
2.2. `.PDF` (uppercase): recognized as a PDF.
2.3. Three pages, where page 2 is empty: chunks come only from pages 1 and 3, and each chunk's page is 1 or 3.
2.4. No chunk contains text from two pages, including through overlap (use distinct words per page).
2.5. A dense PDF page of many short lines (no blank lines, ~3000 chars): every chunk is ≤ `maxChars * 1.5` and starts at the beginning of a line, not mid-word.
2.6. A one-page PDF (no separator): every chunk is page 1.
2.7. The `chunkText` tests still pass unchanged.

## 3. `chunkDocument` (`src/lib/chunk.ts`)

3.1. Move `PAGE_SEPARATOR` here and export it. `upload.ts` imports it from `./chunk`. Update the `upload.test.ts` import.
3.2. Implement `chunkDocument(name, content)` following the rules in `requirements.md`.

## 4. Routes and retrieval

4.1. `POST /api/documents/:id/index`: use `chunkDocument(doc.name, doc.content)`. Store `page`, and number `index` sequentially.
4.2. `GET /api/documents/:id/chunks`: use `chunkDocument` (pass `maxChars`) and include `page` in each item.
4.3. `retrieve()`: add `"page"` to the select. Add `page: number | null` to `RetrievedChunk`.

## 5. Roadmap

5.1. Tick the Phase 4 items in `specs/roadmap.md` after validation.
