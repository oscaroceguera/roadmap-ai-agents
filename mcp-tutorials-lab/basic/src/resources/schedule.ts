import { type McpServer, ResourceTemplate } from "@modelcontextprotocol/server";
import { TALKS, talksByYear, YEARS } from "../data/talks.js";

export function registerScheduleResources(server: McpServer): void {
  // static resource: the full catalog as JSON
  server.registerResource(
    "talk-catalog",
    "jsconf://talks",
    {
      title: "All",
      description: "Every talk in the catalog as JSON",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(TALKS, null, 2),
        },
      ],
    }),
  );

  // template resource: one schedule per year, enumerable via list
  server.registerResource(
    "schedule-by-year",
    new ResourceTemplate("jsconf://schedule/{year}", {
      list: async () => ({
        resources: YEARS.map((y) => ({
          uri: `jsconf://schedule/${y}`,
          name: `Schedule ${y}`,
        })),
      }),
    }),
    {
      title: "Schedule by year",
      description: "Markdown schedule for one edition",
      mimeType: "text/markdown",
    },
    async (uri, { year }) => {
      const talks = talksByYear(Number(year));
      const md = [
        `# JSConf ${year}`,
        ...talks.map((t) => `-**${t.title}*** - ${t.speaker} (${t.track})`),
      ].join("\n");

      return {
        contents: [{ uri: uri.href, mimeType: "text/markdown", text: md }],
      };
    },
  );
}
