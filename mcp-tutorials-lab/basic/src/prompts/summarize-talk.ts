import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod";

export function registerSummarizePrompt(server: McpServer): void {
  server.registerPrompt(
    "recommend_talks",
    {
      title: "Recommend talks",
      description: "Ask the model to recommend talks for a developer profile",
      argsSchema: z.object({
        year: z.string().describe("Conference year, e.g. 2025"),
        interests: z
          .string()
          .describe('Comma-separated interests, e.g. "react, resting"'),
      }),
    },
    ({ year, interests }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text:
              `Use the get_talk tool with year=${year}. Then recommend the 2 best talks for a developer ` +
              `interested in ${interests}. Explain each pick in one sentence.`,
          },
        },
      ],
    }),
  );
}
