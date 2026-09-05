import { createHabit, listHabits, markHabitDone } from "../src/lib/habits/core.ts";
import {
  DEFAULT_HABITS_FILE,
  loadHabits,
  saveHabits,
} from "../src/lib/habits/storage.ts";
import { getTodayIso } from "../src/lib/habits/today.ts";

async function runCreate(name: string, filePath: string, today: string) {
  const data = await loadHabits(filePath);
  const result = createHabit(data.habits, name, today);

  if (!result.ok) {
    console.error("Error: el nombre del hábito no puede estar vacío.");
    process.exitCode = 1;
    return;
  }

  await saveHabits({ habits: result.habits }, filePath);
  console.log(
    `Hábito creado: ${result.habit.name} (id: ${result.habit.id}, racha: 0)`,
  );
}

async function runDone(habitId: string, filePath: string, today: string) {
  const data = await loadHabits(filePath);
  const result = markHabitDone(data.habits, habitId, today);

  if (!result.ok) {
    console.error("Error: no existe un hábito con ese id.");
    process.exitCode = 2;
    return;
  }

  await saveHabits({ habits: result.habits }, filePath);
  console.log(
    `Hábito "${result.habit.name}" marcado como hecho hoy. Racha actual: ${result.streak}.`,
  );
}

async function runList(filePath: string, today: string) {
  const data = await loadHabits(filePath);
  const items = listHabits(data.habits, today);

  if (items.length === 0) {
    console.log("No hay hábitos registrados todavía.");
    return;
  }

  for (const item of items) {
    console.log(
      `${item.name}\tracha: ${item.streak}\thecho hoy: ${item.doneToday ? "sí" : "no"}`,
    );
  }
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const filePath = process.env.HABITS_FILE ?? DEFAULT_HABITS_FILE;
  const today = getTodayIso();

  switch (command) {
    case "create":
      await runCreate(args.join(" "), filePath, today);
      return;
    case "done":
      await runDone(args[0] ?? "", filePath, today);
      return;
    case "list":
      await runList(filePath, today);
      return;
    default:
      console.error(
        `Comando desconocido: "${command}". Usa: create <nombre> | done <id> | list`,
      );
      process.exitCode = 1;
  }
}

await main();
