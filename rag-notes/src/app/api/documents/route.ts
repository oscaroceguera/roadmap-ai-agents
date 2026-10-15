import { db } from "@/prisma/db";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "No file" }, { status: 400 });
  }

  if (!/\.(md|txt)$/i.test(file.name)) {
    return Response.json({ error: "Only .md or .txt" }, { status: 400 });
  }

  const content = await file.text();
  const doc = await db.orm.public.Document.create({ name: file.name, content });

  return Response.json({ id: doc.id, name: doc.name, length: content.length });
}

export async function GET() {
  const docs = await db.orm.public.Document.include("chunks")
    .orderBy((d) => d.createdAt.desc())
    .all();

  console.log("GET docs =>", docs);

  return Response.json(
    docs.map((d) => ({
      id: d.id,
      name: d.name,
      createdAt: d.createdAt,
      chunks: d.chunks.length,
    })),
  );
}
