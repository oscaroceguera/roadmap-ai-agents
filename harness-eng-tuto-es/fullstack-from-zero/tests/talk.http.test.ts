import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { makeTalkUseCases } from "../src/application/talk-use-cases.js";
import { InMemoryTalkRepository } from "../src/infrastructure/in-memory-talk-repository.js";
import { createApp } from "../src/ui/http/app.js";

let server: Server;
let base = "";

beforeAll(async () => {
  let n = 0;
  const talks = makeTalkUseCases({
    repo: new InMemoryTalkRepository(),
    clock: { now: () => new Date("2026-11-04T12:00:00Z") },
    ids: { next: () => `t${++n}` },
  });
  server = createApp(talks).listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));

describe("HTTP /talks", () => {
  it("propone y envía una charla", async () => {
    const created = await fetch(`${base}/talks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Harness Engineering", speaker: "Oscar" }),
    });
    expect(created.status).toBe(201);
    const sent = await fetch(`${base}/talks/t1/submit`, { method: "POST" });
    expect(await sent.json()).toMatchObject({
      status: "submitted",
      submittedAt: "2026-11-04T12:00:00.000Z",
    });
  });

  it("retira una charla enviada y la regresa a borrador", async () => {
    const created = await fetch(`${base}/talks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Retirar charla", speaker: "Oscar" }),
    });
    const { id } = (await created.json()) as { id: string };
    await fetch(`${base}/talks/${id}/submit`, { method: "POST" });

    const withdrawn = await fetch(`${base}/talks/${id}/withdraw`, {
      method: "POST",
    });
    expect(withdrawn.status).toBe(200);
    expect(await withdrawn.json()).toMatchObject({
      status: "draft",
      submittedAt: null,
      withdrawnAt: "2026-11-04T12:00:00.000Z",
    });

    const again = await fetch(`${base}/talks/${id}/withdraw`, {
      method: "POST",
    });
    expect(again.status).toBe(422);
  });

  it("withdraw responde 404 si la charla no existe", async () => {
    expect(
      (await fetch(`${base}/talks/nope/withdraw`, { method: "POST" })).status,
    ).toBe(404);
  });

  it("responde 422 ante error de dominio y 404 si no existe", async () => {
    const bad = await fetch(`${base}/talks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "no", speaker: "Oscar" }),
    });
    expect(bad.status).toBe(422);
    expect(
      (await fetch(`${base}/talks/nope/submit`, { method: "POST" })).status,
    ).toBe(404);
  });
});
