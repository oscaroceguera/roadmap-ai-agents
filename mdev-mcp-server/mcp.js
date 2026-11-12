import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "add-server",
  version: "1.0.0",
});

server.registerTool(
  "add",
  {
    title: "Addition tool",
    description: "add two numbers together",
    inputSchema: {
      a: z.number(),
      b: z.number(),
    },
  },
  async ({ a, b }) => {
    return {
      content: [{ type: "text", text: String(a + b) }],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
