// keywords.ts — shared by full-text search and the grep baseline, so they see the same terms
const STOP = new Set([
  "the",
  "and",
  "for",
  "what",
  "how",
  "does",
  "did",
  "with",
  "which",
  "where",
  "when",
  "why",
  "about",
  "from",
  "this",
  "that",
  "are",
  "was",
  "have",
  "use",
  "my",
  "que",
  "como",
  "para",
  "por",
  "una",
  "los",
  "las",
  "del",
  "con",
  "cual",
  "donde",
  "cuando",
  "mis",
]);

export function keywords(question: string): string[] {
  const words = question.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  return [...new Set(words.filter((w) => w.length >= 3 && !STOP.has(w)))];
}
