import "server-only";
import { openai } from "@ai-sdk/openai";

export const languageModel = openai(process.env.OPENAI_MODEL?.trim() || "gpt-5.6-luna");

// 1536 dimensions, matching document_chunks.embedding vector(1536).
export const embeddingModel = openai.embeddingModel("text-embedding-3-small");
