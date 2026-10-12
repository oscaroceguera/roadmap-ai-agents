import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateDocument, type DocumentDraft } from "@/lib/documents";
import { MAX_FILE_BYTES } from "@/lib/upload";
import {
  contratoCompleto,
  documentoNoReconocido,
  facturaCompleta,
  pdfFile,
  reciboCompleto,
} from "@/test/fixtures";

// External boundaries of the actions: database, LLM, embeddings, Next cache.
const store = vi.hoisted(() => ({
  insertDocument: vi.fn(),
  saveDocumentText: vi.fn(),
  getDocumentText: vi.fn(),
  saveConfirmedDocument: vi.fn(),
}));
const { extractDocument, embedTexts, refresh } = vi.hoisted(() => ({
  extractDocument: vi.fn(),
  embedTexts: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("@/lib/store", () => store);
vi.mock("@/lib/extract", () => ({ extractDocument }));
vi.mock("@/lib/embeddings", () => ({ embedTexts }));
vi.mock("next/cache", () => ({ refresh }));

const { uploadDocument, confirmDocument } = await import("./actions");

function upload(file?: File) {
  const form = new FormData();
  if (file) form.set("file", file);
  return uploadDocument({ status: "idle" }, form);
}

const TEXT = "FACTURA A-1187\n\nServicios Norte SA de CV";

/** Mocks a successful extraction of `document` with the given text. */
function extracts(document: DocumentDraft, text = TEXT) {
  extractDocument.mockResolvedValue({ document, text });
}

beforeEach(() => {
  for (const fn of [...Object.values(store), extractDocument, embedTexts, refresh]) {
    fn.mockReset();
  }
  store.insertDocument.mockResolvedValue("42");
  store.getDocumentText.mockResolvedValue(TEXT);
  embedTexts.mockImplementation(async (values: string[]) => values.map(() => [0.1, 0.2]));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("archivos rechazados antes de guardar", () => {
  it.each([
    ["sin archivo", undefined, "Selecciona un archivo."],
    ["archivo vacío", new File([], "vacio.pdf", { type: "application/pdf" }), "Selecciona un archivo."],
    ["tipo no soportado", new File(["hola"], "notas.txt", { type: "text/plain" }), "Solo se aceptan imágenes o PDFs."],
    ["mayor a 10 MB", pdfFile("grande.pdf", MAX_FILE_BYTES + 1), "El archivo supera los 10 MB."],
  ])("%s", async (_, file, message) => {
    expect(await upload(file)).toEqual({ status: "error", message });
    expect(store.insertDocument).not.toHaveBeenCalled();
    expect(extractDocument).not.toHaveBeenCalled();
  });
});

describe("PDF subido y extraído", () => {
  it("factura completa: se guarda, se extrae y es válida", async () => {
    extracts(facturaCompleta);
    const file = pdfFile("factura.pdf");

    const state = await upload(file);

    expect(state).toEqual({
      status: "ok",
      id: "42",
      name: "factura.pdf",
      extracted: facturaCompleta,
    });
    expect(validateDocument(facturaCompleta)).toEqual({});
    // Saved with its metadata and the exact bytes, which are also sent to the LLM.
    const [saved] = store.insertDocument.mock.calls[0];
    expect(saved).toMatchObject({ name: "factura.pdf", mimeType: "application/pdf", size: file.size });
    expect(extractDocument).toHaveBeenCalledWith({
      data: saved.content,
      mediaType: "application/pdf",
      filename: "factura.pdf",
    });
    // The transcription stays server-side for the embedding step.
    expect(store.saveDocumentText).toHaveBeenCalledWith("42", TEXT);
  });

  it("factura incompleta: se devuelve tal cual y la validación señala lo que falta", async () => {
    const incompleta = {
      ...facturaCompleta,
      folio: null,
      emisor: { ...facturaCompleta.emisor, identificacion_fiscal: null },
      total: null,
    };
    extracts(incompleta);

    const state = await upload(pdfFile("factura-incompleta.pdf"));

    expect(state).toMatchObject({ status: "ok", extracted: incompleta });
    expect(validateDocument(incompleta)).toEqual({
      folio: "Obligatorio",
      total: "Obligatorio",
    });
  });

  it("factura con totales que no cuadran: error en total", async () => {
    const descuadrada = { ...facturaCompleta, total: 3500 };
    extracts(descuadrada);

    const state = await upload(pdfFile("factura-descuadrada.pdf"));

    expect(state).toMatchObject({ status: "ok", extracted: descuadrada });
    expect(validateDocument(descuadrada)).toEqual({
      total: "Subtotal + impuestos no coincide con el total",
    });
  });

  it("recibo en imagen: se acepta y es válido", async () => {
    extracts(reciboCompleto);
    const imagen = new File([new Uint8Array(512)], "recibo.png", { type: "image/png" });

    const state = await upload(imagen);

    expect(state).toMatchObject({ status: "ok", extracted: reciboCompleto });
    expect(extractDocument).toHaveBeenCalledWith(
      expect.objectContaining({ mediaType: "image/png" }),
    );
    expect(validateDocument(reciboCompleto)).toEqual({});
  });

  it("contrato completo: es válido", async () => {
    extracts(contratoCompleto);

    const state = await upload(pdfFile("contrato.pdf"));

    expect(state).toMatchObject({ status: "ok", extracted: contratoCompleto });
    expect(validateDocument(contratoCompleto)).toEqual({});
  });

  it("documento que no es factura, recibo ni contrato: se clasifica como 'otro'", async () => {
    extracts(documentoNoReconocido);

    const state = await upload(pdfFile("menu.pdf"));

    expect(state).toMatchObject({ status: "ok", extracted: { tipo: "otro" } });
  });
});

describe("fallos externos", () => {
  it("si la extracción falla, el archivo queda guardado y extracted es null", async () => {
    extractDocument.mockRejectedValue(new Error("Invalid schema for response_format"));

    const state = await upload(pdfFile("ilegible.pdf"));

    expect(state).toEqual({ status: "ok", id: "42", name: "ilegible.pdf", extracted: null });
    expect(store.insertDocument).toHaveBeenCalledOnce();
  });

  it("si la base de datos falla, devuelve error y no llama al LLM", async () => {
    store.insertDocument.mockRejectedValue(new Error('relation "documents" does not exist'));

    const state = await upload(pdfFile("factura.pdf"));

    expect(state).toEqual({ status: "error", message: "No se pudo guardar el archivo." });
    expect(extractDocument).not.toHaveBeenCalled();
  });
});

describe("confirmar y guardar", () => {
  it("documento válido: guarda datos estructurados y embeddings del texto", async () => {
    const state = await confirmDocument("42", facturaCompleta);

    expect(state).toEqual({ status: "ok", chunks: 1 });
    expect(embedTexts).toHaveBeenCalledWith([TEXT]);
    expect(store.saveConfirmedDocument).toHaveBeenCalledWith(
      "42",
      expect.objectContaining({ tipo: "factura", folio: "A-1187", total: 3480 }),
      [{ content: TEXT, embedding: [0.1, 0.2] }],
    );
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("guarda los valores normalizados por el esquema (p. ej. sin espacios)", async () => {
    await confirmDocument("42", { ...facturaCompleta, folio: "  A-1187  " });

    expect(store.saveConfirmedDocument.mock.calls[0][1].folio).toBe("A-1187");
  });

  it("texto largo: se divide en varios fragmentos, uno por embedding", async () => {
    const parrafo = "Cláusula con texto suficientemente largo. ".repeat(20);
    store.getDocumentText.mockResolvedValue(`${parrafo}\n\n${parrafo}\n\n${parrafo}`);

    const state = await confirmDocument("42", contratoCompleto);

    expect(state).toEqual({ status: "ok", chunks: 3 });
    expect(store.saveConfirmedDocument.mock.calls[0][2]).toHaveLength(3);
  });

  it("documento sin texto: guarda los datos sin fragmentos", async () => {
    store.getDocumentText.mockResolvedValue("");

    expect(await confirmDocument("42", reciboCompleto)).toEqual({ status: "ok", chunks: 0 });
    expect(store.saveConfirmedDocument).toHaveBeenCalledWith("42", expect.anything(), []);
  });

  it.each([
    ["incompleto", { ...facturaCompleta, folio: null }],
    ["totales que no cuadran", { ...facturaCompleta, total: 3500 }],
    ["tipo desconocido", { tipo: "pagaré" }],
  ])("documento %s: se rechaza sin guardar", async (_, doc) => {
    const state = await confirmDocument("42", doc as DocumentDraft);

    expect(state).toEqual({
      status: "error",
      message: "Corrige los campos marcados antes de confirmar.",
    });
    expect(embedTexts).not.toHaveBeenCalled();
    expect(store.saveConfirmedDocument).not.toHaveBeenCalled();
  });

  it("id no numérico: se rechaza", async () => {
    const state = await confirmDocument("1; DROP TABLE documents", facturaCompleta);

    expect(state.status).toBe("error");
    expect(store.getDocumentText).not.toHaveBeenCalled();
  });

  it("documento inexistente: error", async () => {
    store.getDocumentText.mockResolvedValue(null);

    expect(await confirmDocument("999", facturaCompleta)).toEqual({
      status: "error",
      message: "El documento ya no existe.",
    });
  });

  it("si fallan los embeddings no se guarda nada", async () => {
    embedTexts.mockRejectedValue(new Error("rate limit"));

    expect(await confirmDocument("42", facturaCompleta)).toEqual({
      status: "error",
      message: "No se pudo guardar el documento.",
    });
    expect(store.saveConfirmedDocument).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("si falla la base de datos devuelve error y no refresca la lista", async () => {
    store.saveConfirmedDocument.mockRejectedValue(new Error("connection lost"));

    expect((await confirmDocument("42", facturaCompleta)).status).toBe("error");
    expect(refresh).not.toHaveBeenCalled();
  });
});
