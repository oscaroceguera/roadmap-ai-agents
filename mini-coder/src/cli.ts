// import { bash } from "./tools/bash";
// import { grep } from "./tools/grep";
//import { readFile } from "./tools/readFile";
// import { writeFile } from "./tools/writeFile";
import { runTool } from "./tools/run";
import { resolveInWorkspace } from "./workspace";

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
  default:
    console.log(`unknown command: ${cmd ?? "(none)"}`);
    process.exit(1);
}
