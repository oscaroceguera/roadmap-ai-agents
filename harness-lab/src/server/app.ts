import express, { type Express } from "express";
import { z } from "zod";
import type { ApprovalStore } from "../approvals/store.js";

const DecisionBody = z.object({ decision: z.enum(["approved", "denied"]) });
const ListQuery = z.object({
  status: z.enum(["pending", "approved", "denied"]).optional(),
});

export function createApp(
  store: ApprovalStore,
  opts: { corsOrigin?: string } = {},
): Express {
  const app = express();
  app.use(express.json({ limit: "100kb" }));
  if (opts.corsOrigin) {
    const origin = opts.corsOrigin;
    app.use((req, res, next) => {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Headers", "content-type");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      if (req.method === "OPTIONS") {
        res.sendStatus(204);
        return;
      }
      next();
    });
  }

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/approvals", async (req, res) => {
    const q = ListQuery.safeParse(req.query);
    if (!q.success) {
      res.status(400).json({ error: z.prettifyError(q.error) });
      return;
    }
    res.json(await store.list(q.data.status ? { status: q.data.status } : {}));
  });

  app.post("/approvals/:id/decision", async (req, res) => {
    const body = DecisionBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: z.prettifyError(body.error) });
      return;
    }
    const updated = await store.decide(req.params.id, body.data.decision);
    if (!updated) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.json(updated);
  });

  return app;
}
