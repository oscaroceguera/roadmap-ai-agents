import OpenAI from "openai";
import { retrieve, type RetrievedChunk } from "@/lib/retrieve";

const openai = new OpenAI();
const CHAT_MODEL = "gpt-4o-mini"; // any chat model works

export function buildContext(chunks: RetrievedChunk[]) {
  console.log("[buildContext] - chunks: ", chunks);
  return chunks
    .map((c, i) => `[${i + 1}] (source: ${c.documentName})\n${c.content}`)
    .join("\n\n---\n\n");
}

const SYSTEM = `You answer questions using ONLY the context below.
Rules:
- Cite the sources you used with their numbers, like [1] or [2][3].
- If the context does not contain the answer, reply exactly: "I couldn't find that in your notes."
- Do not use outside knowledge. Be concise.`;

export async function answer(question: string) {
  const chunks = await retrieve(question, 5, 0.3);
  console.log("[answer] - chunks: ", chunks);

  if (chunks.length === 0) {
    return { answer: "I couldn't find that in your notes.", sources: [] };
  }

  const res = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `${SYSTEM}\n\nContext:\n${buildContext(chunks)}`,
      },
      { role: "user", content: question },
    ],
  });

  console.log("[answer] - res: ", res);

  return { answer: res.choices[0].message.content ?? "", sources: chunks };
}
