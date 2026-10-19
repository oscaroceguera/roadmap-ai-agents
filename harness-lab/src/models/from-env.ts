import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { FakeModel, final } from "../core/fake-model.js";
import type { Model } from "../core/types.js";
import { aiSdkModel } from "./ai-sdk-model.js";

const EnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1).optional(),
  HARNESS_MODEL: z.string().default("gpt-4.1-mini"),
});

/** Real model only if a key is present in the environment; otherwise a harmless fake. */
export function modelFromEnv(env: NodeJS.ProcessEnv = process.env): Model {
  const cfg = EnvSchema.parse(env);
  if (!cfg.OPENAI_API_KEY) {
    return new FakeModel([
      final("No OPENAI_API_KEY set: running with the fake model."),
    ]);
  }
  const openai = createOpenAI({ apiKey: cfg.OPENAI_API_KEY });
  return aiSdkModel(openai(cfg.HARNESS_MODEL), `openai:${cfg.HARNESS_MODEL}`);
}
