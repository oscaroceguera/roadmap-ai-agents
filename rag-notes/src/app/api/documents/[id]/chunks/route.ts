import { db } from "@/prisma/db";
import { chunkText } from "@/lib/chunk";

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

  const chunks = chunkText(doc.content, { maxChars });
  console.log("[GET] - chunks: ", chunks);
  return Response.json(
    chunks.map((c, i) => ({ index: i, length: c.length, content: c })),
  );
}
