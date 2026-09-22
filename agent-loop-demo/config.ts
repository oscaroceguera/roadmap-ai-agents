import { getTracer, Laminar } from "@lmnr-ai/lmnr";

/** CONSTANTS */
export const MODEL_NAME = "gpt-5-mini";
export const WORKDIR = process.cwd();
export const CONTEXT_LIMIT = 50000;

Laminar.initialize({
  projectApiKey: process.env.LMNR_PROJECT_API_KEY,
});
