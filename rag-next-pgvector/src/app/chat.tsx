"use client";

import { useChat } from "@ai-sdk/react";
import type { SourceDocumentUIPart, UIMessage } from "ai";
import { useState, type FormEvent } from "react";
import { citedNumbers, splitCitations } from "@/lib/rag";

export function Chat() {
  // A fixed id: otherwise useChat generates one with Math.random() during
  // render, which Next rejects while prerendering.
  const { messages, sendMessage, status, error, regenerate, stop } = useChat({
    id: "documentos",
  });
  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";

  function submit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div aria-live="polite" className="flex max-h-[32rem] flex-col gap-4 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-500">
            Pregunta sobre tus documentos guardados, p. ej. “¿Cuánto le pagué a
            Servicios Norte?” o “¿Cuándo vence el contrato de arrendamiento?”.
          </p>
        )}
        {messages.map((m) =>
          m.role === "user" ? (
            <p
              key={m.id}
              className="max-w-[85%] self-end rounded-lg bg-zinc-900 px-3 py-2 text-sm whitespace-pre-wrap text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              {textOf(m)}
            </p>
          ) : (
            <Answer key={m.id} message={m} />
          ),
        )}
        {status === "submitted" && (
          <p className="text-sm text-zinc-500">Buscando en los documentos…</p>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-600">
            No se pudo responder.{" "}
            <button type="button" onClick={() => regenerate()} className="underline">
              Reintentar
            </button>
          </p>
        )}
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <label htmlFor="chat-input" className="sr-only">
          Pregunta
        </label>
        <input
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe una pregunta…"
          maxLength={2000}
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700"
        />
        {busy ? (
          <button
            type="button"
            onClick={() => stop()}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
          >
            Detener
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Preguntar
          </button>
        )}
      </form>
    </div>
  );
}

function textOf(message: UIMessage) {
  return message.parts.flatMap((p) => (p.type === "text" ? [p.text] : [])).join("");
}

function Answer({ message }: { message: UIMessage }) {
  const text = textOf(message);
  const sources = message.parts.filter(
    (p): p is SourceDocumentUIPart => p.type === "source-document",
  );
  const byNumber = new Map(sources.map((s) => [Number(s.sourceId), s]));
  const cited = citedNumbers(text);
  // Show what the answer cites; if it cites nothing, show what was consulted.
  const shown = cited.size ? sources.filter((s) => cited.has(Number(s.sourceId))) : sources;

  return (
    <div className="flex max-w-[85%] flex-col gap-2 self-start">
      <p className="text-sm whitespace-pre-wrap">
        {splitCitations(text).map((segment, i) =>
          typeof segment === "string" ? (
            segment
          ) : (
            <span key={i} className="whitespace-nowrap">
              {segment.map((n) => {
                const source = byNumber.get(n);
                return (
                  <a
                    key={n}
                    href={`#fuente-${message.id}-${n}`}
                    title={source ? `${source.title} · ${source.filename}` : undefined}
                    className="mx-0.5 inline-block rounded bg-blue-100 px-1 align-super text-[0.65rem] font-medium text-blue-800 no-underline dark:bg-blue-950 dark:text-blue-200"
                  >
                    {n}
                  </a>
                );
              })}
            </span>
          ),
        )}
      </p>
      {shown.length > 0 && (
        <div className="flex flex-col gap-1 text-xs text-zinc-500">
          <span>{cited.size ? "Fuentes" : "Documentos consultados"}</span>
          <ol className="flex flex-col gap-0.5">
            {shown.map((s) => (
              <li key={s.sourceId} id={`fuente-${message.id}-${s.sourceId}`}>
                <span className="font-medium text-blue-800 dark:text-blue-200">
                  [{s.sourceId}]
                </span>{" "}
                {s.title} · <span className="text-zinc-400">{s.filename}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
