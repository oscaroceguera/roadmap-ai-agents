import { db } from "@/prisma/db";
import { embedOne } from "@/lib/embed";

export type RetrievedChunk = {
  id: string;
  content: string;
  documentId: string;
  documentName: string;
  index: number;
  similarity: number;
};

export async function retrieve(
  question: string,
  k = 5,
  minSimilarity = 0,
): Promise<RetrievedChunk[]> {
  const q = await embedOne(question);

  const plan = db.sql.public.Chunk.select(
    "id",
    "content",
    "documentId",
    "index",
  )
    .select("similarity", (f, fns) => fns.cosineSimilarity(f.embedding, q))
    .orderBy((f, fns) => fns.cosineDistance(f.embedding, q), {
      direction: "asc",
    })
    .limit(k)
    .build();

  console.log("[retrieve] - plan: ", plan);

  const rows = await db.runtime().query(plan);
  console.log("[retrieve] - rows: ", rows);

  // look up the names of the (at most k) source documents
  const docIds = [...new Set(rows.map((r) => r.documentId))];
  console.log("[retrieve] - docIds: ", docIds);
  const docs = await Promise.all(
    docIds.map((id) =>
      db.orm.public.Document.where({ id }).select("id", "name").first(),
    ),
  );
  console.log("[retrieve] - docs: ", docs);
  const names = new Map(
    docs.flatMap((d) => (d ? [[d.id, d.name] as const] : [])),
  );
  console.log("[retrieve] - names: ", names);

  return rows
    .map((r) => ({
      ...r,
      documentName: names.get(r.documentId) ?? "",
      similarity: Number(r.similarity),
    }))
    .filter((r) => r.similarity >= minSimilarity);
}
