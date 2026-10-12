import type { DocumentDraft } from "@/lib/documents";

type Of<T extends DocumentDraft["tipo"]> = Extract<DocumentDraft, { tipo: T }>;

// Documents as the LLM would return them after reading a complete file.

export const facturaCompleta: Of<"factura"> = {
  tipo: "factura",
  folio: "A-1187",
  fecha_emision: "2026-09-15",
  fecha_vencimiento: "2026-10-15",
  emisor: {
    nombre: "Servicios Norte SA de CV",
    identificacion_fiscal: "SNO990101XY2",
    direccion: null,
  },
  receptor: { nombre: "Juan Pérez", identificacion_fiscal: null, direccion: null },
  conceptos: [
    { descripcion: "Consultoría", cantidad: 3, precio_unitario: 1000, importe: 3000 },
  ],
  moneda: "MXN",
  subtotal: 3000,
  impuestos: 480,
  total: 3480,
};

export const reciboCompleto: Of<"recibo"> = {
  tipo: "recibo",
  folio: "R-0042",
  fecha: "2026-10-01",
  comercio: {
    nombre: "Cafetería La Esquina",
    identificacion_fiscal: "CLE010101AB1",
    direccion: null,
  },
  metodo_pago: "Tarjeta",
  conceptos: [
    { descripcion: "Café americano", cantidad: 2, precio_unitario: 45, importe: 90 },
    { descripcion: "Pan dulce", cantidad: 1, precio_unitario: 30, importe: 30 },
  ],
  moneda: "MXN",
  subtotal: 120,
  impuestos: 19.2,
  total: 139.2,
};

export const contratoCompleto: Of<"contrato"> = {
  tipo: "contrato",
  titulo: "Contrato de arrendamiento",
  fecha_firma: "2026-01-15",
  vigencia_inicio: "2026-02-01",
  vigencia_fin: "2027-01-31",
  partes: [
    { nombre: "Ana López", rol: "Arrendadora", identificacion_fiscal: null, direccion: null },
    { nombre: "Luis Gómez", rol: "Arrendatario", identificacion_fiscal: null, direccion: null },
  ],
  objeto: "Renta de local comercial",
  monto: 15000,
  moneda: "MXN",
  clausulas_clave: ["Depósito de un mes de renta"],
};

export const documentoNoReconocido: Of<"otro"> = {
  tipo: "otro",
  descripcion: "Menú de restaurante",
};

export function pdfFile(name = "documento.pdf", bytes = 1024): File {
  const header = new TextEncoder().encode("%PDF-1.4\n");
  const content = new Uint8Array(bytes);
  content.set(header);
  return new File([content], name, { type: "application/pdf" });
}
