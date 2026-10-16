"use client";
import { useState } from "react";

type Source = {
  id: string;
  documentName: string;
  index: number;
  similarity: number;
  content: string;
};

export function Ask() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    answer: string;
    sources: Source[];
  } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    setResult(await res.json());
    setLoading(false);
  }

  return (
    <section className="space-y-4">
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          className="flex-1 rounded border px-3 py-2"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask your notes..."
        />
        <button
          className="rounded bg-black px-4 py-2 text-white"
          disabled={loading}
        >
          {loading ? "Thinking..." : "Ask"}
        </button>
      </form>
      {result && (
        <>
          <p className="whitespace-pre-wrap">{result.answer}</p>
          <ol className="space-y-2">
            {result.sources.map((s, i) => (
              <li key={s.id} className="rounded border p-3 text-sm">
                <div className="mb-1 flex justify-between font-mono text-xs text-gray-500">
                  <span>
                    {s.documentName} · chunk {s.index}
                  </span>
                  <span>{s.similarity.toFixed(3)}</span>
                </div>
                <p className="whitespace-pre-wrap">{s.content}</p>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
