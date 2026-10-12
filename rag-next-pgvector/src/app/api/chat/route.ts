import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  safeValidateUIMessages,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { embedTexts } from "@/lib/embeddings";
import { languageModel } from "@/lib/models";
import {
  buildInstructions,
  buildSqlInstructions,
  NO_RESULTS_ANSWER,
  TOP_K,
  toSources,
} from "@/lib/rag";
import { planSqlQuery } from "@/lib/sql-chat";
import { MAX_QUERY_ROWS, runReadOnlyQuery, searchChunks } from "@/lib/store";

export const maxDuration = 60;

const MAX_QUESTION_CHARS = 2000;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = await safeValidateUIMessages<UIMessage>({
    messages: body?.messages,
  });
  if (!parsed.success) {
    return Response.json({ error: "Mensajes inválidos." }, { status: 400 });
  }

  const messages = parsed.data;
  const last = messages.at(-1);
  const question =
    last?.role === "user"
      ? last.parts
          .flatMap((p) => (p.type === "text" ? [p.text] : []))
          .join("\n")
          .trim()
      : "";
  if (!question || question.length > MAX_QUESTION_CHARS) {
    return Response.json(
      { error: `Escribe una pregunta de hasta ${MAX_QUESTION_CHARS} caracteres.` },
      { status: 400 },
    );
  }

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const modelMessages = await convertToModelMessages(messages);

      // Calculations and totals are answered from the structured tables.
      const query = await planSqlQuery(modelMessages);
      if (query) {
        const rows = await runReadOnlyQuery(query).catch((error) => {
          // A bad query falls back to semantic search instead of failing.
          console.error("chat SQL failed", query, error);
          return null;
        });
        if (rows) {
          const result = streamText({
            model: languageModel,
            instructions: buildSqlInstructions(query, rows, MAX_QUERY_ROWS),
            messages: modelMessages,
          });
          writer.merge(toUIMessageStream({ stream: result.stream }));
          return;
        }
      }

      // Everything else is grounded in the nearest document chunks.
      const [embedding] = await embedTexts([question]);
      const sources = toSources(await searchChunks(embedding, TOP_K));

      writer.write({ type: "start" });
      // Sources go out in citation order: sourceId is the [n] the model uses.
      for (const source of sources) {
        writer.write({
          type: "source-document",
          sourceId: String(source.n),
          mediaType: source.mimeType,
          title: source.title,
          filename: source.name,
        });
      }

      if (sources.length === 0) {
        writer.write({ type: "text-start", id: "no-results" });
        writer.write({ type: "text-delta", id: "no-results", delta: NO_RESULTS_ANSWER });
        writer.write({ type: "text-end", id: "no-results" });
        writer.write({ type: "finish" });
        return;
      }

      const result = streamText({
        model: languageModel,
        instructions: buildInstructions(sources),
        messages: modelMessages,
      });
      writer.merge(toUIMessageStream({ stream: result.stream, sendStart: false }));
    },
    onError: (error) => {
      console.error("chat failed", error);
      return "No se pudo responder. Intenta de nuevo.";
    },
  });

  return createUIMessageStreamResponse({ stream });
}
