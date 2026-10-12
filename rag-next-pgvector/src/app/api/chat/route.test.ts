import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NO_RESULTS_ANSWER } from "@/lib/rag";

const { embedTexts, searchChunks, runReadOnlyQuery, planSqlQuery, languageModel } =
  vi.hoisted(() => ({
    embedTexts: vi.fn(),
    searchChunks: vi.fn(),
    runReadOnlyQuery: vi.fn(),
    planSqlQuery: vi.fn(),
    languageModel: { current: null as unknown },
  }));
vi.mock("@/lib/embeddings", () => ({ embedTexts }));
vi.mock("@/lib/store", () => ({ searchChunks, runReadOnlyQuery, MAX_QUERY_ROWS: 100 }));
vi.mock("@/lib/sql-chat", () => ({ planSqlQuery }));
vi.mock("@/lib/models", () => ({
  get languageModel() {
    return languageModel.current;
  },
}));

const { POST } = await import("./route");

const factura = {
  document_id: "6",
  name: "factura-ok.pdf",
  mime_type: "application/pdf",
  tipo: "factura",
  referencia: "A-2201",
  content: "FACTURA A-2201 Servicios Norte TOTAL: 3,480.00 MXN",
  similarity: 0.52,
};
const contrato = {
  ...factura,
  document_id: "9",
  name: "renta.pdf",
  tipo: "contrato",
  referencia: "Contrato de arrendamiento",
  content: "Renta de local por 15,000 MXN",
  similarity: 0.37,
};

/** A mock model that streams `answer` and records what it was sent. */
function modelAnswering(answer: string) {
  const model = new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "text-start", id: "t" },
          { type: "text-delta", id: "t", delta: answer },
          { type: "text-end", id: "t" },
          {
            type: "finish",
            finishReason: { unified: "stop", raw: undefined },
            usage: {
              inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
              outputTokens: { total: 1, text: 1, reasoning: undefined },
            },
          },
        ],
      }),
    }),
  });
  languageModel.current = model;
  return model;
}

function ask(text: string, history: unknown[] = []) {
  return POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [
          ...history,
          { id: "u1", role: "user", parts: [{ type: "text", text }] },
        ],
      }),
    }),
  );
}

/** Parses the UI message stream (SSE) into its JSON chunks. */
async function chunksOf(res: Response) {
  const body = await res.text();
  return body
    .split("\n")
    .filter((l) => l.startsWith("data: ") && l !== "data: [DONE]")
    .map((l) => JSON.parse(l.slice(6)));
}

const textOf = (chunks: { type: string; delta?: string }[]) =>
  chunks.filter((c) => c.type === "text-delta").map((c) => c.delta).join("");

beforeEach(() => {
  embedTexts.mockReset().mockResolvedValue([[0.1, 0.2]]);
  searchChunks.mockReset().mockResolvedValue([factura, contrato]);
  planSqlQuery.mockReset().mockResolvedValue(null);
  runReadOnlyQuery.mockReset();
  languageModel.current = null;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/chat", () => {
  it("busca por la pregunta y responde citando los documentos de origen", async () => {
    const model = modelAnswering("Le pagaste 3,480.00 MXN [1].");

    const res = await ask("¿Cuánto le pagué a Servicios Norte?");
    const chunks = await chunksOf(res);

    expect(res.status).toBe(200);
    expect(embedTexts).toHaveBeenCalledWith(["¿Cuánto le pagué a Servicios Norte?"]);
    expect(chunks.filter((c) => c.type === "source-document")).toEqual([
      {
        type: "source-document",
        sourceId: "1",
        mediaType: "application/pdf",
        title: "Factura A-2201",
        filename: "factura-ok.pdf",
      },
      {
        type: "source-document",
        sourceId: "2",
        mediaType: "application/pdf",
        title: "Contrato Contrato de arrendamiento",
        filename: "renta.pdf",
      },
    ]);
    expect(textOf(chunks)).toBe("Le pagaste 3,480.00 MXN [1].");

    // The model only sees the retrieved documents, numbered as the sources.
    const { prompt } = model.doStreamCalls[0];
    const system = JSON.stringify(prompt.filter((m) => m.role === "system"));
    expect(system).toContain('<documento n=\\"1\\" archivo=\\"factura-ok.pdf\\"');
    expect(system).toContain("TOTAL: 3,480.00 MXN");
  });

  it("descarta fragmentos poco similares", async () => {
    searchChunks.mockResolvedValue([factura, { ...contrato, similarity: 0.1 }]);
    modelAnswering("3,480.00 MXN [1].");

    const chunks = await chunksOf(await ask("¿Total de la factura?"));

    expect(chunks.filter((c) => c.type === "source-document")).toHaveLength(1);
  });

  it("sin documentos relevantes responde que no hay información y no llama al LLM", async () => {
    searchChunks.mockResolvedValue([{ ...factura, similarity: 0.1 }]);
    const model = modelAnswering("no debería usarse");

    const chunks = await chunksOf(await ask("¿Quién ganó el mundial?"));

    expect(textOf(chunks)).toBe(NO_RESULTS_ANSWER);
    expect(chunks.some((c) => c.type === "source-document")).toBe(false);
    expect(model.doStreamCalls).toHaveLength(0);
  });

  it("envía el historial al modelo y busca sólo por la última pregunta", async () => {
    const model = modelAnswering("Vence el 15 de octubre [1].");
    const history = [
      { id: "u0", role: "user", parts: [{ type: "text", text: "¿Total de la factura A-2201?" }] },
      { id: "a0", role: "assistant", parts: [{ type: "text", text: "3,480.00 MXN [1]." }] },
    ];

    await chunksOf(await ask("¿Y cuándo vence?", history));

    expect(embedTexts).toHaveBeenCalledWith(["¿Y cuándo vence?"]);
    const roles = model.doStreamCalls[0].prompt.map((m) => m.role);
    expect(roles).toEqual(["system", "user", "assistant", "user"]);
  });

  it("cálculos y totales: responde con el resultado de una consulta SQL, sin embeddings", async () => {
    const query = "SELECT moneda, sum(total) AS total FROM invoices GROUP BY moneda";
    planSqlQuery.mockResolvedValue(query);
    runReadOnlyQuery.mockResolvedValue([{ moneda: "MXN", total: "6375.00" }]);
    const model = modelAnswering("En total facturaste 6,375.00 MXN.");

    const chunks = await chunksOf(await ask("¿Cuánto suman mis facturas?"));

    expect(runReadOnlyQuery).toHaveBeenCalledWith(query);
    expect(embedTexts).not.toHaveBeenCalled();
    expect(chunks.some((c) => c.type === "source-document")).toBe(false);
    expect(textOf(chunks)).toBe("En total facturaste 6,375.00 MXN.");
    const system = JSON.stringify(
      model.doStreamCalls[0].prompt.filter((m) => m.role === "system"),
    );
    expect(system).toContain("GROUP BY moneda");
    expect(system).toContain("6375.00");
  });

  it("si la consulta SQL falla, recurre a la búsqueda semántica", async () => {
    planSqlQuery.mockResolvedValue("SELECT nope FROM invoices");
    runReadOnlyQuery.mockRejectedValue(new Error('column "nope" does not exist'));
    modelAnswering("Le pagaste 3,480.00 MXN [1].");

    const chunks = await chunksOf(await ask("¿Cuánto suman mis facturas?"));

    expect(embedTexts).toHaveBeenCalled();
    expect(chunks.filter((c) => c.type === "source-document")).toHaveLength(2);
    expect(textOf(chunks)).toBe("Le pagaste 3,480.00 MXN [1].");
  });

  it("si falla la búsqueda devuelve un error en el stream", async () => {
    embedTexts.mockRejectedValue(new Error("rate limit"));

    const chunks = await chunksOf(await ask("¿Total?"));

    expect(chunks).toContainEqual({
      type: "error",
      errorText: "No se pudo responder. Intenta de nuevo.",
    });
  });

  it.each([
    ["cuerpo no JSON", "no-json"],
    ["sin mensajes", JSON.stringify({})],
    ["mensajes mal formados", JSON.stringify({ messages: [{ role: "user" }] })],
    [
      "el último mensaje no es del usuario",
      JSON.stringify({
        messages: [{ id: "a", role: "assistant", parts: [{ type: "text", text: "hola" }] }],
      }),
    ],
    [
      "pregunta vacía",
      JSON.stringify({ messages: [{ id: "u", role: "user", parts: [{ type: "text", text: "  " }] }] }),
    ],
    [
      "pregunta demasiado larga",
      JSON.stringify({
        messages: [{ id: "u", role: "user", parts: [{ type: "text", text: "a".repeat(2001) }] }],
      }),
    ],
  ])("400 si %s", async (_, body) => {
    const res = await POST(new Request("http://localhost/api/chat", { method: "POST", body }));

    expect(res.status).toBe(400);
    expect(planSqlQuery).not.toHaveBeenCalled();
    expect(embedTexts).not.toHaveBeenCalled();
  });
});
