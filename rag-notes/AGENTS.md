<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project

RAG over uploaded notes (`.md`, `.txt`, and text-based `.pdf`): upload → chunk → embed → pgvector retrieve → grounded answer. The pipeline lives in `src/lib/` and the routes in `src/app/api/`. See `README.md` for the flow and the API table.

This is a step-by-step learning project. The `console.log("[fn] - …")` tracing in every function is deliberate, so match it in new code.

## Prisma 8 (not Prisma Client)

This repo uses Prisma ORM 8 release candidates, which are contract-based. Read `prisma-8.md` before touching data access.

- The schema is `src/prisma/contract.prisma`. After editing it, run `pnpm contract:emit` and commit the regenerated `contract.json` and `contract.d.ts`.
- Query through `db` from `@/prisma/db`. Use `db.orm.public.<Model>` for CRUD and `db.sql.public.<Model>…build()` + `db.runtime().query(plan)` for pgvector expressions (see `src/lib/retrieve.ts`). Use `db.transaction(async (tx) => …)` for multi-step writes.
- Keep `temporal-polyfill/global` imported in `db.ts`, because Prisma's DateTime codecs need `Temporal` and Node 24 does not provide it.

## PDFs

- `src/lib/pdf.ts` is the only code that touches `unpdf`. `readUpload` (`src/lib/upload.ts`) turns `PdfError` codes into user-facing messages and stores a PDF's pages joined by `PAGE_SEPARATOR` (`\f`, from `src/lib/chunk.ts`), blank pages included as empty segments.
- `chunkDocument()` detects a PDF by its `.pdf` name (case-insensitive), not by the separator, because a one-page PDF has none.
- Text PDFs only: no OCR, and encrypted or textless PDFs are rejected at upload.

## Invariants

- The `Embedding = pgvector.Vector(1536)` type in the contract must match `EMBEDDING_MODEL` in `src/lib/embed.ts`. If you change the model, change the dimension, add a migration, and re-index every document.
- Indexing a document replaces all of its chunks inside one transaction, so re-running it must stay idempotent.
- A PDF chunk never spans two pages, and `Chunk.page` is its 1-based page. `.md`/`.txt` chunks have `page: null`. `sourceLabel()` in `src/lib/context.ts` turns that into `name p.N` for the model context, and the Ask UI shows `· p.N`.
- Uploads are capped at `MAX_UPLOAD_BYTES` (4 MB, in `src/lib/limits.ts`, under Vercel's 4.5 MB body limit). `readUpload` enforces it with a `413`, and the Library checks it before sending. Keep `limits.ts` free of dependencies so the client can import it.
- A failed upload or index leaves no document behind: upload errors happen before the row is created, and the Library calls `DELETE /api/documents/:id` when indexing a new document fails. The index route itself never deletes a document, so a failed re-index keeps the old one.
- `answer()` must stay grounded: context-only, numbered `[n]` citations, and the exact fallback "I couldn't find that in your notes." for both empty retrieval and a missing answer.

## Environment

`.env` needs `DATABASE_URL` (Postgres ≥ 15 with pgvector) and `OPENAI_API_KEY`. `.env.example` only lists the first one.

## Verify

Run `pnpm vitest run` for the `src/lib` tests (chunking, PDF, upload, context), `pnpm lint`, and `pnpm build`. There is no `test` script.
