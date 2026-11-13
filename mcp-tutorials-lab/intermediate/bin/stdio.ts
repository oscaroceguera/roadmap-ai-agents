#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { registerJsconf } from "../lib/mcp/register.ts";

// Same tools as app/api/mcp/route.ts, but over stdio for `npx @oscaroceguera/jsconf-mcp`.
serveStdio(() => {
  const server = new McpServer({ name: "jsconf-mcp", version: "0.2.0" });
  registerJsconf(server);
  return server;
});
