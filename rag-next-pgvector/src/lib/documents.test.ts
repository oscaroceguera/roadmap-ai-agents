import { describe, expect, it } from "vitest";
import { z } from "zod";
import { documentDraftSchema, validateDocument } from "./documents";
import {
  contratoCompleto,
  documentoNoReconocido,
  facturaCompleta,
  reciboCompleto,
} from "@/test/fixtures";

describe("documentDraftSchema (salida del LLM)", () => {
  it("acepta documentos incompletos para poder mostrarlos y corregirlos", () => {
    const incompleta = { ...facturaCompleta, folio: null, total: null };
    expect(documentDraftSchema.safeParse(incompleta).success).toBe(true);
  });

  it("acepta totales inconsistentes (se reportan en la validación, no al extraer)", () => {
    const descuadrada = { ...facturaCompleta, total: 9999 };
    expect(documentDraftSchema.safeParse(descuadrada).success).toBe(true);
  });

  it("no emite oneOf, que OpenAI rechaza en structured outputs", () => {
    const json = JSON.stringify(z.toJSONSchema(documentDraftSchema));
    expect(json).not.toContain('"oneOf"');
  });
});

describe("factura", () => {
  it("completa: sin errores", () => {
    expect(validateDocument(facturaCompleta)).toEqual({});
  });

  it("incompleta: marca cada campo obligatorio vacío", () => {
    const errors = validateDocument({
      ...facturaCompleta,
      folio: null,
      fecha_emision: null,
      emisor: { ...facturaCompleta.emisor, nombre: "  ", identificacion_fiscal: null },
      receptor: { ...facturaCompleta.receptor, nombre: null },
      moneda: null,
      subtotal: null,
      impuestos: null,
      total: null,
    });
    expect(errors).toEqual({
      folio: "Obligatorio",
      fecha_emision: "Obligatorio",
      "emisor.nombre": "Obligatorio",
      "receptor.nombre": "Obligatorio",
      moneda: "Obligatorio",
      total: "Obligatorio",
    });
  });

  it("de EE. UU.: sin ID fiscal del emisor ni impuestos es válida", () => {
    const doc = {
      ...facturaCompleta,
      emisor: { nombre: "Anthropic, PBC", identificacion_fiscal: null, direccion: null },
      moneda: "USD",
      subtotal: 20,
      impuestos: null,
      total: 20,
    };
    expect(validateDocument(doc)).toEqual({});
  });

  it("subtotal + impuestos ≠ total: error en total", () => {
    expect(validateDocument({ ...facturaCompleta, total: 3500 })).toEqual({
      total: "Subtotal + impuestos no coincide con el total",
    });
  });

  it("tolera diferencias de redondeo menores a un centavo", () => {
    const doc = { ...facturaCompleta, subtotal: 0.1, impuestos: 0.2, total: 0.3 };
    expect(validateDocument(doc)).toEqual({});
  });

  it("revisa la suma aunque otros campos sean inválidos", () => {
    const errors = validateDocument({ ...facturaCompleta, folio: null, total: 1 });
    expect(errors.folio).toBe("Obligatorio");
    expect(errors.total).toBe("Subtotal + impuestos no coincide con el total");
  });

  it.each([
    ["formato distinto", "15/09/2026"],
    ["día inexistente", "2026-02-30"],
    ["mes inexistente", "2026-13-01"],
  ])("fecha inválida (%s)", (_, fecha) => {
    expect(validateDocument({ ...facturaCompleta, fecha_emision: fecha })).toEqual({
      fecha_emision: "Fecha inválida (AAAA-MM-DD)",
    });
  });

  it("vencimiento opcional, pero no anterior a la emisión", () => {
    expect(validateDocument({ ...facturaCompleta, fecha_vencimiento: null })).toEqual({});
    expect(
      validateDocument({ ...facturaCompleta, fecha_vencimiento: "2026-09-01" }),
    ).toEqual({ fecha_vencimiento: "Anterior a la fecha de emisión" });
  });

  it("moneda debe ser un código ISO de 3 letras", () => {
    expect(validateDocument({ ...facturaCompleta, moneda: "pesos" })).toEqual({
      moneda: "Código de 3 letras, p. ej. MXN",
    });
  });

  it("importes negativos no son válidos", () => {
    const errors = validateDocument({
      ...facturaCompleta,
      impuestos: -480,
      total: 2520,
    });
    expect(errors).toEqual({ impuestos: "No puede ser negativo" });
  });
});

describe("recibo", () => {
  it("completo: sin errores", () => {
    expect(validateDocument(reciboCompleto)).toEqual({});
  });

  it("sólo con total (sin desglose) es válido", () => {
    const doc = { ...reciboCompleto, subtotal: null, impuestos: null };
    expect(validateDocument(doc)).toEqual({});
  });

  it("incompleto: fecha, comercio, moneda y total obligatorios", () => {
    const errors = validateDocument({
      ...reciboCompleto,
      folio: null,
      metodo_pago: null,
      fecha: null,
      comercio: { ...reciboCompleto.comercio, nombre: null },
      moneda: null,
      total: null,
    });
    expect(errors).toEqual({
      fecha: "Obligatorio",
      "comercio.nombre": "Obligatorio",
      moneda: "Obligatorio",
      total: "Obligatorio",
    });
  });

  it("subtotal + impuestos ≠ total: error en total", () => {
    expect(validateDocument({ ...reciboCompleto, total: 120 })).toEqual({
      total: "Subtotal + impuestos no coincide con el total",
    });
  });
});

describe("contrato", () => {
  it("completo: sin errores", () => {
    expect(validateDocument(contratoCompleto)).toEqual({});
  });

  it("incompleto: título, fecha de firma, objeto y nombres de las partes", () => {
    const errors = validateDocument({
      ...contratoCompleto,
      titulo: null,
      fecha_firma: null,
      objeto: "",
      partes: [contratoCompleto.partes[0], { ...contratoCompleto.partes[1], nombre: null }],
    });
    expect(errors).toEqual({
      titulo: "Obligatorio",
      fecha_firma: "Obligatorio",
      objeto: "Obligatorio",
      "partes.1.nombre": "Obligatorio",
    });
  });

  it("necesita al menos dos partes", () => {
    const doc = { ...contratoCompleto, partes: [contratoCompleto.partes[0]] };
    expect(validateDocument(doc)).toEqual({
      partes: "Un contrato necesita al menos dos partes",
    });
  });

  it("fin de vigencia no anterior al inicio", () => {
    const doc = { ...contratoCompleto, vigencia_fin: "2026-01-01" };
    expect(validateDocument(doc)).toEqual({
      vigencia_fin: "Anterior al inicio de la vigencia",
    });
  });
});

describe("otro", () => {
  it("documento no reconocido: sin reglas que validar", () => {
    expect(validateDocument(documentoNoReconocido)).toEqual({});
  });
});
