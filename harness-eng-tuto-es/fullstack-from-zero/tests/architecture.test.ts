// Sensor estructural: falla si algún archivo de src/domain importa algo que no sea del propio dominio.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? files(join(dir, e.name))
      : e.name.endsWith(".ts")
        ? [join(dir, e.name)]
        : [],
  );
}

describe("arquitectura", () => {
  it("src/domain solo importa archivos relativos del mismo dominio", () => {
    const offenders = files("src/domain").flatMap((f) =>
      [...readFileSync(f, "utf8").matchAll(/from\s+["']([^"']+)["']/g)]
        .map((m) => m[1] ?? "")
        .filter((spec) => !spec.startsWith("./"))
        .map((spec) => `${f} -> ${spec}`),
    );
    expect(offenders).toEqual([]);
  });
});
