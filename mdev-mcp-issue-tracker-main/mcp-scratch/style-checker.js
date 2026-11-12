import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync } from "fs";

const airbnbMarkdownPath =
  "/Users/oscaroceguera/Documents/Repos/examples/roadmap-ai-agents/mdev-mcp-issue-tracker-main/mcp-scratch/style-guide.md";

const airbnbMarkdown = readFileSync(airbnbMarkdownPath, "utf-8");

const server = new McpServer({
  name: "code-review",
  version: "1.0.0",
});

server.registerPrompt(
  "review-code",
  {
    title: "Code Review",
    description: "Review code for best practices and potential issues",
    argsSchema: { code: z.string() },
  },
  ({ code }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Please review this code to see if it follows our best practices. Use this Airbnb style as a reference and the rules:\n\n===============${airbnbMarkdown}\n\n===============\n\n ${code}`,
        },
      },
    ],
  }),
);

const transport = new StdioServerTransport();
await server.connect(transport);
