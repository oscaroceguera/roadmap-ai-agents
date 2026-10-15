import { retrieve } from "@/lib/retrieve";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  console.log("[GET] - search: ", q);

  if (!q) return Response.json({ error: "Missing q" }, { status: 400 });

  return Response.json(await retrieve(q, 5));
}
