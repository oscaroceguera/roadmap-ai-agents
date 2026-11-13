import type { McpServer } from "@modelcontextprotocol/server";

import * as z from "zod/v4";
import { talksByYear, YEARS } from "../data/talks.js";

const TalkSchema = z.object({
  year: z.number(),
  title: z.string(),
  speaker: z.string(),
  track: z.enum(["main", "workshop"]),
  tags: z.array(z.string()),
});

export function registerGetTalk(server: McpServer): void {
  server.registerTool(
    "get_talk",
    {
      title: "Get JSConf talks by year",
      description:
        "List the talks given at the conference in a given yer. Use when the user aks who spoke" +
        "what was presented, or about a specific edition. Returns title, peaker, track and tags",
      inputSchema: z.object({
        year: z
          .number()
          .int()
          .min(2000)
          .max(2100)
          .describe("Conference year, e.g. 2025"),
        track: z
          .enum(["main", "workshop"])
          .optional()
          .describe("Optional filter by track"),
      }),
      outputSchema: z.object({
        year: z.number(),
        talks: z.array(TalkSchema),
      }),
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ year, track }) => {
      const talks = talksByYear(year).filter(
        (t) => !track || t.track === track,
      );

      if (talks.length === 0) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `no talks found for ${year}. Known years: ${YEARS.join(", ")}`,
            },
          ],
        };
      }

      const text = talks
        .map((t) => `• ${t.title} - ${t.speaker} [${t.track}]`)
        .join("\n");

      return {
        content: [{ type: "text", text }],
        structuredContent: { year, talks },
      };
    },
  );
}
