import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineTool, ToolRegistry } from "../../src/tools/registry.js";

const echo = defineTool({
  name: "echo",
  description: "Echo text",
  inputSchema: z.object({ text: z.string() }),
  async execute({ text }) {
    return text;
  },
});

const boom = defineTool({
  name: "boom",
  description: "Always fails",
  inputSchema: z.object({}),
  async execute() {
    throw new Error("kaboom");
  },
});

const ctx = { workspaceRoot: "/tmp" };

describe("ToolRegistry", () => {
  const reg = new ToolRegistry([echo, boom]);
  it("exposes JSON Schema specs for the model", () => {
    expect(reg.specs()[0]).toMatchObject({
      name: "echo",
      jsonSchema: {
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
      },
    });
  });
  it("executes valid input", async () => {
    expect(await reg.execute("echo", { text: "hi" }, ctx)).toEqual({
      ok: true,
      output: "hi",
    });
  });
  it("turns invalid input into an error result (no throw)", async () => {
    const r = await reg.execute("echo", { text: 42 }, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Invalid input for echo/);
  });
  it("reports unknown tools and thrown errors as data", async () => {
    expect(await reg.execute("nope", {}, ctx)).toEqual({
      ok: false,
      error: "Unknown tool: nope",
    });
    expect(await reg.execute("boom", {}, ctx)).toEqual({
      ok: false,
      error: "Error: kaboom",
    });
  });
  it("rejects duplicate names", () => {
    expect(() => reg.register(echo)).toThrow(/Duplicate/);
  });
});
