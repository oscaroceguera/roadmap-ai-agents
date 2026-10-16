import { answer } from "@/lib/answer";

export async function POST(req: Request) {
  const { question } = await req.json();
  console.log("[POST] - question: ", question);

  if (!question?.trim())
    return Response.json({ error: "Missing question" }, { status: 400 });

  return Response.json(await answer(question));
}
