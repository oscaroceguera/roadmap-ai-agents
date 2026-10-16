"use client";
import { useState } from "react";

export type Doc = { id: string; name: string; chunks: number };

export function Library({
  docs,
  onChange,
}: {
  docs: Doc[];
  onChange: () => Promise<void>;
}) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    setStatus(`Uploading ${file.name}…`);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/documents", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");

      setStatus(`Indexing ${file.name}…`);
      const indexed = await fetch(`/api/documents/${data.id}/index`, { method: "POST" });
      if (!indexed.ok) throw new Error((await indexed.json()).error ?? "Indexing failed");

      setStatus("");
      await onChange();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && !busy) upload(file);
  }

  return (
    <aside className="flex max-w-[360px] flex-[1_1_300px] flex-col gap-5">
      <h2 className="m-0 font-mono text-[13px] font-medium tracking-[0.08em] text-muted uppercase">
        Library
      </h2>

      <label
        htmlFor="upload"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="relative flex min-h-[168px] cursor-pointer flex-col items-center justify-center gap-2.5 rounded-2xl border-[1.5px] border-dashed border-dash bg-panel p-6 text-center focus-within:border-accent hover:border-accent"
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-accent">
          <path d="M12 16V4" />
          <path d="M7 9l5-5 5 5" />
          <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </svg>
        <span className="font-medium">Drop a note or browse</span>
        <span className="font-mono text-xs text-muted">.md · .txt</span>
        <input
          id="upload"
          type="file"
          accept=".md,.txt"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) upload(file);
          }}
          className="absolute h-px w-px opacity-0"
        />
      </label>

      {status && (
        <p role="status" className="m-0 font-mono text-xs text-muted">
          {status}
        </p>
      )}

      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {docs.map((doc) => (
          <li
            key={doc.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-line bg-panel px-4 py-3.5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-muted">
                <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
                <path d="M14 3v5h5" />
              </svg>
              <span className="truncate">{doc.name}</span>
            </div>
            <span className="font-mono text-xs whitespace-nowrap text-muted">
              {doc.chunks} chunks
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
