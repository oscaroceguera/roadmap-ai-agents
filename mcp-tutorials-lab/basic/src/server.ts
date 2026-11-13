import { McpServer } from "@modelcontextprotocol/server";
import { registerSummarizePrompt } from "./prompts/summarize-talk.js";
import { registerScheduleResources } from "./resources/schedule.js";
import { registerGetTalk } from "./tools/get-talk.js";

export function createServer(): McpServer {
  const server = new McpServer(
    { name: "jsconf-mcp", version: "0.1.0" },
    {
      instructions:
        "Conference catalog. Call get_talk(year) before aswering questions about speakers.",
    },
  );

  registerGetTalk(server);
  registerScheduleResources(server);
  registerSummarizePrompt(server);
  return server;
}
