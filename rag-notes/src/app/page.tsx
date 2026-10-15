"use client";
import { useState } from "react";

// TODO: Accept PDF files
export default function Home() {
  const [status, setStatus] = useState("");

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;

    const body = new FormData();
    body.append("file", file);

    const res = await fetch("/api/documents", { method: "POST", body });

    setStatus(JSON.stringify(await res.json()));
  }

  return (
    <main className="mx-auto max-w-2xl p-8 space-y-4">
      <h1 className="text-2xl font-bold">Chat with your notes</h1>
      <input type="file" accept=".md,.txt" onChange={upload} />
      <pre className="text-sm">{status}</pre>
    </main>
  );
}
