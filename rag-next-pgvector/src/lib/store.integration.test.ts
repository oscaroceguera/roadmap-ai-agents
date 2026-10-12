// Runs the real SQL against a Postgres with db/init.sql applied. Skipped
// unless TEST_DATABASE_URL is set; it deletes every document it creates.
//   TEST_DATABASE_URL=postgres://… pnpm test store.integration
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { parseValidDocument, type ValidDocument } from "./documents";
import { contratoCompleto, facturaCompleta } from "@/test/fixtures";

vi.mock("server-only", () => ({}));

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("store (Postgres real)", { timeout: 60_000 }, () => {
  let store: typeof import("./store");
  let sql: typeof import("./db").sql;
  const created: string[] = [];

  const valid = (doc: unknown) => parseValidDocument(doc) as ValidDocument;
  const embedding = (seed: number) => Array.from({ length: 1536 }, (_, i) => (i === seed ? 1 : 0));

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    store = await import("./store");
    ({ sql } = await import("./db"));
  });

  afterAll(async () => {
    if (created.length) await sql`DELETE FROM documents WHERE id IN ${sql(created)}`;
    await sql?.end();
  });

  async function newDocument(text: string) {
    const id = await store.insertDocument({
      name: "test.pdf",
      mimeType: "application/pdf",
      size: 4,
      content: Buffer.from("%PDF"),
    });
    created.push(id);
    await store.saveDocumentText(id, text);
    return id;
  }

  it("guarda el texto transcrito", async () => {
    const id = await newDocument("Texto de prueba");
    expect(await store.getDocumentText(id)).toBe("Texto de prueba");
    expect(await store.getDocumentText("0")).toBeNull();
  });

  it("factura: datos en invoices, conceptos en line_items y fragmentos con embedding", async () => {
    const id = await newDocument("FACTURA A-1187");

    await store.saveConfirmedDocument(id, valid(facturaCompleta), [
      { content: "FACTURA A-1187", embedding: embedding(0) },
    ]);

    const [invoice] = await sql`SELECT folio, fecha_emision::text, total::float FROM invoices WHERE document_id = ${id}`;
    expect(invoice).toEqual({ folio: "A-1187", fecha_emision: "2026-09-15", total: 3480 });
    const items = await sql`SELECT descripcion FROM line_items WHERE document_id = ${id}`;
    expect(items.map((r) => r.descripcion)).toEqual(["Consultoría"]);
    const [chunk] = await sql`
      SELECT content, vector_dims(embedding) AS dims,
             embedding <=> ${JSON.stringify(embedding(0))}::vector AS distance
      FROM document_chunks WHERE document_id = ${id}`;
    expect(chunk).toMatchObject({ content: "FACTURA A-1187", dims: 1536, distance: 0 });
  });

  it("confirmar de nuevo como otro tipo reemplaza los datos anteriores", async () => {
    const id = await newDocument("CONTRATO");
    await store.saveConfirmedDocument(id, valid(facturaCompleta), [
      { content: "uno", embedding: embedding(1) },
      { content: "dos", embedding: embedding(2) },
    ]);

    await store.saveConfirmedDocument(id, valid(contratoCompleto), [
      { content: "contrato", embedding: embedding(3) },
    ]);

    const counts = await sql`
      SELECT
        (SELECT count(*) FROM invoices WHERE document_id = ${id})::int AS invoices,
        (SELECT count(*) FROM line_items WHERE document_id = ${id})::int AS line_items,
        (SELECT count(*) FROM contracts WHERE document_id = ${id})::int AS contracts,
        (SELECT count(*) FROM contract_parties WHERE document_id = ${id})::int AS parties,
        (SELECT count(*) FROM document_chunks WHERE document_id = ${id})::int AS chunks`;
    expect(counts[0]).toEqual({ invoices: 0, line_items: 0, contracts: 1, parties: 2, chunks: 1 });
    const [contract] = await sql`SELECT clausulas_clave FROM contracts WHERE document_id = ${id}`;
    expect(contract.clausulas_clave).toEqual(["Depósito de un mes de renta"]);
  });

  it("la lista muestra los confirmados con sus datos clave", async () => {
    const id = await newDocument("FACTURA");
    await store.saveConfirmedDocument(id, valid(facturaCompleta), []);
    const unconfirmed = await newDocument("sin confirmar");

    const list = await store.listSavedDocuments();

    expect(list.find((d) => d.id === id)).toMatchObject({
      tipo: "factura",
      referencia: "A-1187",
      contraparte: "Servicios Norte SA de CV",
      fecha: "2026-09-15",
      importe: "3480.00",
      moneda: "MXN",
      fragmentos: 0,
    });
    expect(list.some((d) => d.id === unconfirmed)).toBe(false);
  });

  it("searchChunks: ordena por similitud y sólo busca en documentos confirmados", async () => {
    const id = await newDocument("FACTURA");
    await store.saveConfirmedDocument(id, valid(facturaCompleta), [
      { content: "lejano", embedding: embedding(10) },
      { content: "cercano", embedding: embedding(11) },
    ]);
    const borrador = await newDocument("borrador");
    await sql`INSERT INTO document_chunks ${sql({
      document_id: borrador,
      position: 0,
      content: "sin confirmar",
      embedding: JSON.stringify(embedding(11)),
    })}`;

    const near = embedding(11).map((v, i) => (i === 10 ? 0.5 : v));
    const matches = (await store.searchChunks(near, 50)).filter((m) =>
      [id, borrador].includes(m.document_id),
    );

    expect(matches.map((m) => m.content)).toEqual(["cercano", "lejano"]);
    expect(matches[0]).toMatchObject({
      document_id: id,
      tipo: "factura",
      referencia: "A-1187",
      name: "test.pdf",
    });
    expect(matches[0].similarity).toBeGreaterThan(matches[1].similarity);
  });
});

