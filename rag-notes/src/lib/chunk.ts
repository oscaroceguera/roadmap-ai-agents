export type ChunkOptions = { maxChars?: number; overlap?: number };

export function chunkText(
  text: string,
  { maxChars = 1000, overlap = 150 }: ChunkOptions = {},
): string[] {
  const blocks = text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n|(?=^#{1,6}\s)/m) // blank lines, or before a heading
    .map((b) => b.trim())
    .filter(Boolean);

  console.log("[chunkText] - blocks: ", blocks);

  const chunks: string[] = [];
  let current = "";

  const push = () => {
    if (current) chunks.push(current);
  };

  for (const block of blocks) {
    const startsSection = /^#{1,6}\s/.test(block);
    console.log("[chunkText] - startsSection: ", startsSection);

    const fits = (current + "\n\n" + block).length <= maxChars;
    console.log("[chunkText] - current: ", current);

    if (current && (startsSection || !fits)) {
      push();
      const tail = startsSection ? "" : current.slice(-overlap);
      console.log("[chunkText] - tail: ", tail);

      current = tail ? `${tail}\n\n${block}` : block;
    } else {
      current = current ? `${current}\n\n${block}` : block;
    }

    // a single huge block: hard-split it
    while (current.length > maxChars * 1.5) {
      chunks.push(current.slice(0, maxChars));
      current = current.slice(maxChars - overlap);
    }
  }

  push();
  return chunks;
}
