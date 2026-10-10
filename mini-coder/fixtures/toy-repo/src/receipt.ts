import { formatCents } from "./money";
export function receiptFooter(subtotalCents: number) {
  const taxCents = Math.round(subtotalCents * 0.16);
  return { taxCents, line: `IVA (16%): ${formatCents(taxCents)}` };
}
