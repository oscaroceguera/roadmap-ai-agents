import OpenAI from "openai";

const openai = new OpenAI();
export const EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 dims

export async function embedMany(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 100) {
    const res = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts.slice(i, i + 100),
    });

    console.log("[embedMany] - res:", res);
    out.push(...res.data.map((d) => d.embedding));
  }

  console.log("[embedMany] out:", out);
  return out;
}

export async function embedOne(text: string) {
  const [v] = await embedMany([text]);

  console.log("[embedOne] - [v]:", v);

  return v;
}

export function cosine(a: number[], b: number[]) {
  console.log("[cosine] ---");
  let dot = 0,
    na = 0,
    nb = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] ** 2;
    nb += b[i] ** 2;
  }

  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
