import "server-only";
import { sql } from "./db";
import type { ValidDocument } from "./documents";

export async function insertDocument(file: {
  name: string;
  mimeType: string;
  size: number;
  content: Buffer;
}): Promise<string> {
  const [row] = await sql<{ id: string }[]>`
    INSERT INTO documents (name, mime_type, size_bytes, content)
    VALUES (${file.name}, ${file.mimeType}, ${file.size}, ${file.content})
    RETURNING id
  `;
  return row.id;
}

export async function saveDocumentText(id: string, text: string): Promise<void> {
  await sql`UPDATE documents SET text = ${text} WHERE id = ${id}`;
}

/** The transcribed text, "" if none, or null when the document doesn't exist. */
export async function getDocumentText(id: string): Promise<string | null> {
  const [row] = await sql<{ text: string | null }[]>`
    SELECT text FROM documents WHERE id = ${id}
  `;
  return row ? (row.text ?? "") : null;
}

export type Chunk = { content: string; embedding: number[] };

/**
 * Stores the confirmed structured data and text chunks. Replaces whatever a
 * previous confirmation stored, so confirming again (even as another type)
 * leaves exactly one consistent version.
 */
export async function saveConfirmedDocument(
  id: string,
  doc: ValidDocument,
  chunks: Chunk[],
): Promise<void> {
  await sql.begin(async (tx) => {
    for (const table of [
      "invoices",
      "receipts",
      "line_items",
      "contracts",
      "contract_parties",
      "other_documents",
      "document_chunks",
    ]) {
      await tx`DELETE FROM ${tx(table)} WHERE document_id = ${id}`;
    }

    await tx`
      UPDATE documents SET doc_type = ${doc.tipo}, confirmed_at = now()
      WHERE id = ${id}
    `;

    switch (doc.tipo) {
      case "factura":
        await tx`INSERT INTO invoices ${tx({
          document_id: id,
          folio: doc.folio,
          fecha_emision: doc.fecha_emision,
          fecha_vencimiento: doc.fecha_vencimiento,
          emisor_nombre: doc.emisor.nombre,
          emisor_identificacion_fiscal: doc.emisor.identificacion_fiscal,
          emisor_direccion: doc.emisor.direccion,
          receptor_nombre: doc.receptor.nombre,
          receptor_identificacion_fiscal: doc.receptor.identificacion_fiscal,
          receptor_direccion: doc.receptor.direccion,
          moneda: doc.moneda,
          subtotal: doc.subtotal,
          impuestos: doc.impuestos,
          total: doc.total,
        })}`;
        break;
      case "recibo":
        await tx`INSERT INTO receipts ${tx({
          document_id: id,
          folio: doc.folio,
          fecha: doc.fecha,
          comercio_nombre: doc.comercio.nombre,
          comercio_identificacion_fiscal: doc.comercio.identificacion_fiscal,
          comercio_direccion: doc.comercio.direccion,
          metodo_pago: doc.metodo_pago,
          moneda: doc.moneda,
          subtotal: doc.subtotal,
          impuestos: doc.impuestos,
          total: doc.total,
        })}`;
        break;
      case "contrato":
        await tx`INSERT INTO contracts ${tx({
          document_id: id,
          titulo: doc.titulo,
          fecha_firma: doc.fecha_firma,
          vigencia_inicio: doc.vigencia_inicio,
          vigencia_fin: doc.vigencia_fin,
          objeto: doc.objeto,
          monto: doc.monto,
          moneda: doc.moneda,
          clausulas_clave: doc.clausulas_clave,
        })}`;
        await tx`INSERT INTO contract_parties ${tx(
          doc.partes.map((p, position) => ({ document_id: id, position, ...p })),
        )}`;
        break;
      case "otro":
        await tx`INSERT INTO other_documents ${tx({
          document_id: id,
          descripcion: doc.descripcion,
        })}`;
        break;
    }

    if ((doc.tipo === "factura" || doc.tipo === "recibo") && doc.conceptos.length) {
      await tx`INSERT INTO line_items ${tx(
        doc.conceptos.map((c, position) => ({ document_id: id, position, ...c })),
      )}`;
    }

    if (chunks.length) {
      await tx`INSERT INTO document_chunks ${tx(
        chunks.map((c, position) => ({
          document_id: id,
          position,
          content: c.content,
          embedding: JSON.stringify(c.embedding),
        })),
      )}`;
    }
  });
}

export type SavedDocument = {
  id: string;
  name: string;
  tipo: ValidDocument["tipo"];
  referencia: string | null;
  contraparte: string | null;
  fecha: string | null;
  importe: string | null;
  moneda: string | null;
  fragmentos: number;
  confirmed_at: Date;
};

export async function listSavedDocuments(): Promise<SavedDocument[]> {
  return sql<SavedDocument[]>`
    SELECT
      d.id,
      d.name,
      d.doc_type AS tipo,
      COALESCE(i.folio, r.folio, c.titulo, o.descripcion) AS referencia,
      COALESCE(
        i.emisor_nombre,
        r.comercio_nombre,
        (SELECT string_agg(p.nombre, ', ' ORDER BY p.position)
           FROM contract_parties p WHERE p.document_id = d.id)
      ) AS contraparte,
      COALESCE(i.fecha_emision, r.fecha, c.fecha_firma)::text AS fecha,
      COALESCE(i.total, r.total, c.monto)::text AS importe,
      COALESCE(i.moneda, r.moneda, c.moneda) AS moneda,
      (SELECT count(*) FROM document_chunks k WHERE k.document_id = d.id)::int
        AS fragmentos,
      d.confirmed_at
    FROM documents d
    LEFT JOIN invoices i ON i.document_id = d.id
    LEFT JOIN receipts r ON r.document_id = d.id
    LEFT JOIN contracts c ON c.document_id = d.id
    LEFT JOIN other_documents o ON o.document_id = d.id
    WHERE d.confirmed_at IS NOT NULL
    ORDER BY d.confirmed_at DESC
    LIMIT 100
  `;
}

export type ChunkMatch = {
  document_id: string;
  name: string;
  mime_type: string;
  tipo: ValidDocument["tipo"];
  referencia: string | null;
  content: string;
  similarity: number;
};

/** Nearest chunks of confirmed documents by cosine similarity. */
export async function searchChunks(
  embedding: number[],
  limit: number,
): Promise<ChunkMatch[]> {
  const query = JSON.stringify(embedding);
  return sql<ChunkMatch[]>`
    SELECT
      c.document_id,
      d.name,
      d.mime_type,
      d.doc_type AS tipo,
      COALESCE(i.folio, r.folio, k.titulo, o.descripcion) AS referencia,
      c.content,
      1 - (c.embedding <=> ${query}::vector) AS similarity
    FROM document_chunks c
    JOIN documents d ON d.id = c.document_id
    LEFT JOIN invoices i ON i.document_id = d.id
    LEFT JOIN receipts r ON r.document_id = d.id
    LEFT JOIN contracts k ON k.document_id = d.id
    LEFT JOIN other_documents o ON o.document_id = d.id
    WHERE d.confirmed_at IS NOT NULL
    ORDER BY c.embedding <=> ${query}::vector
    LIMIT ${limit}
  `;
}

/** Rows returned to the model; one extra row tells it the result was cut. */
export const MAX_QUERY_ROWS = 100;

/**
 * Runs a model-written SELECT. The query is untrusted, so it runs in a
 * read-only transaction with a timeout, through the extended protocol (which
 * rejects multiple statements) and wrapped as a subquery (only a single query
 * expression fits there).
 */
export async function runReadOnlyQuery(
  query: string,
): Promise<Record<string, unknown>[]> {
  const select = query.trim().replace(/;\s*$/, "");
  return sql.begin("read only", async (tx) => {
    await tx`SET LOCAL statement_timeout = '5s'`;
    // The bound LIMIT parameter is what forces the extended protocol.
    return tx<Record<string, unknown>[]>`
      SELECT * FROM (${tx.unsafe(select)}) AS q LIMIT ${MAX_QUERY_ROWS + 1}
    `;
  });
}
