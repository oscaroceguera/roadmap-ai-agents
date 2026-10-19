import path from "node:path";
import { parseArgs } from "node:util";
import { jsonLogger } from "./core/logger.js";
import { runAgent } from "./core/loop.js";
import { modelFromEnv } from "./models/from-env.js";
import { defaultTools } from "./tools/index.js";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    workspace: { type: "string", default: "." },
    "max-steps": { type: "string", default: "10" },
  },
});

const task = positionals.join(" ").trim();
if (!task) {
  process.stderr.write('Usage: pnpm agent --workspace <dir> "<task>"\n');
  process.exit(2);
}

const result = await runAgent({
  model: modelFromEnv(),
  tools: defaultTools(),
  workspaceRoot: path.resolve(values.workspace),
  task,
  maxSteps: Number(values["max-steps"]),
  logger: jsonLogger(),
});

process.stdout.write(`${result.finalText}\n`);
process.stdout.write(
  `[stop=${result.stopReason} steps=${result.steps} in=${result.usage.inputTokens} out=${result.usage.outputTokens}]\n`,
);
process.exit(result.stopReason === "final_answer" ? 0 : 1);
