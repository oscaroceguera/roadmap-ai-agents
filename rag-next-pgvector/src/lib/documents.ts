import { z } from "zod";

// Spanish default messages for issues without a custom one.
z.config(z.locales.es());

// Two layers of schemas per document type:
// - Draft schemas describe what the LLM extracts. Every field is nullable
//   (OpenAI structured outputs require all keys, and the model must not invent
//   data), and they carry no refinements so a messy document still parses.
// - Valid schemas extend the drafts with the business rules the UI checks.

// ---------- Drafts (LLM output and the editable form state) ----------

const date = () => z.string().nullable().describe("Formato YYYY-MM-DD");

const party = z.object({
  nombre: z.string().nullable(),
  identificacion_fiscal: z.string().nullable(),
  direccion: z.string().nullable(),
});

const lineItem = z.object({
  descripcion: z.string().nullable(),
  cantidad: z.number().nullable(),
  precio_unitario: z.number().nullable(),
  importe: z.number().nullable(),
});

const amounts = {
  moneda: z.string().nullable().describe("Código ISO 4217, p. ej. MXN"),
  subtotal: z.number().nullable(),
  impuestos: z.number().nullable(),
  total: z.number().nullable(),
};

const facturaDraft = z.object({
  tipo: z.literal("factura"),
  folio: z.string().nullable(),
  fecha_emision: date(),
  fecha_vencimiento: date(),
  emisor: party,
  receptor: party,
  conceptos: z.array(lineItem),
  ...amounts,
});

const reciboDraft = z.object({
  tipo: z.literal("recibo"),
  folio: z.string().nullable(),
  fecha: date(),
  comercio: party,
  metodo_pago: z.string().nullable(),
  conceptos: z.array(lineItem),
  ...amounts,
});

const contratoParty = party.extend({ rol: z.string().nullable() });

const contratoDraft = z.object({
  tipo: z.literal("contrato"),
  titulo: z.string().nullable(),
  fecha_firma: date(),
  vigencia_inicio: date(),
  vigencia_fin: date(),
  partes: z.array(contratoParty),
  objeto: z.string().nullable().describe("Resumen del objeto del contrato"),
  monto: z.number().nullable(),
  moneda: z.string().nullable(),
  clausulas_clave: z.array(z.string()),
});

const otroDraft = z.object({
  tipo: z.literal("otro"),
  descripcion: z.string().describe("Qué es el documento"),
});

// z.union, not z.discriminatedUnion: the latter emits `oneOf`, which OpenAI
// structured outputs reject. The `tipo` literals still narrow the TS type.
export const documentDraftSchema = z.union([
  facturaDraft,
  reciboDraft,
  contratoDraft,
  otroDraft,
]);

export type DocumentDraft = z.infer<typeof documentDraftSchema>;

// ---------- Validation ----------

const missing = (input: unknown) => input == null || input === "";

const requiredText = z
  .string({ error: (iss) => (missing(iss.input) ? "Obligatorio" : undefined) })
  .trim()
  .min(1, "Obligatorio");

const isoDate = z.iso.date({
  error: (iss) =>
    missing(iss.input) ? "Obligatorio" : "Fecha inválida (AAAA-MM-DD)",
});

const optionalDate = isoDate.nullable();

const requiredAmount = z
  .number({ error: (iss) => (missing(iss.input) ? "Obligatorio" : undefined) })
  .nonnegative("No puede ser negativo");

const currency = z
  .string({ error: (iss) => (missing(iss.input) ? "Obligatorio" : undefined) })
  .regex(/^[A-Z]{3}$/, "Código de 3 letras, p. ej. MXN");

// Cross-field rules run with `when: () => true` so they still report while
// other fields are invalid; they therefore guard their own inputs.
const totalsAddUp = {
  check: (d: { subtotal: unknown; impuestos: unknown; total: unknown }) =>
    typeof d.subtotal !== "number" ||
    typeof d.impuestos !== "number" ||
    typeof d.total !== "number" ||
    Math.abs(d.subtotal + d.impuestos - d.total) < 0.01,
  params: {
    path: ["total"],
    message: "Subtotal + impuestos no coincide con el total",
    when: () => true,
  },
};

// Valid ISO dates compare correctly as strings; malformed ones are already
// reported by their own field, so they are not compared.
const notBefore = (from: unknown, to: unknown) =>
  !isoDate.safeParse(from).success ||
  !isoDate.safeParse(to).success ||
  (from as string) <= (to as string);

export const facturaSchema = facturaDraft
  .extend({
    folio: requiredText,
    fecha_emision: isoDate,
    fecha_vencimiento: optionalDate,
    // Not every country prints a tax ID or a tax line (e.g. US invoices).
    emisor: party.extend({ nombre: requiredText }),
    receptor: party.extend({ nombre: requiredText }),
    moneda: currency,
    subtotal: requiredAmount.nullable(),
    impuestos: requiredAmount.nullable(),
    total: requiredAmount,
  })
  .refine(totalsAddUp.check, totalsAddUp.params)
  .refine((d) => notBefore(d.fecha_emision, d.fecha_vencimiento), {
    path: ["fecha_vencimiento"],
    message: "Anterior a la fecha de emisión",
    when: () => true,
  });

export const reciboSchema = reciboDraft
  .extend({
    fecha: isoDate,
    comercio: party.extend({ nombre: requiredText }),
    moneda: currency,
    subtotal: requiredAmount.nullable(),
    impuestos: requiredAmount.nullable(),
    total: requiredAmount,
  })
  .refine(totalsAddUp.check, totalsAddUp.params);

export const contratoSchema = contratoDraft
  .extend({
    titulo: requiredText,
    fecha_firma: isoDate,
    vigencia_inicio: optionalDate,
    vigencia_fin: optionalDate,
    partes: z
      .array(contratoParty.extend({ nombre: requiredText }))
      .min(2, "Un contrato necesita al menos dos partes"),
    objeto: requiredText,
    monto: requiredAmount.nullable(),
    moneda: currency.nullable(),
  })
  .refine((d) => notBefore(d.vigencia_inicio, d.vigencia_fin), {
    path: ["vigencia_fin"],
    message: "Anterior al inicio de la vigencia",
    when: () => true,
  });

const validSchemas = {
  factura: facturaSchema,
  recibo: reciboSchema,
  contrato: contratoSchema,
  otro: otroDraft,
};

export type ValidDocument = z.output<(typeof validSchemas)[keyof typeof validSchemas]>;

/** Validation messages keyed by dotted field path, e.g. "emisor.nombre". */
export function validateDocument(doc: DocumentDraft): Record<string, string> {
  const result = validSchemas[doc.tipo].safeParse(doc);
  const errors: Record<string, string> = {};
  for (const issue of result.error?.issues ?? []) {
    errors[issue.path.join(".")] ??= issue.message;
  }
  return errors;
}

/** Parses untrusted input (e.g. a Server Action argument) into a valid document. */
export function parseValidDocument(input: unknown): ValidDocument | null {
  const draft = documentDraftSchema.safeParse(input);
  if (!draft.success) return null;
  const valid = validSchemas[draft.data.tipo].safeParse(draft.data);
  return valid.success ? valid.data : null;
}
