# Phase 4: Page-aware chunks — Validation

## Automated

Run in `rag-notes/`:

- `pnpm vitest run`: all tests pass (`chunk`, `pdf`, `upload`, plus the new `chunkDocument` cases).
- `pnpm tsc --noEmit`: no type errors.
- `pnpm eslint` on the changed `src/` files: clean. (Full `pnpm lint` still fails only on the generated `contract.d.ts`.)
- `pnpm prisma migration check`: the migration graph is valid.

The `chunkDocument` tests must assert:

- [ ] `.md`/`.txt` output is identical to `chunkText`, with `page: null`.
- [ ] PDF chunks carry the right 1-based page, and an empty page yields no chunks.
- [ ] No chunk mixes text from two pages.
- [ ] A dense page is split at line boundaries, not mid-word.
- [ ] `.pdf` detection is case-insensitive, and a one-page PDF works.

## Manual

With the migration applied and `pnpm dev` running:

- [ ] `pnpm prisma db verify`: the database matches the contract.
- [ ] Upload `src/lib/__fixtures__/multi.pdf`, then `GET /api/documents/<id>/chunks`: every item has `page` 1 or 3.
- [ ] `POST /api/documents/<id>/index`, then `GET /api/search?q=bananas`: the top result has `page: 3`.
- [ ] Upload and index a `.md` note: its search results have `page: null`.
- [ ] A real multi-page PDF of your own: preview the chunks. They read as whole lines grouped together, with no mid-word cuts, and the page numbers match the PDF.

## Definition of done

- `Chunk.page` exists in the contract, the migration, and the dev database.
- PDF chunks are page-exact; `.md`/`.txt` chunking is unchanged.
- `retrieve()` and `/api/search` return `page`.
- All automated checks pass, and Phase 4 is ticked in `specs/roadmap.md`. No new dependencies.
