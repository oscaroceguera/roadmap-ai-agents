import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mini-coder-test-"));

fs.cpSync("fixtures/toy-repo", tmp, {
  recursive: true,
  filter: (src) => !src.includes("node_modules"),
});

process.env.WORKSPACE = tmp;
process.env.EVENTS_FILE = path.join(tmp, "events.jsonl");
