"use server";

import { refresh } from "next/cache";
import { chunkText } from "@/lib/chunk";
import { parseValidDocument, type DocumentDraft } from "@/lib/documents";
import { embedTexts } from "@/lib/embeddings";
import { extractDocument } from "@/lib/extract";
import {
  getDocumentText,
  insertDocument,
  saveConfirmedDocument,
  saveDocumentText,
} from "@/lib/store";
import { ACCEPTED_TYPES, MAX_FILE_BYTES } from "@/lib/upload";

export type UploadState =
  | { status: "idle" }
  | {
      status: "ok";
      id: string;
      name: string;
      // null when the file was saved but extraction failed.
      extracted: DocumentDraft | null;
    }
  | { status: "error"; message: string };

export async function uploadDocument(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Selecciona un archivo." };
  }
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
    return { status: "error", message: "Solo se aceptan imágenes o PDFs." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { status: "error", message: "El archivo supera los 10 MB." };
  }

  const content = Buffer.from(await file.arrayBuffer());
  let id: string;
  try {
    id = await insertDocument({
      name: file.name,
      mimeType: file.type,
      size: file.size,
      content,
    });
  } catch (error) {
    console.error("uploadDocument failed", error);
    return { status: "error", message: "No se pudo guardar el archivo." };
  }

  try {
    const { document, text } = await extractDocument({
      data: content,
      mediaType: file.type,
      filename: file.name,
    });
    // Kept server-side for the embedding step on confirm.
    await saveDocumentText(id, text);
    return { status: "ok", id, name: file.name, extracted: document };
  } catch (error) {
    console.error("extractDocument failed", error);
    return { status: "ok", id, name: file.name, extracted: null };
  }
}

export type ConfirmState =
  | { status: "idle" }
  | { status: "ok"; chunks: number }
  | { status: "error"; message: string };

/**
 * Stores the reviewed data in the per-type tables and the document text as
 * embeddings. Arguments come from the client, so both are re-validated here.
 */
export async function confirmDocument(
  id: string,
  input: DocumentDraft,
): Promise<ConfirmState> {
  const doc = parseValidDocument(input);
  if (!/^\d+$/.test(id) || !doc) {
    return {
      status: "error",
      message: "Corrige los campos marcados antes de confirmar.",
    };
  }

  let chunks: string[];
  try {
    const text = await getDocumentText(id);
    if (text === null) {
      return { status: "error", message: "El documento ya no existe." };
    }

    chunks = chunkText(text);
    const embeddings = await embedTexts(chunks);
    await saveConfirmedDocument(
      id,
      doc,
      chunks.map((content, i) => ({ content, embedding: embeddings[i] })),
    );
  } catch (error) {
    console.error("confirmDocument failed", error);
    return { status: "error", message: "No se pudo guardar el documento." };
  }

  refresh();
  return { status: "ok", chunks: chunks.length };
}
