"use client";
import { useState } from "react";

type Source = {
  id: string;
  documentName: string;
  index: number;
  similarity: number;
  content: string;
};

const sectionLabel =
  "m-0 font-mono text-[13px] font-medium tracking-[0.08em] text-muted uppercase";

// Render citation markers like [1] in the accent mono style.
function withCitations(text: string) {
  return text.split(/(\[\d+\])/).map((part, i) =>
    /^\[\d+\]$/.test(part) ? (
      <span key={i} className="font-mono text-[13px] text-accent">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

export function Ask() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    answer: string;
    sources: Source[];
  } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-display text-[clamp(36px,5vw,56px)] leading-[1.05] font-bold tracking-[-0.03em]">
          Chat with your <span className="text-accent">notes</span>.
        </h1>
        <p className="m-0 max-w-[52ch] text-muted">
          Ask anything. Answers come only from what you uploaded, with the exact
          passages they were drawn from.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="flex flex-wrap gap-2 rounded-[18px] border border-line-strong bg-panel p-2 focus-within:border-accent"
      >
        <label htmlFor="question" className="sr-only">
          Question
        </label>
        <input
          id="question"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask your notes…"
          className="min-h-12 flex-[1_1_240px] rounded-xl border-0 bg-transparent px-4 text-[17px] text-fg outline-none placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border-0 bg-accent px-5.5 font-medium text-ink hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Thinking…" : "Ask"}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="M13 6l6 6-6 6" />
          </svg>
        </button>
      </form>

      {error && (
        <p role="alert" className="m-0 font-mono text-sm text-[#FFB86B]">
          {error}
        </p>
      )}

      {result && (
        <>
          <section
            aria-label="Answer"
            className="flex flex-col gap-4 rounded-[20px] border border-track bg-card p-7"
          >
            <div className="flex items-center gap-2.5 font-mono text-xs tracking-[0.08em] text-accent uppercase">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
              </svg>
              Answer
            </div>
            <p className="m-0 max-w-[68ch] text-lg leading-[1.65] whitespace-pre-wrap">
              {withCitations(result.answer)}
            </p>
          </section>

          {result.sources.length > 0 && (
            <section aria-label="Sources" className="flex flex-col gap-3">
              <h2 className={sectionLabel}>Sources</h2>
              <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3 p-0">
                {result.sources.map((s, i) => (
                  <li
                    key={s.id}
                    className="flex flex-col gap-3 rounded-[14px] border border-line bg-panel p-4.5"
                  >
                    <div className="flex justify-between gap-2 font-mono text-xs text-muted">
                      <span>
                        <span className="text-accent">[{i + 1}]</span>{" "}
                        {s.documentName} · chunk {s.index}
                      </span>
                      <span className="text-fg">{s.similarity.toFixed(3)}</span>
                    </div>
                    <div className="h-1 overflow-hidden rounded bg-track">
                      <div
                        className="h-full rounded bg-accent"
                        style={{ width: `${Math.max(0, Math.min(1, s.similarity)) * 100}%` }}
                      />
                    </div>
                    <p className="m-0 text-sm leading-[1.6] whitespace-pre-wrap text-body">
                      {s.content}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </>
      )}
    </main>
  );
}
