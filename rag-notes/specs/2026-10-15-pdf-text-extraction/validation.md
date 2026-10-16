# Phase 2: PDF text extraction — Validation

## Automated

Run in `rag-notes/`:

- `pnpm vitest run`: all tests pass, including the existing `chunk.test.ts` and the new `pdf.test.ts`.
- `pnpm lint`: clean.
- `pnpm tsc --noEmit`: no type errors.

`pdf.test.ts` must assert:

- [ ] Per-page output keeps the original 1-based page numbers (`multi.pdf` → `[1, 3]`).
- [ ] `totalPages` counts blank pages (`multi.pdf` → `3`).
- [ ] A word hyphenated across a line break comes back joined.
- [ ] Paragraph breaks survive as `\n\n`.
- [ ] `blank.pdf` → `PdfError` with code `no-text`.
- [ ] `encrypted.pdf` → `PdfError` with code `encrypted`.
- [ ] Non-PDF bytes → `PdfError` with code `invalid`.
- [ ] Every thrown error is an `instanceof PdfError` (no raw pdf.js errors leak).

## Manual

- [ ] In a scratch script (`pnpm tsx`), run `extractPdf` on a real multi-page PDF of your own. The text reads naturally, with no stray mid-word line breaks.
- [ ] Pass the joined page text to `chunkText` and confirm the chunks look like a `.md` note's chunks (paragraphs grouped, no tiny fragments).
- [ ] `git diff --stat`: the only changes are `package.json`, `pnpm-lock.yaml`, `src/lib/pdf.ts`, `src/lib/pdf.test.ts`, `src/lib/__fixtures__/*`, and the specs. No route or UI changes.
- [ ] Every fixture is under ~20 KB.

## Definition of done

- `unpdf` is the only new dependency.
- `extractPdf` and `normalizePageText` exist in `src/lib/pdf.ts` with the types from `requirements.md`.
- All automated checks above pass.
- The Phase 2 items in `specs/roadmap.md` are ticked, and `.md`/`.txt` behavior is unchanged.
