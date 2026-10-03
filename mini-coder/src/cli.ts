import { resolveInWorkspace } from "./workspace";

const [cmd, ...args] = process.argv.slice(2);

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
  default:
    console.log(`unknown command: ${cmd ?? "(none)"}`);
    process.exit(1);
}
