export const agentConfig = {
  model: process.env.OPENAI_MODEL?.trim() || "gpt-5.6-luna",
  providerOptions: {
    openai: {
      reasoningEffort: "low",
    },
  },
} as const;
