import { db } from "@/prisma/db";
import { chunkText } from "@/lib/chunk";
import { embedMany } from "@/lib/embed";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  console.log("[POST] - id: ", id);
  const doc = await db.orm.public.Document.where({ id }).first();
  console.log("[POST] - doc: ", doc);
  if (!doc) return Response.json({ error: "Not found" }, { status: 404 });

  const pieces = chunkText(doc.content);
  console.log("[POST] - pieces: ", pieces);
  const vectors = await embedMany(pieces);
  console.log("[POST] - vectors: ", vectors);

  await db.transaction(async (tx) => {
    await tx.orm.public.Chunk.where({ documentId: id }).deleteAll();
    await tx.orm.public.Chunk.createAll(
      pieces.map((content, index) => ({
        documentId: id,
        index,
        content,
        embedding: vectors[index],
      })),
    );
  });

  return Response.json({ documentId: id, chunks: pieces.length });
}
