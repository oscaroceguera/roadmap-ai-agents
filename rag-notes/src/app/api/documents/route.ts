import { db } from "@/prisma/db";
import { readUpload, UploadError } from "@/lib/upload";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "No file" }, { status: 400 });
  }

  let upload;
  try {
    upload = await readUpload(file);
  } catch (err) {
    if (err instanceof UploadError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const { name, content } = upload;
  const doc = await db.orm.public.Document.create({ name, content });

  console.log("[POST documents] - doc: ", doc);

  return Response.json({ id: doc.id, name: doc.name, length: content.length });
}

export async function GET() {
  const docs = await db.orm.public.Document.include("chunks")
    .orderBy((d) => d.createdAt.desc())
    .all();

  console.log("[GET documents] - doc: ", docs);

  return Response.json(
    docs.map((d) => ({
      id: d.id,
      name: d.name,
      createdAt: d.createdAt,
      chunks: d.chunks.length,
    })),
  );
}
