# rag-next-pgvector

**Purpose:** Document intake plus chat. Upload invoices, receipts or contracts and query them. (README in Spanish.)

**What it does**
- Upload images or PDFs; a vision LLM extracts structured data for human review.
- Confirmed documents are stored in typed tables plus pgvector embeddings (`db/`).
- Chat answers via cited semantic search, or via a read-only LLM-written SQL query for totals and aggregates.

**Stack:** Next.js, Postgres + pgvector, AI SDK, Vitest.

**Run:** see project README (needs `DATABASE_URL` with the `vector` extension, `OPENAI_API_KEY`; copy `.env.example`), then `pnpm dev`.
