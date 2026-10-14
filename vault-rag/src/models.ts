import { openai } from "@ai-sdk/openai";

export const model = openai(process.env.OPENAI_MODEL ?? "gpt-5-mini");
export const embeddingModel = openai.embeddingModel("text-embedding-3-small");

export const PRICE_PER_1M = { input: 0, output: 0, embed: 0.02 };
