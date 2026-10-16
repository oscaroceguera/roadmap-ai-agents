# Tech Stack

## Languages & frameworks

- TypeScript, Node 24 (`.nvmrc`), pnpm
- Next.js 16 App Router (route handlers in `src/app/api/`), React 19, Tailwind 4

## Key libraries & tools

- **Prisma ORM 8 (RC, contract-based)** + `@prisma/orm-extension-pgvector` on PostgreSQL ≥ 15. Schema in `src/prisma/contract.prisma`; see `prisma-8.md`.
- **OpenAI SDK**: `text-embedding-3-small` (1536 dims) for embeddings, `gpt-4o-mini` for answers.
- **Vitest** for unit tests (`pnpm vitest run`).
- **PDF text extraction (new)**: exactly one pure-JS library, such as `unpdf` or `pdfjs-dist`. The choice is made in the Phase 2 spec. It must run in Node route handlers and return text per page.

## Conventions & constraints

- PDF support adds only the one extraction library. Any other new dependency needs approval.
- Text PDFs only, with no OCR.
- PDF logic lives in `src/lib/` next to `chunk.ts` / `embed.ts`, as pure functions with Vitest tests. Route handlers stay thin.
- Keep the `console.log("[fn] - …")` tracing style used throughout the code.
- Schema changes go through `contract.prisma` → `pnpm contract:emit` → a committed migration. Re-indexing must replace a document's chunks in one transaction.
- Answers stay grounded: context-only, with `[n]` citations and the exact fallback "I couldn't find that in your notes."
