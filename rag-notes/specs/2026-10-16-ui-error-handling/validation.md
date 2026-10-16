# Phase 6: UI and error handling — Validation

## Automated

Run in `rag-notes/`:

- `pnpm vitest run`: all tests pass, including the new size-limit cases.
- `pnpm tsc --noEmit`: no type errors.
- `pnpm eslint` on the changed `src/` files: clean.
- `pnpm build`: succeeds.

The `upload.test.ts` cases must assert:

- [ ] A file of exactly `MAX_UPLOAD_BYTES` is accepted.
- [ ] A file one byte over is rejected with `UploadError`, status `413`, and `This file is too large (max 4 MB).`
- [ ] An oversized `.pdf` is rejected with the size error, not a PDF error.
- [ ] The existing extension and PDF error cases still pass.

## Manual

With `pnpm dev` running:

- [ ] The file picker offers `.pdf`, and the hint reads `.md · .txt · .pdf · max 4 MB`.
- [ ] Upload `multi.pdf` from the UI. It appears in the list with chunks and no other steps.
- [ ] Upload `encrypted.pdf` and then `blank.pdf`. Each shows its message as an amber alert, and neither appears in the list.
- [ ] Pick a file over 4 MB. The too-large alert appears, and the network tab shows no request.
- [ ] `curl -F file=@big.txt /api/documents` with a file over 4 MB returns `413` with the message.
- [ ] Simulate an index failure (for example, set a bad `OPENAI_API_KEY` and restart). The alert reads `Indexing failed. Try again.`, the document is not in the list, and `GET /api/documents` doesn't include it.
- [ ] `DELETE /api/documents/<unknown>` returns `404`.
- [ ] Re-indexing an existing document still works and doesn't delete it.
- [ ] The README and AGENTS.md read correctly and match the code.

## Tone check

- Error messages are short, plain, and say what to do next where possible. They don't expose stack traces or provider errors.

## Definition of done

- PDFs upload from the Library UI; files over 4 MB are rejected in the browser and by the API; every failure shows a clear alert and leaves no document behind.
- `.md`/`.txt` upload, indexing, and answers are unchanged.
- The docs describe PDF support, all checks pass, and Phase 6 is ticked in `specs/roadmap.md`. No new dependencies.
