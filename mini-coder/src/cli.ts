const [cmd, ...args] = process.argv.slice(2);

switch (cmd) {
  case "hello":
    console.log("mini-coder is alive");
    break;
  default:
    console.log(`unknown command: ${cmd ?? "(none)"}`);
    process.exit(1);
}
