# Mission

## Problem

Notes are often stored as PDFs (papers, exported docs, slides), but rag-notes can only ingest `.md` and `.txt` files. Questions about those PDFs cannot be answered or cited.

## Target users

The project author, learning how RAG works by building it step by step and asking grounded questions about their own notes.

## Goals

- Upload a text-based PDF and index it through the same chunk → embed → retrieve → answer pipeline as `.md`/`.txt` files.
- Cite PDF sources with page numbers, so an answer points to where the text came from.
- Keep each step small and readable, because the codebase is a learning artifact.

## Non-goals

- OCR for scanned or image-only PDFs.
- Layout fidelity: tables, columns, images, and formulas are treated as plain text or skipped.
- Other formats such as `.docx` or HTML.
- Multi-user support, auth, or storing original PDF files.

## Success criteria

- A text-based PDF uploaded from the Library UI is indexed with no manual steps.
- `/api/ask` answers questions about it and cites `[n]` sources that show the document name and page.
- Existing `.md`/`.txt` behavior is unchanged, and the current tests still pass.
- Unsupported PDFs (encrypted, no extractable text, too large) are rejected with a clear message and leave no partial data.
