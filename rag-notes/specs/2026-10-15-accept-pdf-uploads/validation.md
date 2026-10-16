# Phase 3: Accept PDF uploads — Validation

## Automated

Run in `rag-notes/`:

- `pnpm vitest run`: all tests pass (`chunk`, `pdf`, and the new `upload` tests).
- `pnpm tsc --noEmit`: no type errors.
- `pnpm eslint src/lib/upload.ts src/lib/upload.test.ts src/app/api/documents/route.ts`: clean. (Full `pnpm lint` already fails on the generated `contract.d.ts` files; that isn't in scope here.)

`upload.test.ts` must assert:

- [ ] `.md`/`.txt` content is byte-for-byte the file text.
- [ ] `multi.pdf` → 3 segments, where segment 1 (the blank page 2) is `""`.
- [ ] A one-page PDF has no `\f` in its content.
- [ ] No chunk from `chunkText` contains `\f`.
- [ ] Each error case returns status 400 and the exact message from `requirements.md`.
- [ ] Extension matching is case-insensitive.

## Manual

With `pnpm dev` running and a database available:

- [ ] `curl -F file=@src/lib/__fixtures__/multi.pdf localhost:3000/api/documents` → 200 with `{ id, name, length }`.
- [ ] `POST /api/documents/<id>/index` → 200 with `chunks ≥ 1`.
- [ ] `GET /api/search?q=bananas` → top result from `multi.pdf`.
- [ ] Upload `encrypted.pdf` and `blank.pdf` → 400 with the expected messages; `GET /api/documents` shows no new rows.
- [ ] Upload a `.md` note → same behavior as before this phase.
- [ ] Upload a real multi-page PDF of your own and ask a question about it in the UI. The answer cites it. (The Library file input may still hide `.pdf` until Phase 6; curl works.)

## Tone check

- [ ] Every error message is one plain sentence, says what's wrong, and where possible says what to do next.

## Definition of done

- `readUpload`, `UploadError`, and `PAGE_SEPARATOR` exist in `src/lib/upload.ts` and are tested.
- `POST /api/documents` accepts `.pdf` and rejects bad PDFs with 400 and no stored row.
- Automated checks pass, and the manual curl walkthrough works against a real database.
- Phase 3 items are ticked in `specs/roadmap.md`. No new dependencies.
