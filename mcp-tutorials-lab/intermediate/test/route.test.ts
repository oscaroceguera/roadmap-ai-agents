import type { Client } from "@modelcontextprotocol/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { connectToRoute } from "./helpers";

let client: Client;
beforeEach(async () => {
  client = await connectToRoute();
});
afterEach(async () => {
  await client.close();
  vi.unstubAllEnvs();
});

describe("app/api/mcp/route.ts", () => {
  describe("success", () => {
    it("speaks the 2026-07-28 era and lists both tools", async () => {
      expect(client.getDiscoverResult()).toBeDefined();
      const { tools } = await client.listTools();
      expect(tools.map((t) => t.name).sort()).toEqual([
        "get_talk",
        "search_talks",
      ]);
    });

    it("get_talk returns structured content", async () => {
      const res = await client.callTool({
        name: "get_talk",
        arguments: { year: 2024 },
      });
      expect(res.isError).toBeFalsy();
      expect(
        (res.structuredContent as { talks: unknown[] }).talks,
      ).toHaveLength(2);
    });

    it("search_talks merges ratings", async () => {
      const res = await client.callTool({
        name: "search_talks",
        arguments: { query: "vitest" },
      });
      const { results } = res.structuredContent as {
        results: { rating: number }[];
      };
      expect(results[0]?.rating).toBe(4.6);
    });
  });

  describe("bad input", () => {
    it.each([
      [{ year: "nope" }, "expected number"],
      [{ year: 1999 }, "Too small"],
      [{}, "year"],
    ])('get_talk(%j) -> isError mentioning "%s"', async (args, needle) => {
      const res = await client.callTool({ name: "get_talk", arguments: args });
      expect(res.isError).toBe(true);
      expect(JSON.stringify(res.content)).toContain(needle);
    });

    it("search_talks rejects a 1-char query", async () => {
      const res = await client.callTool({
        name: "search_talks",
        arguments: { query: "a" },
      });
      expect(res.isError).toBe(true);
    });

    it("unknown tool is reported as an error", async () => {
      const res = await client
        .callTool({ name: "drop_database", arguments: {} })
        .catch((e: Error) => e);
      expect(JSON.stringify(res instanceof Error ? res.message : res)).toMatch(
        /drop_database/,
      );
    });
  });

  describe("upstream errors", () => {
    it("search_talks returns a recoverable isError when ratings are down", async () => {
      vi.stubEnv("RATINGS_DOWN", "1");
      const res = await client.callTool({
        name: "search_talks",
        arguments: { query: "react" },
      });
      expect(res.isError).toBe(true);
      expect(JSON.stringify(res.content)).toContain(
        "Retry later or use get_talk",
      );
    });
  });
});
