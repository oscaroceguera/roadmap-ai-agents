import express, { type ErrorRequestHandler } from "express";
import {
  DomainError,
  NotFoundError,
  type TalkUseCases,
} from "../../application/talk-use-cases.js";

export function createApp(talks: TalkUseCases) {
  const app = express();
  app.use(express.json());

  app.get("/talks", async (_req, res) => {
    res.json(await talks.list());
  });

  app.post("/talks", async (req, res) => {
    const { title, speaker } = req.body as { title?: string; speaker?: string };

    res
      .status(201)
      .json(
        await talks.propose({ title: title ?? "", speaker: speaker ?? "" }),
      );
  });

  app.post("/talks/:id/submit", async (req, res) => {
    res.json(await talks.submit(req.params.id));
  });

  app.post("/talks/:id/withdraw", async (req, res) => {
    res.json(await talks.withdraw(req.params.id));
  });

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof DomainError)
      return void res.status(422).json({ error: err.message });
    if (err instanceof NotFoundError)
      return void res.status(404).json({ error: err.message });
    res.status(500).json({ error: "Error interno" });
  };

  app.use(onError);
  return app;
}
