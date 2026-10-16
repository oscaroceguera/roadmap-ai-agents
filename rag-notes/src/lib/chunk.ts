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

// Joins PDF pages in Document.content; segment N (0-based) is page N + 1.
export const PAGE_SEPARATOR = "\n\f\n";

export type DocumentChunk = { content: string; page: number | null };

export function chunkDocument(name: string, content: string): DocumentChunk[] {
  if (!/\.pdf$/i.test(name)) {
    return chunkText(content).map((c) => ({ content: c, page: null }));
  }

  // PDF text has no paragraph gaps, so each line becomes its own block;
  // chunking page by page keeps every chunk (and its overlap) on one page.
  const chunks = content.split(PAGE_SEPARATOR).flatMap((text, i) =>
    chunkText(text.replace(/\n/g, "\n\n")).map((c) => ({
      content: c,
      page: i + 1,
    })),
  );
  console.log("[chunkDocument] - pdf chunks: ", chunks.length);
  return chunks;
}
