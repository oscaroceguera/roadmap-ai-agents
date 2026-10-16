import { readFile } from "node:fs/promises";
import { describe, it, expect } from "vitest";
import { chunkText, PAGE_SEPARATOR } from "./chunk";
import { MAX_UPLOAD_BYTES } from "./limits";
import { readUpload, UploadError } from "./upload";

const fixtureFile = async (fixture: string, name = fixture) =>
  new File(
    [new Uint8Array(await readFile(new URL(`./__fixtures__/${fixture}`, import.meta.url)))],
    name,
  );

async function expectUploadError(file: File, message: string, status = 400) {
  const err = await readUpload(file).catch((e) => e);
  expect(err).toBeInstanceOf(UploadError);
  expect(err.status).toBe(status);
  expect(err.message).toBe(message);
}

describe("readUpload text files", () => {
  it("keeps .md content exactly", async () => {
    const text = "# Title\n\nSome  notes\r\n";
    const upload = await readUpload(new File([text], "notes.md"));
    expect(upload).toEqual({ name: "notes.md", content: text });
  });

  it("keeps .txt content exactly", async () => {
    const upload = await readUpload(new File(["plain"], "a.txt"));
    expect(upload).toEqual({ name: "a.txt", content: "plain" });
  });

  it("matches extensions case-insensitively", async () => {
    expect((await readUpload(new File(["x"], "a.TXT"))).content).toBe("x");
    const pdf = await readUpload(await fixtureFile("single.pdf", "NOTES.PDF"));
    expect(pdf.name).toBe("NOTES.PDF");
  });
});

describe("readUpload PDFs", () => {
  it("stores one segment per page, blank pages as empty", async () => {
    const { content } = await readUpload(await fixtureFile("multi.pdf"));
    const segments = content.split(PAGE_SEPARATOR);

    expect(segments).toHaveLength(3);
    expect(segments[0]).toContain("apples");
    expect(segments[1]).toBe("");
    expect(segments[2]).toContain("bananas");
  });

  it("has no page separator for a one-page PDF", async () => {
    const { content } = await readUpload(await fixtureFile("single.pdf"));
    expect(content).toContain("# Sourdough notes");
    expect(content).not.toContain("\f");
  });

  it("never lets the page separator reach a chunk", async () => {
    const { content } = await readUpload(await fixtureFile("multi.pdf"));
    for (const chunk of chunkText(content)) {
      expect(chunk).not.toContain("\f");
    }
  });
});

describe("readUpload errors", () => {
  it("rejects unsupported extensions", async () => {
    await expectUploadError(
      new File(["x"], "notes.docx"),
      "Only .md, .txt or .pdf files.",
    );
  });

  it("rejects a PDF with no text", async () => {
    await expectUploadError(
      await fixtureFile("blank.pdf"),
      "This PDF has no selectable text (it may be scanned).",
    );
  });

  it("rejects a password-protected PDF", async () => {
    await expectUploadError(
      await fixtureFile("encrypted.pdf"),
      "This PDF is password-protected. Remove the password and try again.",
    );
  });

  it("rejects a file that isn't really a PDF", async () => {
    await expectUploadError(
      new File([new Uint8Array([1, 2, 3])], "bad.pdf"),
      "This file isn't a readable PDF.",
    );
  });
});

describe("readUpload size limit", () => {
  const TOO_LARGE = "This file is too large (max 4 MB).";

  it("accepts a file of exactly the limit", async () => {
    const upload = await readUpload(
      new File(["a".repeat(MAX_UPLOAD_BYTES)], "big.txt"),
    );
    expect(upload.content).toHaveLength(MAX_UPLOAD_BYTES);
  });

  it("rejects a file one byte over the limit", async () => {
    await expectUploadError(
      new File(["a".repeat(MAX_UPLOAD_BYTES + 1)], "big.txt"),
      TOO_LARGE,
      413,
    );
  });

  it("rejects an oversized PDF before parsing it", async () => {
    await expectUploadError(
      new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], "big.pdf"),
      TOO_LARGE,
      413,
    );
  });
});
