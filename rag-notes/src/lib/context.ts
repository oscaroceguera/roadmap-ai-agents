import type { RetrievedChunk } from "./retrieve";

// "paper.pdf p.3" for PDF chunks, the bare name for .md/.txt (page: null).
export function sourceLabel({
  documentName,
  page,
}: Pick<RetrievedChunk, "documentName" | "page">) {
  const label = page != null ? `${documentName} p.${page}` : documentName;
  console.log("[sourceLabel] - label: ", label);
  return label;
}

export function buildContext(chunks: RetrievedChunk[]) {
  console.log("[buildContext] - chunks: ", chunks);
  const context = chunks
    .map((c, i) => `[${i + 1}] (source: ${sourceLabel(c)})\n${c.content}`)
    .join("\n\n---\n\n");
  console.log("[buildContext] - context: ", context);
  return context;
}
