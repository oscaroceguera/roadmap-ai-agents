-- Idempotent: safe to run again on an existing database to bring it up to date.

CREATE EXTENSION IF NOT EXISTS vector;

-- Every uploaded file. Structured data and chunks are written on confirm.
CREATE TABLE IF NOT EXISTS documents (
  id          bigserial PRIMARY KEY,
  name        text        NOT NULL,
  mime_type   text        NOT NULL,
  size_bytes  integer     NOT NULL,
  content     bytea       NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Full text transcribed by the vision model at upload time.
ALTER TABLE documents ADD COLUMN IF NOT EXISTS text text;
-- Set when the user confirms the extracted data.
ALTER TABLE documents ADD COLUMN IF NOT EXISTS doc_type text
  CHECK (doc_type IN ('factura', 'recibo', 'contrato', 'otro'));
ALTER TABLE documents ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
-- Superseded by document_chunks (one embedding per chunk, not per file).
ALTER TABLE documents DROP COLUMN IF EXISTS embedding;

CREATE TABLE IF NOT EXISTS invoices (
  document_id                    bigint PRIMARY KEY REFERENCES documents ON DELETE CASCADE,
  folio                          text          NOT NULL,
  fecha_emision                  date          NOT NULL,
  fecha_vencimiento              date,
  emisor_nombre                  text          NOT NULL,
  emisor_identificacion_fiscal   text          NOT NULL,
  emisor_direccion               text,
  receptor_nombre                text          NOT NULL,
  receptor_identificacion_fiscal text,
  receptor_direccion             text,
  moneda                         char(3)       NOT NULL,
  subtotal                       numeric(14,2) NOT NULL,
  impuestos                      numeric(14,2) NOT NULL,
  total                          numeric(14,2) NOT NULL
);

-- Invoices from other countries (e.g. the US) may lack a tax ID or tax line.
ALTER TABLE invoices ALTER COLUMN emisor_identificacion_fiscal DROP NOT NULL;
ALTER TABLE invoices ALTER COLUMN subtotal DROP NOT NULL;
ALTER TABLE invoices ALTER COLUMN impuestos DROP NOT NULL;

CREATE TABLE IF NOT EXISTS receipts (
  document_id                    bigint PRIMARY KEY REFERENCES documents ON DELETE CASCADE,
  folio                          text,
  fecha                          date          NOT NULL,
  comercio_nombre                text          NOT NULL,
  comercio_identificacion_fiscal text,
  comercio_direccion             text,
  metodo_pago                    text,
  moneda                         char(3)       NOT NULL,
  subtotal                       numeric(14,2),
  impuestos                      numeric(14,2),
  total                          numeric(14,2) NOT NULL
);

-- Concepts of invoices and receipts.
CREATE TABLE IF NOT EXISTS line_items (
  document_id     bigint  NOT NULL REFERENCES documents ON DELETE CASCADE,
  position        integer NOT NULL,
  descripcion     text,
  cantidad        numeric(14,4),
  precio_unitario numeric(14,2),
  importe         numeric(14,2),
  PRIMARY KEY (document_id, position)
);

CREATE TABLE IF NOT EXISTS contracts (
  document_id     bigint PRIMARY KEY REFERENCES documents ON DELETE CASCADE,
  titulo          text NOT NULL,
  fecha_firma     date NOT NULL,
  vigencia_inicio date,
  vigencia_fin    date,
  objeto          text NOT NULL,
  monto           numeric(14,2),
  moneda          char(3),
  clausulas_clave text[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS contract_parties (
  document_id           bigint  NOT NULL REFERENCES documents ON DELETE CASCADE,
  position              integer NOT NULL,
  nombre                text    NOT NULL,
  rol                   text,
  identificacion_fiscal text,
  direccion             text,
  PRIMARY KEY (document_id, position)
);

CREATE TABLE IF NOT EXISTS other_documents (
  document_id bigint PRIMARY KEY REFERENCES documents ON DELETE CASCADE,
  descripcion text NOT NULL
);

-- Document text split into chunks, embedded with text-embedding-3-small.
CREATE TABLE IF NOT EXISTS document_chunks (
  document_id bigint  NOT NULL REFERENCES documents ON DELETE CASCADE,
  position    integer NOT NULL,
  content     text    NOT NULL,
  embedding   vector(1536) NOT NULL,
  PRIMARY KEY (document_id, position)
);

CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
  ON document_chunks USING hnsw (embedding vector_cosine_ops);
