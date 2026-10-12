import "server-only";
import { embedMany } from "ai";
import { embeddingModel } from "./models";

export async function embedTexts(values: string[]): Promise<number[][]> {
  if (values.length === 0) return [];
  const { embeddings } = await embedMany({ model: embeddingModel, values });
  return embeddings;
}
