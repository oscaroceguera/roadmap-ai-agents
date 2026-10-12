import "server-only";
import { generateText, Output, type ModelMessage } from "ai";
import { z } from "zod";
import { languageModel } from "./models";

// Tables the model may query. Every row in the per-type tables belongs to a
// confirmed document, so no join with `documents` is needed to filter drafts.
const SCHEMA = `
documents(id, name, doc_type ['factura'|'recibo'|'contrato'|'otro'], created_at, confirmed_at)
invoices(document_id, folio, fecha_emision date, fecha_vencimiento date, emisor_nombre, emisor_identificacion_fiscal, emisor_direccion, receptor_nombre, receptor_identificacion_fiscal, receptor_direccion, moneda char(3), subtotal numeric, impuestos numeric, total numeric)
receipts(document_id, folio, fecha date, comercio_nombre, comercio_identificacion_fiscal, comercio_direccion, metodo_pago, moneda char(3), subtotal numeric, impuestos numeric, total numeric)
line_items(document_id, position, descripcion, cantidad numeric, precio_unitario numeric, importe numeric) -- conceptos de facturas y recibos
contracts(document_id, titulo, fecha_firma date, vigencia_inicio date, vigencia_fin date, objeto, monto numeric, moneda char(3), clausulas_clave text[])
contract_parties(document_id, position, nombre, rol, identificacion_fiscal, direccion)
other_documents(document_id, descripcion)
`.trim();

const planSchema = z.object({
  sql: z
    .string()
    .nullable()
    .describe("Una sola sentencia SELECT de PostgreSQL, o null si la pregunta no es un cálculo"),
});

/**
 * Decides how to answer the last question: calculations and totals (sums,
 * counts, averages, rankings…) get a SQL query over the structured tables;
 * anything else returns null and goes to semantic search.
 */
export async function planSqlQuery(messages: ModelMessage[]): Promise<string | null> {
  const { output } = await generateText({
    model: languageModel,
    output: Output.object({ schema: planSchema }),
    instructions: [
      "Decides cómo responder la última pregunta del usuario sobre sus documentos (facturas, recibos y contratos).",
      "Si pide cálculos o totales (sumas, conteos, promedios, máximos, mínimos, rankings, gastos por periodo, emisor o comercio), escribe una consulta SQL de PostgreSQL que lo calcule.",
      "Si pide cualquier otra cosa (qué dice un documento, condiciones, cláusulas, datos puntuales), devuelve sql = null.",
      "Reglas del SQL: una sola sentencia SELECT, sin punto y coma; usa sólo estas tablas; agrupa por moneda y nunca sumes importes de monedas distintas;",
      "compara nombres con ILIKE '%…%'; para fechas relativas usa CURRENT_DATE; devuelve columnas con nombres descriptivos.",
      "",
      SCHEMA,
    ].join("\n"),
    messages,
  });
  return output.sql?.trim() || null;
}
