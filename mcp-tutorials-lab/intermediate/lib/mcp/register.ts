import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { fetchRating } from "../data/ratings.ts";
import { TALKS, talksByYear, YEARS } from "../data/talks.ts";

/** Registers every tool on any McpServer: shared by the Next.js route and the stdio bin. */
export function registerJsconf(server: McpServer): void {
  server.registerTool(
    "get_talk",
    {
      title: "Get talks by year",
      description:
        'List conference talks for one year (title, speaker, track). Use for "who spoke in <year>".',
      inputSchema: z.object({
        year: z
          .number()
          .int()
          .min(2000)
          .max(2100)
          .describe("Conference year, e.g. 2025"),
      }),
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ year }) => {
      const talks = talksByYear(year);
      if (talks.length === 0) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `No talks for ${year}. Known years: ${YEARS.join(", ")}`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: "text",
            text: talks.map((t) => `• ${t.title} — ${t.speaker}`).join("\n"),
          },
        ],
        structuredContent: { year, talks },
      };
    },
  );

  server.registerTool(
    "search_talks",
    {
      title: "Search talks with ratings",
      description:
        "Full-text search over talk titles and tags; includes the audience rating (1-5) from the ratings API.",
      inputSchema: z.object({
        query: z
          .string()
          .trim()
          .min(2)
          .max(50)
          .describe('Keyword, e.g. "react" or "testing"'),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ query }) => {
      const q = query.toLowerCase();
      const hits = TALKS.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.includes(q)),
      );
      try {
        const rated = await Promise.all(
          hits.map(async (t) => ({ ...t, rating: await fetchRating(t.title) })),
        );
        return {
          content: [
            {
              type: "text",
              text:
                rated
                  .map((t) => `${t.title} (${t.year}) ★${t.rating ?? "?"}`)
                  .join("\n") || "No matches",
            },
          ],
          structuredContent: { query, results: rated },
        };
      } catch (err) {
        // Recoverable: tell the model what happened and what to do next.
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Ratings service failed: ${(err as Error).message}. Retry later or use get_talk.`,
            },
          ],
        };
      }
    },
  );
}
