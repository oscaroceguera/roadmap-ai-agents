# rag-next-pgvector

Next.js + PostgreSQL con [pgvector](https://github.com/pgvector/pgvector). Una sola página para subir imágenes o PDFs, extraer sus datos con un LLM con visión (factura, recibo o contrato), revisarlos y, al confirmar, guardarlos en tablas por tipo junto con el texto del documento como embeddings en pgvector. Un chat responde preguntas con búsqueda semántica sobre esos embeddings y cita el documento de origen; las preguntas de cálculos o totales se responden con una consulta SQL sobre las tablas.

## Requisitos

- Node 22+ y pnpm
- Un Postgres con la extensión `vector` (p. ej. Neon)

## Arranque

```bash
cp .env.example .env.local    # pon DATABASE_URL y OPENAI_API_KEY
psql "$DATABASE_URL" -f db/init.sql   # crea/actualiza el esquema (idempotente)
pnpm install
pnpm dev                      # http://localhost:3000
pnpm test                     # Vitest: validación, troceado, Server Actions, chat y UI
TEST_DATABASE_URL="$DATABASE_URL" pnpm test store.integration   # SQL real (crea y borra sus filas)
```

## Estructura

- `db/init.sql` — esquema idempotente: `documents` (archivo, texto transcrito, tipo, `confirmed_at`), una tabla por tipo (`invoices`, `receipts`, `contracts`, `other_documents`), `line_items`, `contract_parties` y `document_chunks` (`embedding vector(1536)` con índice HNSW).
- `src/app/uploader.tsx` — zona de arrastrar/soltar y vista previa (imagen o PDF en `iframe`).
- `src/app/actions.ts` — `uploadDocument` valida tipo y tamaño (≤ 10 MB), guarda el archivo, extrae datos y texto; `confirmDocument` revalida los datos, trocea el texto, genera embeddings y lo guarda todo.
- `src/app/saved-documents.tsx` — lista de documentos confirmados.
- `src/app/api/chat/route.ts` — chat: primero `planSqlQuery` decide si la pregunta es un cálculo o total; si lo es, ejecuta la consulta SQL que escribió el LLM (sólo lectura) y responde con su resultado. Si no, o si la consulta falla, RAG: genera el embedding de la última pregunta, busca los fragmentos más cercanos (coseno) de documentos confirmados, los agrupa por documento y los numera `[1]`, `[2]`… El LLM responde sólo con ese contexto y cita cada dato; las fuentes viajan como partes `source-document`. Sin fragmentos relevantes responde que no hay información, sin llamar al LLM.
- `src/app/chat.tsx` — UI con `useChat`: las citas `[n]` enlazan a la lista de fuentes de cada respuesta.
- `src/lib/rag.ts` — `TOP_K`, umbral `MIN_SIMILARITY` (0.3, medido con preguntas reales), agrupación de fuentes, prompt y parseo de citas.
- `src/lib/sql-chat.ts` — esquema que ve el LLM y `planSqlQuery`, que devuelve un `SELECT` o `null`.
- `src/lib/store.ts` — todo el SQL. `runReadOnlyQuery` ejecuta el SQL del LLM en una transacción de sólo lectura, con timeout de 5 s, protocolo extendido (rechaza varias sentencias) y como subconsulta con `LIMIT`. Confirmar es una transacción que reemplaza lo guardado antes para ese documento.
- `src/lib/chunk.ts`, `src/lib/embeddings.ts`, `src/lib/models.ts` — troceado del texto, embeddings con `text-embedding-3-small` y modelos usados.
- `src/lib/documents.ts` — esquemas Zod por tipo de documento: el *draft* que devuelve el LLM (todo `nullable`) y el válido, con campos obligatorios (el ID fiscal del emisor, subtotal e impuestos son opcionales para aceptar facturas de otros países, p. ej. EE. UU.), fechas `AAAA-MM-DD`, orden de fechas y `subtotal + impuestos = total`.
- `src/lib/extract.ts` — envía el archivo a OpenAI (`OPENAI_MODEL`, por defecto `gpt-5.6-luna`) con el esquema *draft*: clasifica el documento, devuelve sus datos y transcribe su texto.
- `src/app/document-form.tsx` — datos extraídos editables junto al documento; los campos inválidos se marcan en rojo y se revalidan al editar.
