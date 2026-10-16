# rag-notes

Ask questions about your own notes. Upload `.md`, `.txt` or text-based `.pdf` files (up to 4 MB), and the app chunks and embeds them into Postgres (pgvector). It answers questions using only the matching chunks and cites its sources, with page numbers for PDFs.

Built step by step as a RAG learning project: setup → upload → chunking → embeddings → retrieval → grounded answers.

## How it works

```
upload (.md/.txt/.pdf, ≤ 4 MB)
  readUpload() ─► text as is; PDFs via unpdf, pages joined with PAGE_SEPARATOR (\f)
        │          (encrypted, image-only, or too-large files are rejected here)
        ▼
Document row (text)
        │
        ▼
POST /api/documents/:id/index
  chunkDocument() ─► .md/.txt: chunkText(), page null
                     .pdf: chunked per page, each chunk keeps its 1-based page
  embedMany()  ─► OpenAI text-embedding-3-small (1536 dims)
  replace the document's Chunk rows in one transaction
        │
        ▼
POST /api/ask
  retrieve()   ─► embed question, top 5 chunks by cosine distance, similarity ≥ 0.3
  answer()     ─► gpt-4o-mini, temperature 0, context-only, cites [n]
                  (PDF sources are labeled "name p.N")
```

| Path | Role |
|---|---|
| `src/lib/upload.ts` | Validates an upload (extension, size) and reads its text; PDFs go through `pdf.ts` |
| `src/lib/pdf.ts` | Extracts and normalizes text per page with unpdf; maps failures to `invalid` / `encrypted` / `no-text` |
| `src/lib/limits.ts` | `MAX_UPLOAD_BYTES` (4 MB), shared by the API and the Library UI |
| `src/lib/chunk.ts` | `chunkText()` splits on blank lines and headings with overlap; `chunkDocument()` adds per-page chunking for PDFs |
| `src/lib/embed.ts` | Batched embeddings (100 per request) + `cosine()` helper |
| `src/lib/retrieve.ts` | pgvector similarity search, joins document names |
| `src/lib/context.ts` | `sourceLabel()` and `buildContext()`: the numbered context, with `p.N` for PDF sources |
| `src/lib/answer.ts` | Calls the chat model with that context |
| `src/prisma/contract.prisma` | Data model: `Document` 1─n `Chunk` (with `vector(1536)` embedding and a nullable `page`) |
| `src/app/components/` | `Library` (upload + auto-index) and `Ask` (Q&A) UI |

### API

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/documents` | List documents with chunk counts |
| `POST` | `/api/documents` | Upload a file (`multipart/form-data`, field `file`; `.md`/`.txt`/`.pdf`, ≤ 4 MB). `400` for an unsupported or unreadable file, `413` when too large |
| `DELETE` | `/api/documents/:id` | Delete a document and its chunks (the UI uses it to roll back a failed index) |
| `GET` | `/api/documents/:id/chunks?maxChars=1000` | Preview chunking without embedding |
| `POST` | `/api/documents/:id/index` | Chunk, embed, and store (re-indexing replaces old chunks). `500` with `{ error }` on failure |
| `GET` | `/api/search?q=…` | Top 5 chunks with similarity scores and `page`, no LLM |
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
pnpm vitest run                # unit tests (chunking, PDF extraction, uploads, context)
pnpm contract:emit             # regenerate contract.json / contract.d.ts after editing contract.prisma
pnpm tsx scripts/similarity.mts  # sanity-check embeddings: related vs unrelated cosine scores
```

## PDF support

- Text-based PDFs only. Scanned or image-only PDFs are rejected ("no selectable text"), because there is no OCR.
- Password-protected PDFs are rejected. Remove the password first.
- Layout isn't preserved: tables, columns and images are read as plain text or skipped.
- Each chunk stays within one page, so answers cite `name p.N`.
- If indexing fails after upload, the Library deletes the new document, so no half-indexed note is left behind.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind 4 · unpdf · Prisma ORM 8 (release candidate, contract-based) with pgvector · OpenAI SDK · Vitest.

Prisma 8 differs from Prisma 5/6. See [`prisma-8.md`](prisma-8.md) for the contract workflow and CLI.
