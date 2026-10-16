# Phase 6: UI and error handling — Plan

## 1. Size limit (tests first)

1.1. In `src/lib/upload.test.ts`, add: a `.txt` file of exactly 4 MB is accepted; a file of 4 MB + 1 byte is rejected with `UploadError`, status `413`, and `This file is too large (max 4 MB).`; an oversized `.pdf` is rejected before it is parsed.
1.2. Create `src/lib/limits.ts` exporting `MAX_UPLOAD_BYTES = 4 * 1024 * 1024`.
1.3. In `readUpload`, check `file.size` right after the extension check and throw `UploadError(…, 413)`.

## 2. API routes

2.1. `POST /api/documents/:id/index`: wrap the chunk, embed, and transaction steps in `try/catch`. Log the error and return `{ error: "Indexing failed. Try again." }` with status `500`. The 404 path stays the same.
2.2. Add `src/app/api/documents/[id]/route.ts` with `DELETE`. Return `404` if the document doesn't exist. Otherwise delete it and return `{ id }`.

## 3. Library UI (`src/app/components/Library.tsx`)

3.1. Set `accept=".md,.txt,.pdf"`, and make the hint read `.md · .txt · .pdf · max 4 MB`.
3.2. Before uploading, if `file.size > MAX_UPLOAD_BYTES`, show the too-large error without making a request.
3.3. Read error bodies safely (`res.json().catch(() => ({}))`) so a response that isn't JSON falls back to `Upload failed` / `Indexing failed`.
3.4. If indexing fails, `DELETE /api/documents/:id` (best-effort), call `onChange()`, then show the index error.
3.5. Split the state into a status (muted, `role="status"`) and an error (amber, `role="alert"`). Starting a new upload clears both.

## 4. Docs

4.1. Update the README: intro, flow, path table, API table, the size limit, and PDF notes (text-only, no OCR, page citations).
4.2. Update AGENTS.md: the PDF pipeline, the page and citation invariant, and the size limit.

## 5. Verify and roadmap

5.1. Run the automated checks and the manual walkthrough in `validation.md`.
5.2. Tick the Phase 6 items in `specs/roadmap.md`.
