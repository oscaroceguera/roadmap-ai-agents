# Phase 6: UI and error handling — Requirements

## Scope

A PDF can be uploaded from the Library UI. Files that are too large or unreadable are rejected with a clear message, and a failed upload or index leaves no document behind. The README and AGENTS.md describe PDF support.

### Included

- The Library file input accepts `.pdf`, and its hint reads `.md · .txt · .pdf · max 4 MB`
- A 4 MB limit on every upload, checked in the browser before sending and enforced in `readUpload` (status `413`)
- `MAX_UPLOAD_BYTES` in a new dependency-free `src/lib/limits.ts`, shared by `readUpload` and `Library`
- The index route catches failures and returns a JSON `{ error }` instead of crashing
- A new `DELETE /api/documents/:id` route. Its chunks are removed by the existing `onDelete: Cascade`.
- When indexing fails, Library deletes the new document and then shows the error
- Errors show as `role="alert"` in the amber mono style `Ask` uses, and progress stays as a muted `role="status"`
- README and AGENTS.md updated for PDF support
- Vitest tests for the size limit in `readUpload`

### Not included

- A delete button in the Library list. The route is only used for rollback for now.
- A retry flow, or a "not indexed" state
- Streaming or chunked uploads, and an early `Content-Length` check before the form data is parsed
- Batching embeddings by token count (`embedMany` keeps its 100-per-request batches)

### Error messages

| Case | Where it's caught | Status | Message |
|---|---|---|---|
| Wrong extension | `readUpload` | 400 | `Only .md, .txt or .pdf files.` (existing) |
| Over 4 MB | Library (before upload) and `readUpload` | 413 | `This file is too large (max 4 MB).` |
| Not a readable PDF | `readUpload` | 400 | `This file isn't a readable PDF.` (existing) |
| Encrypted PDF | `readUpload` | 400 | `This PDF is password-protected. Remove the password and try again.` (existing) |
| No text (scanned) | `readUpload` | 400 | `This PDF has no selectable text (it may be scanned).` (existing) |
| Indexing fails (embedding/DB) | index route | 500 | `Indexing failed. Try again.` |
| A response that isn't JSON | Library | — | `Upload failed` / `Indexing failed` (the existing fallbacks) |

## Decisions

- **4 MB.** It stays under Vercel's 4.5 MB request-body limit, so the same rule works locally and when deployed. The browser check is a courtesy that saves sending the file. `readUpload` is the authoritative check, because the API can be called directly.
- **The limit lives in `limits.ts`, not `upload.ts`.** `upload.ts` imports `pdf.ts` and so pulls in unpdf. Importing the constant from there into a client component could bundle unpdf into the browser.
- **The client rolls back.** Upload and index are separate requests, and index is re-runnable. If the index route deleted the document on failure, a failed re-index of an existing note would destroy it. So only Library, which knows it just created the document, deletes it. The rollback is best-effort: if the DELETE also fails, the index error is still the one shown.
- **The index route returns a generic message.** The real error (an OpenAI or database failure) goes to the server log with the `console.log` tracing. The UI gets a short, safe message.
- **No new dependencies.**

## Context

- Next.js 16 route handlers: `params` is a `Promise` (see the existing `[id]/index/route.ts`). Check `node_modules/next/dist/docs/` before adding the new route.
- Prisma 8: delete with `db.orm.public.Document.where({ id }).deleteAll()`, the same pattern the index route uses for chunks. `Chunk.document` has `onDelete: Cascade`.
- The amber error style from `Ask.tsx`: `role="alert"` with `m-0 font-mono text-sm text-[#FFB86B]`. Library uses `text-xs`.
- Keep the `console.log("[fn] - …")` tracing in the new and changed code.
- Vitest can't resolve `@/`, so `limits.ts` and `upload.ts` use relative imports.
- Docs to touch: the README intro, the flow diagram, the path table (add `pdf.ts`, `upload.ts`, `context.ts`, `limits.ts`), the API table (PDF, the limit, `DELETE`), and the scripts line for tests. AGENTS.md: the PDF pipeline (unpdf, `PAGE_SEPARATOR`, `page`), the page-citation invariant, and the size limit.
