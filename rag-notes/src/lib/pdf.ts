import { extractText, getDocumentProxy } from "unpdf";

export type PdfPage = { page: number; text: string }; // page is 1-based
export type PdfText = { pages: PdfPage[]; totalPages: number };

export type PdfErrorCode = "invalid" | "encrypted" | "no-text";

export class PdfError extends Error {
  constructor(
    readonly code: PdfErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PdfError";
  }
}

export function normalizePageText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/(\w)-\n(\w)/g, "$1$2") // exam-\nple -> example
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function loadPdf(data: Uint8Array | ArrayBuffer) {
  try {
    return await getDocumentProxy(new Uint8Array(data));
  } catch (err) {
    console.log("[extractPdf] - load error: ", err);
    if (err instanceof Error && err.name === "PasswordException") {
      throw new PdfError("encrypted", "PDF is password-protected");
    }
    throw new PdfError("invalid", "Not a readable PDF");
  }
}

export async function extractPdf(
  data: Uint8Array | ArrayBuffer,
): Promise<PdfText> {
  const pdf = await loadPdf(data);
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  console.log("[extractPdf] - totalPages: ", totalPages);

  const pages = text
    .map((t, i) => ({ page: i + 1, text: normalizePageText(t) }))
    .filter((p) => p.text);
  console.log("[extractPdf] - pages: ", pages);

  if (pages.length === 0) {
    throw new PdfError("no-text", "PDF has no extractable text");
  }

  return { pages, totalPages };
}
