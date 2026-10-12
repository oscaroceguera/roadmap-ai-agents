/** Upper bound per chunk; ~250 tokens keeps each embedding focused. */
export const MAX_CHUNK_CHARS = 1000;

/**
 * Splits text into chunks of at most `max` characters for embedding.
 * Paragraphs are packed together while they fit; a paragraph longer than
 * `max` is split at word boundaries (or hard-cut if a single word is longer).
 */
export function chunkText(text: string, max = MAX_CHUNK_CHARS): string[] {
  const pieces = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .flatMap((p) => splitLong(p, max));

  const chunks: string[] = [];
  let current = "";
  for (const piece of pieces) {
    if (current && current.length + 2 + piece.length > max) {
      chunks.push(current);
      current = piece;
    } else {
      current = current ? `${current}\n\n${piece}` : piece;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function splitLong(paragraph: string, max: number): string[] {
  const parts: string[] = [];
  let rest = paragraph;
  while (rest.length > max) {
    const cut = rest.lastIndexOf(" ", max);
    const end = cut > 0 ? cut : max;
    parts.push(rest.slice(0, end).trim());
    rest = rest.slice(end).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}
