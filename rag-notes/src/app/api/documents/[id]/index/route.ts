import { db } from "@/prisma/db";
import { chunkDocument } from "@/lib/chunk";
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

  const pieces = chunkDocument(doc.name, doc.content);
  console.log("[POST] - pieces: ", pieces);
  const vectors = await embedMany(pieces.map((p) => p.content));
  console.log("[POST] - vectors: ", vectors);

  await db.transaction(async (tx) => {
    await tx.orm.public.Chunk.where({ documentId: id }).deleteAll();
    await tx.orm.public.Chunk.createAll(
      pieces.map(({ content, page }, index) => ({
        documentId: id,
        index,
        content,
        page,
        embedding: vectors[index],
      })),
    );
  });

  return Response.json({ documentId: id, chunks: pieces.length });
}
