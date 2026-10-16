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
    .replace(/\u0000/g, "") // unmapped glyphs; Postgres text rejects NUL
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/(\p{L})-\n(\p{Ll})/gu, "$1$2") // exam-\nple -> example
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toPdfError(err: unknown): PdfError {
  if (err instanceof PdfError) return err;
  console.log("[extractPdf] - error: ", err);
  if (err instanceof Error && err.name === "PasswordException") {
    return new PdfError("encrypted", "PDF is password-protected");
  }
  return new PdfError("invalid", "Not a readable PDF");
}

export async function extractPdf(
  data: Uint8Array | ArrayBuffer,
): Promise<PdfText> {
  // pdf.js transfers the buffer it is given, so hand it a copy
  const bytes = new Uint8Array(data).slice();
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>> | undefined;

  try {
    pdf = await getDocumentProxy(bytes);
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
  } catch (err) {
    throw toPdfError(err);
  } finally {
    await pdf?.loadingTask.destroy();
  }
}
