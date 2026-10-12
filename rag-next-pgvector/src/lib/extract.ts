import "server-only";
import { generateText, Output } from "ai";
import { z } from "zod";
import { documentDraftSchema, type DocumentDraft } from "./documents";
import { languageModel } from "./models";

const extractionSchema = z.object({
  documento: documentDraftSchema,
  texto: z
    .string()
    .describe("Transcripción completa y literal del texto del documento"),
});

export type Extraction = { document: DocumentDraft; text: string };

export async function extractDocument(file: {
  data: Buffer;
  mediaType: string;
  filename: string;
}): Promise<Extraction> {
  const { output } = await generateText({
    model: languageModel,
    output: Output.object({ schema: extractionSchema }),
    instructions:
      "Clasificas documentos como factura, recibo o contrato y extraes sus datos. " +
      "Usa 'otro' si no es ninguno de los tres. Copia los valores tal como aparecen; " +
      "usa null cuando un dato no esté en el documento. Nunca inventes datos. " +
      "Excepciones: escribe las fechas como AAAA-MM-DD (p. ej. 'September 25, 2026' → 2026-09-25) " +
      "y los importes como números sin símbolos ni separadores de miles. " +
      "Además transcribe todo el texto del documento en orden de lectura.",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Clasifica este documento, extrae sus datos y transcribe su texto." },
          { type: "file", ...file },
        ],
      },
    ],
  });
  return { document: output.documento, text: output.texto };
}
