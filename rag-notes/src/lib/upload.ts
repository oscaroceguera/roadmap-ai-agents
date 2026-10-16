import { extractPdf, PdfError, type PdfErrorCode } from "./pdf";

// Joins PDF pages in Document.content; segment N (0-based) is page N + 1.
export const PAGE_SEPARATOR = "\n\f\n";

export class UploadError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "UploadError";
  }
}

const PDF_MESSAGES: Record<PdfErrorCode, string> = {
  invalid: "This file isn't a readable PDF.",
  encrypted:
    "This PDF is password-protected. Remove the password and try again.",
  "no-text": "This PDF has no selectable text (it may be scanned).",
};

async function readPdf(file: File): Promise<string> {
  try {
    const { pages, totalPages } = await extractPdf(await file.arrayBuffer());
    const segments = Array<string>(totalPages).fill("");
    for (const p of pages) segments[p.page - 1] = p.text;
    console.log("[readUpload] - pdf pages: ", pages.length, "/", totalPages);
    return segments.join(PAGE_SEPARATOR);
  } catch (err) {
    if (err instanceof PdfError) throw new UploadError(PDF_MESSAGES[err.code]);
    throw err;
  }
}

export async function readUpload(
  file: File,
): Promise<{ name: string; content: string }> {
  const ext = file.name.match(/\.(md|txt|pdf)$/i)?.[1].toLowerCase();
  console.log("[readUpload] - file: ", file.name, ext);

  if (!ext) throw new UploadError("Only .md, .txt or .pdf files.");

  const content = ext === "pdf" ? await readPdf(file) : await file.text();
  return { name: file.name, content };
}
