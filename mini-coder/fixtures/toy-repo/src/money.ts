export function formatCents(cents: number): string {
  return `$${Math.round(cents / 100)}`;
}
