import { readFile } from "node:fs/promises";
import { afterEach, describe, it, expect, vi } from "vitest";
import * as unpdf from "unpdf";

// Wraps the real unpdf so tests can observe loadingTask.destroy() and inject a failure
// after a successful load; everything else runs for real.
const destroyed = vi.fn();
const extractFailure = { error: null as Error | null };

vi.mock("unpdf", async (importOriginal) => {
  const real = await importOriginal<typeof unpdf>();
  return {
    ...real,
    getDocumentProxy: async (...args: Parameters<typeof real.getDocumentProxy>) => {
      const pdf = await real.getDocumentProxy(...args);
      const task = pdf.loadingTask;
      const destroy = task.destroy.bind(task);
      task.destroy = async () => {
        destroyed();
        return destroy();
      };
      return pdf;
    },
    extractText: (async (...args: Parameters<typeof real.extractText>) => {
      if (extractFailure.error) throw extractFailure.error;
      return real.extractText(...args);
    }) as typeof real.extractText,
  };
});

const { extractPdf, PdfError } = await import("./pdf");

const fixture = (name: string) =>
  readFile(new URL(`./__fixtures__/${name}`, import.meta.url));

afterEach(() => {
  destroyed.mockClear();
  extractFailure.error = null;
});

describe("extractPdf document lifecycle", () => {
  it("destroys the document after a successful extraction", async () => {
    await extractPdf(await fixture("single.pdf"));
    expect(destroyed).toHaveBeenCalledOnce();
  });

  it("destroys the document when the PDF has no text", async () => {
    await extractPdf(await fixture("blank.pdf")).catch(() => {});
    expect(destroyed).toHaveBeenCalledOnce();
  });

  it("wraps an error raised after loading as invalid", async () => {
    extractFailure.error = new Error("bad page content stream");

    const err = await extractPdf(await fixture("single.pdf")).catch((e) => e);

    expect(err).toBeInstanceOf(PdfError);
    expect(err.code).toBe("invalid");
    expect(destroyed).toHaveBeenCalledOnce();
  });
});
