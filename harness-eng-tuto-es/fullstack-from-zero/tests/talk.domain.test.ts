import { describe, expect, it } from "vitest";
import {
  createTalk,
  submitTalk,
  withdrawTalk,
  DomainError,
} from "../src/domain/talk.js";

describe("Talk (dominio)", () => {
  it("crea una charla en borrador", () => {
    const t = createTalk({
      id: "1",
      title: "  Harness Engineering ",
      speaker: "Oscar",
    });
    expect(t).toMatchObject({
      title: "Harness Engineering",
      status: "draft",
      submittedAt: null,
    });
  });

  it("rechaza títulos cortos", () => {
    expect(() =>
      createTalk({ id: "1", title: "abc", speaker: "Oscar" }),
    ).toThrow(DomainError);
  });

  it("no permite enviar dos veces", () => {
    const now = new Date("2026-11-04T00:00:00Z");
    const sent = submitTalk(
      createTalk({ id: "1", title: "Harness 101", speaker: "Oscar" }),
      now,
    );
    expect(sent.submittedAt).toEqual(now);
    expect(() => submitTalk(sent, now)).toThrow("ya fue enviada");
  });

  it("retira una charla enviada y la regresa a borrador", () => {
    const sent = submitTalk(
      createTalk({ id: "1", title: "Harness 101", speaker: "Oscar" }),
      new Date("2026-11-04T00:00:00Z"),
    );
    const now = new Date("2026-11-05T00:00:00Z");
    expect(withdrawTalk(sent, now)).toMatchObject({
      status: "draft",
      submittedAt: null,
      withdrawnAt: now,
    });
  });

  it("no permite retirar una charla en borrador", () => {
    const draft = createTalk({ id: "1", title: "Harness 101", speaker: "Oscar" });
    expect(() => withdrawTalk(draft, new Date())).toThrow(DomainError);
  });
});
