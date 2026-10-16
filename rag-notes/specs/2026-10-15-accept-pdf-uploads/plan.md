# Phase 3: Accept PDF uploads — Plan

## 1. Upload helper tests (`src/lib/upload.test.ts`), written first

Build `File` objects with `new File([bytes], name)`, reading the bytes from `src/lib/__fixtures__/`.

1.1. `.md` and `.txt`: `content` equals the file text exactly; `name` is kept.
1.2. Uppercase extension (`NOTES.PDF`, `a.TXT`) is accepted.
1.3. `multi.pdf`: `content.split(PAGE_SEPARATOR)` has length 3; segment 0 contains "apples", segment 1 is `""`, and segment 2 contains "bananas".
1.4. `single.pdf`: content contains "# Sourdough notes" and no `\f` when there is only one page.
1.5. `chunkText(content)` for `multi.pdf` has no chunk containing `\f`.
1.6. `notes.docx` rejects with `UploadError` status 400 and `Only .md, .txt or .pdf files.`
1.7. `blank.pdf`, `encrypted.pdf`, and a fake `bad.pdf` (random bytes) each reject with `UploadError` status 400 and the exact message from `requirements.md`.

## 2. Upload helper (`src/lib/upload.ts`)

2.1. Export `PAGE_SEPARATOR = "\n\f\n"` and `UploadError` (`status`, `message`).
2.2. `readUpload(file)`:
  - Check the extension; reject unsupported files.
  - `.md`/`.txt`: return `{ name, content: await file.text() }`.
  - `.pdf`: call `extractPdf(await file.arrayBuffer())`, build `totalPages` segments (empty for missing pages), and join them with `PAGE_SEPARATOR`.
  - Map `PdfError` codes to `UploadError` messages; rethrow anything else.
2.3. Add `[readUpload]` tracing.

## 3. Route (`src/app/api/documents/route.ts`)

3.1. Keep the `No file` check.
3.2. Replace the extension check and `file.text()` with `readUpload(file)`. Catch `UploadError` → `Response.json({ error: err.message }, { status: err.status })`; rethrow other errors.
3.3. Create the Document from `{ name, content }`. The response shape is unchanged.

## 4. Roadmap

4.1. Tick the Phase 3 items in `specs/roadmap.md` after validation.
