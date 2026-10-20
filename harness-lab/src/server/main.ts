import { JsonFileApprovalStore } from "../approvals/store.js";
import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 4317);
const store = new JsonFileApprovalStore(
  process.env.APPROVALS_FILE ?? ".harness/approvals.json",
);
createApp(store, {
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
}).listen(port, () =>
  process.stderr.write(`approvals API on http://localhost:${port}\n`),
);
