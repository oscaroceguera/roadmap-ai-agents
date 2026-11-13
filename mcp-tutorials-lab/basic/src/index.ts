#!/usr/bin/env node
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createServer } from "./server.js";

// stdout is the JSON-RPC channel: never console.log here. Use stderr for logs.
serveStdio(createServer);
console.error("[jsconf-mcp] stdio server ready");
