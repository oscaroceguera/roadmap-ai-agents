import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { HabitsData } from "./core.ts";

export const DEFAULT_HABITS_FILE = path.join(
  process.cwd(),
  "data",
  "habits.json",
);

export async function loadHabits(filePath: string): Promise<HabitsData> {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as HabitsData;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { habits: [] };
    }
    throw error;
  }
}

export async function saveHabits(
  data: HabitsData,
  filePath: string,
): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}
