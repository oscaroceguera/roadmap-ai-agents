import { formatCents } from "./money";
export function cartTotal(items: { priceCents: number; qty: number }[]) {
  const subtotal = items.reduce((s, i) => s + i.priceCents * i.qty, 0);
  const tax = Math.round(subtotal * 0.16);
  return {
    subtotal,
    tax,
    total: subtotal + tax,
    label: formatCents(subtotal + tax),
  };
}
