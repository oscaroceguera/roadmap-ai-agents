import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { describe, expect, it } from "vitest";

// Spawns the real built binary (run `pnpm run build` first).
describe("stdio e2e", () => {
  it("serves get_talk over stdio", async () => {
    const client = new Client({ name: "vitest-stdio", version: "1.0.0" });
    await client.connect(
      new StdioClientTransport({
        command: "node",
        args: ["dist/index.js"],
        stderr: "ignore",
      }),
    );
    try {
      const res = await client.callTool({
        name: "get_talk",
        arguments: { year: 2026 },
      });
      expect(JSON.stringify(res.content)).toContain(
        "Shipping MCP Servers to Production",
      );
    } finally {
      await client.close();
    }
  });
});
