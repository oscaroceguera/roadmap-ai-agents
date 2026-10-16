import { db } from "@/prisma/db";
import { chunkDocument } from "@/lib/chunk";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  console.log("[GET] - id: ", id);
  const url = new URL(req.url);
  console.log("[GET] - url: ", url);
  const maxChars = Number(url.searchParams.get("maxChars") ?? 1000);
  console.log("[GET] - maxChars: ", maxChars);

  const doc = await db.orm.public.Document.where({ id }).first();
  console.log("[GET] - doc: ", doc);
  if (!doc) return Response.json({ error: "Not found" }, { status: 404 });

  const chunks = chunkDocument(doc.name, doc.content, { maxChars });
  console.log("[GET] - chunks: ", chunks);
  return Response.json(
    chunks.map(({ content, page }, i) => ({
      index: i,
      page,
      length: content.length,
      content,
    })),
  );
}
