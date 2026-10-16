# rag-notes

Ask questions about your own notes. Upload `.md` or `.txt` files, and the app chunks and embeds them into Postgres (pgvector). It answers questions using only the matching chunks and cites its sources.

Built step by step as a RAG learning project: setup → upload → chunking → embeddings → retrieval → grounded answers.

## How it works

```
upload (.md/.txt) ──► Document row (original text)
        │
        ▼
POST /api/documents/:id/index
  chunkText()  ─► paragraph/heading-aware chunks (~1000 chars, 150 overlap)
  embedMany()  ─► OpenAI text-embedding-3-small (1536 dims)
  replace the document's Chunk rows in one transaction
        │
        ▼
POST /api/ask
  retrieve()   ─► embed question, top 5 chunks by cosine distance, similarity ≥ 0.3
  answer()     ─► gpt-4o-mini, temperature 0, context-only, cites [n]
```

| Path | Role |
|---|---|
| `src/lib/chunk.ts` | Splits text on blank lines and headings, merges into sized chunks with overlap |
| `src/lib/embed.ts` | Batched embeddings (100 per request) + `cosine()` helper |
| `src/lib/retrieve.ts` | pgvector similarity search, joins document names |
| `src/lib/answer.ts` | Builds the numbered context and calls the chat model |
| `src/prisma/contract.prisma` | Data model: `Document` 1─n `Chunk` (with `vector(1536)` embedding) |
| `src/app/components/` | `Library` (upload + auto-index) and `Ask` (Q&A) UI |

### API

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/documents` | List documents with chunk counts |
| `POST` | `/api/documents` | Upload a file (`multipart/form-data`, field `file`, `.md`/`.txt` only) |
| `GET` | `/api/documents/:id/chunks?maxChars=1000` | Preview chunking without embedding |
| `POST` | `/api/documents/:id/index` | Chunk, embed, and store (re-indexing replaces old chunks) |
| `GET` | `/api/search?q=…` | Top 5 chunks with similarity scores, no LLM |
| `POST` | `/api/ask` | `{ "question": "…" }` → `{ answer, sources }` |

## Getting started

Requirements: Node 24 (`.nvmrc`), pnpm, PostgreSQL ≥ 15 with the `vector` extension available, and an OpenAI API key.

```bash
pnpm install
cp .env.example .env    # set DATABASE_URL, and add OPENAI_API_KEY=sk-...
pnpm prisma db init     # create the tables (pgvector extension included)
pnpm dev                # http://localhost:3000
```

## Scripts

```bash
pnpm dev                       # dev server
pnpm build && pnpm start       # production build
pnpm lint                      # eslint
pnpm vitest                    # unit tests (src/lib/chunk.test.ts)
pnpm contract:emit             # regenerate contract.json / contract.d.ts after editing contract.prisma
pnpm tsx scripts/similarity.mts  # sanity-check embeddings: related vs unrelated cosine scores
```

## Stack

Next.js 16 (App Router) · React 19 · Tailwind 4 · Prisma ORM 8 (release candidate, contract-based) with pgvector · OpenAI SDK · Vitest.

Prisma 8 differs from Prisma 5/6. See [`prisma-8.md`](prisma-8.md) for the contract workflow and CLI.
