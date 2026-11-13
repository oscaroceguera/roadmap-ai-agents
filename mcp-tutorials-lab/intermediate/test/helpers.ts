import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { POST } from "@/app/api/mcp/route";

/** Real Client -> the exact Next.js route handler, in-process (no `next dev`, no port). */
export async function connectToRoute(): Promise<Client> {
  const transport = new StreamableHTTPClientTransport(
    new URL("http://test.local/api/mcp"),
    {
      fetch: (url, init) => POST(new Request(url, init)),
    },
  );
  const client = new Client(
    { name: "vitest", version: "1.0.0" },
    { versionNegotiation: { mode: "auto" } },
  );
  await client.connect(transport);
  return client;
}
