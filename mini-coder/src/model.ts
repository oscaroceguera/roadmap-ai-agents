// The one place the model is chosen (from harness/model.ts)
import { openai } from "@ai-sdk/openai";

export const MODEL_ID = "gpt-5-mini";
export const model = openai(MODEL_ID);

// For costUsd in the event log. Fill in from your provider's pricing page
export const PRICE_PER_1M = { input: 0, output: 0 };
