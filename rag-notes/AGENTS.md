<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project

RAG over uploaded notes: upload → chunk → embed → pgvector retrieve → grounded answer. The pipeline lives in `src/lib/` and the routes in `src/app/api/`. See `README.md` for the flow and the API table.

This is a step-by-step learning project. The `console.log("[fn] - …")` tracing in every function is deliberate, so match it in new code.

## Prisma 8 (not Prisma Client)

This repo uses Prisma ORM 8 release candidates, which are contract-based. Read `prisma-8.md` before touching data access.

- The schema is `src/prisma/contract.prisma`. After editing it, run `pnpm contract:emit` and commit the regenerated `contract.json` and `contract.d.ts`.
- Query through `db` from `@/prisma/db`. Use `db.orm.public.<Model>` for CRUD and `db.sql.public.<Model>…build()` + `db.runtime().query(plan)` for pgvector expressions (see `src/lib/retrieve.ts`). Use `db.transaction(async (tx) => …)` for multi-step writes.
- Keep `temporal-polyfill/global` imported in `db.ts`, because Prisma's DateTime codecs need `Temporal` and Node 24 does not provide it.

## Invariants

- The `Embedding = pgvector.Vector(1536)` type in the contract must match `EMBEDDING_MODEL` in `src/lib/embed.ts`. If you change the model, change the dimension, add a migration, and re-index every document.
- Indexing a document replaces all of its chunks inside one transaction, so re-running it must stay idempotent.
- `answer()` must stay grounded: context-only, numbered `[n]` citations, and the exact fallback "I couldn't find that in your notes." for both empty retrieval and a missing answer.

## Environment

`.env` needs `DATABASE_URL` (Postgres ≥ 15 with pgvector) and `OPENAI_API_KEY`. `.env.example` only lists the first one.

## Verify

Run `pnpm vitest run` for chunking tests, `pnpm lint`, and `pnpm build`. There is no `test` script.
