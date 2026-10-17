"use client";
import { useCallback, useEffect, useState } from "react";
import { Ask } from "./components/Ask";
import { Library, type Doc } from "./components/Library";

export default function Home() {
  const [docs, setDocs] = useState<Doc[]>([]);

  const loadDocs = useCallback(
    () =>
      fetch("/api/documents")
        .then((res) => (res.ok ? res.json() : null))
        .then((data: Doc[] | null) => {
          if (data) setDocs(data);
        }),
    [],
  );

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  const totalChunks = docs.reduce((sum, d) => sum + d.chunks, 0);

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-[clamp(16px,4vw,48px)] py-5">
        <div className="flex items-center gap-3">
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            aria-hidden="true"
            className="text-accent"
          >
            <rect
              x="3"
              y="3"
              width="22"
              height="22"
              rx="6"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M9 10h10M9 14h10M9 18h6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span className="font-display text-xl font-bold tracking-[-0.01em]">
            rag<span className="text-accent">/</span>notes
          </span>
        </div>
        <span className="font-mono text-[13px] text-muted">
          {docs.length} {docs.length === 1 ? "document" : "documents"} ·{" "}
          {totalChunks} chunks
        </span>
      </header>

      <div className="mx-auto box-border flex w-full max-w-7xl flex-wrap gap-8 px-[clamp(16px,4vw,48px)] pt-10 pb-16">
        <Library docs={docs} onChange={loadDocs} />
        <Ask />
      </div>
    </>
  );
}
