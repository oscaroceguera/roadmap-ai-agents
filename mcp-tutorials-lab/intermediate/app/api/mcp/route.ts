import { createMcpHandler } from "mcp-handler";
import { registerJsconf } from "@/lib/mcp/register";

// One stateless handler: 2026-07-28 natively, 2025-era Streamable HTTP via fallback.
const handler = createMcpHandler(
  (server) => {
    registerJsconf(server);
  },
  {
    serverInfo: { name: "jsconf-mcp", version: "0.2.0" },
    instructions:
      "Conference catalog. Prefer get_talk for a year, search_talks for topics.",
  },
);

export { handler as GET, handler as POST, handler as DELETE };
