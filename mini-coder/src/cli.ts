// import { bash } from "./tools/bash";
// import { grep } from "./tools/grep";
//import { readFile } from "./tools/readFile";
// import { writeFile } from "./tools/writeFile";
import { spawnSync } from "node:child_process";
// import { existsSync, readFileSync } from "node:fs";
import {
  closeEvents,
  costByRun,
  EVENTS_FILE,
  readEvents,
  SINK,
} from "./events";
import { runAgent } from "./loop";
import { demoModel } from "./mockModel";
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
    const dbUrl = process.env.DATABASE_URL;

    console.log({
      model: MODEL_ID,
      workspace: ROOT,
      events: SINK === "jsonl" ? EVENTS_FILE : "postgres (event_log)",
      database: !dbUrl
        ? "MISSING"
        : dbUrl.includes("-pooler")
          ? "POOLED url: use the direct one (no --pooler)"
          : "set",
      apiKey: process.env.OPENAI_API_KEY ? "set" : "MISSING",
      ripgrep: rg.status === 0 ? "ok" : "MISSING",
    });

    break;
  }
  case "log": {
    const events = await readEvents(Number(args[0] ?? 20));
    if (events.length === 0) console.log("(no events yet)");

    for (const { ts, type, runId, ...rest } of events) {
      console.log(
        new Date(ts).toISOString().slice(11, 19),
        runId.slice(0, 8),
        type.padEnd(18),
        JSON.stringify(rest).slice(0, 100),
      );
    }
    break;
  }
  case "run": {
    const mock = args[0] === "--mock";
    const task = args.slice(mock ? 1 : 0).join(" ");
    if (!task) {
      console.error('usage: pnpm start run [--mock] "<task>"');
      process.exit(1);
    }
    console.log(await runAgent(task, mock ? { model: demoModel() } : {}));
    break;
  }
  case "cost":
    console.table(await costByRun(Number(args[0] ?? 5)));
    break;
  default:
    console.log(`unknown command: ${cmd ?? "(none)"}`);
    process.exit(1);
}

await closeEvents();
