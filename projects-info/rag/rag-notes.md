# rag-notes

**Purpose:** Ask questions about your own `.md`, `.txt` and text-based `.pdf` notes.

**What it does**
- Chunks (page-aware for PDFs) and embeds notes into Postgres/pgvector via Prisma 8.
- Answers only from matching chunks and cites sources, including page numbers.
- Built feature by feature with dated specs in `specs/` (accept PDF uploads, PDF text extraction, page-aware chunks, page citations, UI error handling) plus `mission.md`, `tech-stack.md`, `roadmap.md`.
- `prisma-8.md` explains the Prisma 8 contract workflow vs 5/6.

**Stack:** Next.js, Prisma 8, Postgres + pgvector, AI SDK.

**Run:** needs `DATABASE_URL` and `OPENAI_API_KEY`; see the project README, then `pnpm dev`.
