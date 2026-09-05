import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cliPath = fileURLToPath(new URL("./habits-cli.ts", import.meta.url));

function runCli(args: string[], habitsFile: string) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    encoding: "utf-8",
    env: { ...process.env, HABITS_FILE: habitsFile },
  });
}

async function withHabitsFile(run: (habitsFile: string) => Promise<void>) {
  const dir = await mkdtemp(path.join(tmpdir(), "habits-cli-"));
  const habitsFile = path.join(dir, "habits.json");
  try {
    await run(habitsFile);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("habits create: éxito imprime el hábito creado y sale con código 0", async () => {
  await withHabitsFile(async (habitsFile) => {
    const result = runCli(["create", "Leer 20 minutos"], habitsFile);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Leer 20 minutos/);
    assert.match(result.stdout, /racha: 0/);
  });
});

test("habits create: nombre vacío imprime error en stderr y sale con código 1", async () => {
  await withHabitsFile(async (habitsFile) => {
    const result = runCli(["create", "   "], habitsFile);

    assert.equal(result.status, 1);
    assert.notEqual(result.stderr, "");
  });
});

test("habits done: éxito imprime la racha recalculada y sale con código 0", async () => {
  await withHabitsFile(async (habitsFile) => {
    const created = runCli(["create", "Leer 20 minutos"], habitsFile);
    const id = created.stdout.match(/id: ([^,)]+)/)?.[1];
    assert.ok(id, "debe poder extraer el id del hábito creado");

    const result = runCli(["done", id], habitsFile);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /[Rr]acha/);
  });
});

test("habits done: marcar dos veces el mismo día sigue devolviendo código 0 (idempotente)", async () => {
  await withHabitsFile(async (habitsFile) => {
    const created = runCli(["create", "Leer 20 minutos"], habitsFile);
    const id = created.stdout.match(/id: ([^,)]+)/)?.[1];
    assert.ok(id, "debe poder extraer el id del hábito creado");

    runCli(["done", id], habitsFile);
    const second = runCli(["done", id], habitsFile);

    assert.equal(second.status, 0);
  });
});

test("habits done: id inexistente imprime error en stderr y sale con código 2", async () => {
  await withHabitsFile(async (habitsFile) => {
    const result = runCli(["done", "id-inexistente"], habitsFile);

    assert.equal(result.status, 2);
    assert.notEqual(result.stderr, "");
  });
});

test("habits list: sin hábitos imprime el mensaje de lista vacía y sale con código 0", async () => {
  await withHabitsFile(async (habitsFile) => {
    const result = runCli(["list"], habitsFile);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /No hay hábitos registrados/);
  });
});

test("habits list: con hábitos imprime nombre, racha e indicador de marcado hoy", async () => {
  await withHabitsFile(async (habitsFile) => {
    runCli(["create", "Leer 20 minutos"], habitsFile);

    const result = runCli(["list"], habitsFile);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Leer 20 minutos/);
    assert.match(result.stdout, /racha/i);
  });
});
