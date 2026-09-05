import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadHabits, saveHabits } from "./storage.ts";

async function withTempFile(run: (filePath: string) => Promise<void>) {
  const dir = await mkdtemp(path.join(tmpdir(), "habits-storage-"));
  const filePath = path.join(dir, "habits.json");
  try {
    await run(filePath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("loadHabits devuelve lista vacía si el archivo no existe", async () => {
  await withTempFile(async (filePath) => {
    const data = await loadHabits(filePath);
    assert.deepEqual(data, { habits: [] });
  });
});

test("saveHabits y luego loadHabits devuelven los mismos datos", async () => {
  await withTempFile(async (filePath) => {
    const original = {
      habits: [
        {
          id: "b3b1f6b0-8c1e-4a2a-9c3b-1e2f3a4b5c6d",
          name: "Leer 20 minutos",
          createdAt: "2026-09-01",
          completedDates: ["2026-09-01", "2026-09-02"],
        },
      ],
    };

    await saveHabits(original, filePath);
    const loaded = await loadHabits(filePath);

    assert.deepEqual(loaded, original);
  });
});
