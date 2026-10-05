// import { bash } from "./tools/bash";
// import { grep } from "./tools/grep";
//import { readFile } from "./tools/readFile";
// import { writeFile } from "./tools/writeFile";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { EVENTS_FILE } from "./events";
import { MODEL_ID } from "./model";
import { runTool } from "./tools/run";
import { ROOT, resolveInWorkspace } from "./workspace";

const [cmd, ...args] = process.argv.slice(2);

// const direct: Record<string, (input: any) => Promise<unknown>> = {
//   read_file: readFile,
//   write_file: writeFile,
//   grep,
//   bash,
// };

switch (cmd) {
  case "hello":
    console.log("mini-coder is alive");
    break;
  case "resolve":
    try {
      console.log("✅", resolveInWorkspace(args[0] ?? "."));
    } catch (e) {
      console.log("🚫", (e as Error).message);
    }
    break;
  case "tool":
    console.log(await runTool(args[0], JSON.parse(args[1] ?? "{}")));
    break;
  case "doctor": {
    const rg = spawnSync("rg", ["--version"]);

    console.log({
      model: MODEL_ID,
      workspace: ROOT,
      events: EVENTS_FILE,
      apiKey: process.env.OPENAI_API_KEY ? "set" : "MISSING",
      ripgrep: rg.status === 0 ? "ok" : "MISSING",
    });

    break;
  }
  case "log": {
    if (!existsSync(EVENTS_FILE)) {
      console.log("(no events yet)");
      break;
    }

    const lines = readFileSync(EVENTS_FILE, "utf-8")
      .trim()
      .split("\n")
      .slice(-Number(args[0] ?? 20));

    for (const line of lines) {
      const { ts, type, runId, ...rest } = JSON.parse(line);
      console.log(
        new Date(ts).toISOString().slice(11, 19),
        runId.slice(0, 8),
        type.padEnd(18),
        JSON.stringify(rest).slice(0, 100),
      );
    }
    break;
  }
  default:
    console.log(`unknown command: ${cmd ?? "(none)"}`);
    process.exit(1);
}
