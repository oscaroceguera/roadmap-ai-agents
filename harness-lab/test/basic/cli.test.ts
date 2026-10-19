import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const run = promisify(execFile);

describe("CLI", () => {
  it("runs end to end with the fake model when no API key is set", async () => {
    const env = { ...process.env };
    delete env.OPENAI_API_KEY;
    const { stdout, stderr } = await run(
      "node_modules/.bin/tsx",
      ["src/cli.ts", "--workspace", ".", "say hi"],
      { env },
    );
    expect(stdout).toBe(
      "No OPENAI_API_KEY set: running with the fake model.\n[stop=final_answer steps=1 in=10 out=5]\n",
    );
    expect(JSON.parse(stderr.trim().split("\n")[0]!)).toMatchObject({
      level: "info",
      event: "model.turn",
      step: 1,
    });
  });

  it("exits 2 with usage when no task is given", async () => {
    await expect(
      run("node_modules/.bin/tsx", ["src/cli.ts"]),
    ).rejects.toMatchObject({ code: 2 });
  });
});
