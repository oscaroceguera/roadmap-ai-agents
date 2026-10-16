# Roadmap

## Phase 1: Text RAG baseline (done)
- [x] Project setup: Next.js, Prisma 8, pgvector
- [x] Upload `.md`/`.txt` and store the original text
- [x] Split documents into chunks (`chunkText` + tests)
- [x] Generate embeddings and store them per chunk
- [x] Retrieve the most similar chunks (`/api/search`)
- [x] Answer grounded questions with citations (`/api/ask`) + Library/Ask UI

## Phase 2: PDF text extraction
- [ ] Choose and add the extraction library (record the choice in the phase spec)
- [ ] `src/lib/pdf.ts`: extract text per page from a PDF buffer
- [ ] Vitest tests with small fixture PDFs (single page, multi-page, no text)

## Phase 3: Accept PDF uploads
- [ ] `POST /api/documents` accepts `.pdf`, extracts the text, and stores it as the document `content`
- [ ] Reject PDFs with no extractable text, or encrypted PDFs, with a 400 and a clear message
- [ ] Existing `.md`/`.txt` uploads are unchanged; the index flow works on the stored text

## Phase 4: Page-aware chunks
- [ ] Add a nullable `page` to `Chunk` in the contract, emit, and add a migration
- [ ] Chunk PDFs page by page so each chunk records its page; `.md`/`.txt` chunks keep `page` empty
- [ ] Return `page` from `retrieve()` and `/api/search`
- [ ] Tests for page-aware chunking

## Phase 5: Page citations in answers
- [ ] `buildContext` labels PDF sources as `name p.N`
- [ ] The Ask UI shows the page for PDF sources
- [ ] Manually check: ask about a known page and confirm the citation matches

## Phase 6: UI and error handling
- [ ] The Library file input accepts `.pdf`
- [ ] Set an upload size limit with a clear error
- [ ] Show upload/index errors (encrypted, empty, too large) in the UI
- [ ] Update README and AGENTS.md for PDF support
