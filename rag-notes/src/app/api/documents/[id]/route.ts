import { db } from "@/prisma/db";

// Chunks are removed by onDelete: Cascade.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  console.log("[DELETE] - id: ", id);
  const doc = await db.orm.public.Document.where({ id }).select("id").first();
  console.log("[DELETE] - doc: ", doc);
  if (!doc) return Response.json({ error: "Not found" }, { status: 404 });

  await db.orm.public.Document.where({ id }).deleteAll();

  return Response.json({ id });
}
