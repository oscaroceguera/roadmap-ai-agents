import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";

const url = new URL(process.env.MCP_URL ?? "http://localhost:3000/api/mcp");

async function main(): Promise<void> {
  const client = new Client(
    { name: "jsconf-demo-client", version: "1.0.0" },
    { versionNegotiation: { mode: "auto" } },
  );
  await client.connect(new StreamableHTTPClientTransport(url));
  try {
    const era = client.getDiscoverResult()
      ? "modern (2026-07-28)"
      : "legacy (2025-era)";
    console.log(
      `connected to ${client.getServerVersion()?.name} — era: ${era}`,
    );

    const { tools } = await client.listTools();
    console.log("tools:", tools.map((t) => t.name).join(", "));

    const res = await client.callTool({
      name: "get_talk",
      arguments: { year: 2026 },
    });
    console.log("get_talk(2026):", (res.content[0] as { text: string }).text);

    const bad = await client.callTool({
      name: "get_talk",
      arguments: { year: "nope" },
    });
    console.log("bad input isError:", bad.isError);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
