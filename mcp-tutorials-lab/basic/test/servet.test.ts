import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Client } from "@modelcontextprotocol/client";
import { connectInProcess } from "./helpers.js";

let client: Client;
let close: () => Promise<void>;

beforeEach(async () => {
  ({ client, close } = await connectInProcess());
});
afterEach(async () => {
  await close();
});

describe("jsconf-mcp (in-process, 2026-07-28)", () => {
  it("negotiates the modern era", () => {
    expect(client.getDiscoverResult()).toBeDefined();
    expect(client.getServerVersion()?.name).toBe("jsconf-mcp");
  });

  it("lists get_talk with read-only annotations", async () => {
    const { tools } = await client.listTools();
    const tool = tools.find((t) => t.name === "get_talk");
    expect(tool?.annotations?.readOnlyHint).toBe(true);
    expect(tool?.inputSchema.required).toEqual(["year"]);
  });

  it("returns structured talks for a known year", async () => {
    const res = await client.callTool({
      name: "get_talk",
      arguments: { year: 2025 },
    });
    expect(res.isError).toBeFalsy();
    const data = res.structuredContent as { talks: { speaker: string }[] };
    expect(data.talks.map((t) => t.speaker)).toEqual([
      "María Fernández",
      "Luis Herrera",
    ]);
  });

  it("filters by track", async () => {
    const res = await client.callTool({
      name: "get_talk",
      arguments: { year: 2025, track: "workshop" },
    });
    expect((res.structuredContent as { talks: unknown[] }).talks).toHaveLength(
      1,
    );
  });

  it("returns a recoverable tool error for an unknown year", async () => {
    const res = await client.callTool({
      name: "get_talk",
      arguments: { year: 2019 },
    });
    expect(res.isError).toBe(true);
    expect(JSON.stringify(res.content)).toContain(
      "Known years: 2024, 2025, 2026",
    );
  });

  it("rejects bad input via the Zod schema", async () => {
    const res = await client.callTool({
      name: "get_talk",
      arguments: { year: "twenty" },
    });
    expect(res.isError).toBe(true);
    expect(JSON.stringify(res.content)).toContain("Input validation error");
  });

  it("lists and reads resources", async () => {
    const { resources } = await client.listResources();
    expect(resources.map((r) => r.uri)).toContain("jsconf://schedule/2026");
    const { contents } = await client.readResource({
      uri: "jsconf://schedule/2026",
    });
    expect((contents[0] as { text: string }).text).toContain("Oscar Oceguera");
  });

  it("renders the recommend_talks prompt", async () => {
    const { messages } = await client.getPrompt({
      name: "recommend_talks",
      arguments: { year: "2025", interests: "testing" },
    });
    expect((messages[0]!.content as { text: string }).text).toContain(
      "year=2025",
    );
  });
});
