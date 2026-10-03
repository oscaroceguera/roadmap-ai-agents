export function invoiceLine(subtotalCents: number) {
  const iva = Math.round(subtotalCents * 0.16);
  return { subtotalCents, iva, totalCents: subtotalCents + iva };
}
