"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { uploadDocument, type UploadState } from "./actions";
import { DocumentForm } from "./document-form";
import { ACCEPTED_TYPES, MAX_FILE_BYTES } from "@/lib/upload";

type Selected = { file: File; url: string };

export function Uploader() {
  const uploadFormId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  // False once a new file is picked, so a stale result never sits next to it.
  const [resultIsCurrent, setResultIsCurrent] = useState(false);
  const [state, formAction, pending] = useActionState<UploadState, FormData>(
    uploadDocument,
    { status: "idle" },
  );

  // Release the object URL when the preview changes or unmounts.
  useEffect(() => {
    return () => {
      if (selected) URL.revokeObjectURL(selected.url);
    };
  }, [selected]);

  function select(file: File | undefined) {
    setClientError(null);
    setResultIsCurrent(false);
    if (!file) return;
    if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
      setClientError("Solo se aceptan imágenes o PDFs.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setClientError("El archivo supera los 10 MB.");
      return;
    }
    // Keep the hidden input in sync so drag-and-drop files are submitted too.
    if (inputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      inputRef.current.files = dt.files;
    }
    setSelected({ file, url: URL.createObjectURL(file) });
  }

  const error = clientError ?? (state.status === "error" ? state.message : null);
  const result = state.status === "ok" && resultIsCurrent ? state : null;

  // The upload form only wraps the drop zone: the extracted-data form is its
  // own <form> and can't be nested. The submit button joins via `form=`.
  return (
    <div className="flex w-full flex-col gap-6">
      <form
        id={uploadFormId}
        action={formAction}
        onSubmit={() => setResultIsCurrent(true)}
      >
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            select(e.dataTransfer.files[0]);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition-colors focus-within:ring-2 focus-within:ring-blue-500 ${
            dragging
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
              : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700"
          }`}
        >
          <span className="font-medium">
            Arrastra una imagen o PDF aquí, o haz clic para elegir
          </span>
          <span className="text-sm text-zinc-500">
            PNG, JPEG, WebP, GIF o PDF · máx. 10 MB
          </span>
          <input
            ref={inputRef}
            type="file"
            name="file"
            accept={ACCEPTED_TYPES.join(",")}
            className="sr-only"
            onChange={(e) => select(e.target.files?.[0])}
          />
        </label>
      </form>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {selected && (
        <div
          className={
            result ? "grid items-start gap-6 lg:grid-cols-2" : "flex flex-col gap-3"
          }
        >
          <section className="flex flex-col gap-3 lg:sticky lg:top-4">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="truncate font-medium">{selected.file.name}</span>
              <span className="shrink-0 text-zinc-500">
                {(selected.file.size / 1024).toFixed(0)} KB
              </span>
            </div>

            <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
              {selected.file.type === "application/pdf" ? (
                <iframe
                  src={selected.url}
                  title={`Vista previa de ${selected.file.name}`}
                  className="h-[80vh] w-full"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- local blob URL, not optimizable
                <img
                  src={selected.url}
                  alt={`Vista previa de ${selected.file.name}`}
                  className="mx-auto max-h-[80vh] object-contain"
                />
              )}
            </div>

            {!result && (
              <button
                type="submit"
                form={uploadFormId}
                disabled={pending}
                className="self-end rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {pending ? "Analizando…" : "Subir y analizar"}
              </button>
            )}
          </section>

          {result && (
            <section role="status" className="flex flex-col gap-4">
              <p className="text-sm text-green-600">
                “{result.name}” guardado (id {result.id}).
              </p>
              {result.extracted ? (
                <DocumentForm
                  key={result.id}
                  documentId={result.id}
                  initial={result.extracted}
                />
              ) : (
                <p className="text-sm text-red-600">
                  No se pudieron extraer los datos del documento.
                </p>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
