import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateStreak, createHabit, listHabits, markHabitDone } from "./core.ts";
import type { Habit } from "./core.ts";

test("createHabit agrega un hábito con racha 0 cuando el nombre es válido", () => {
  const habits: Habit[] = [];

  const result = createHabit(habits, "Leer 20 minutos", "2026-09-04");

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.habit.name, "Leer 20 minutos");
  assert.equal(result.habit.createdAt, "2026-09-04");
  assert.deepEqual(result.habit.completedDates, []);
  assert.equal(typeof result.habit.id, "string");
  assert.ok(result.habit.id.length > 0);
  assert.deepEqual(result.habits, [result.habit]);
  assert.deepEqual(habits, [], "no debe mutar la lista original");
});

test("createHabit recorta espacios del nombre", () => {
  const result = createHabit([], "  Repasar matemáticas  ", "2026-09-04");

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.habit.name, "Repasar matemáticas");
});

test("createHabit rechaza un nombre vacío sin modificar la lista", () => {
  const habits: Habit[] = [];

  const result = createHabit(habits, "", "2026-09-04");

  assert.deepEqual(result, { ok: false, error: "NOMBRE_VACIO" });
  assert.deepEqual(habits, []);
});

test("createHabit rechaza un nombre compuesto solo por espacios", () => {
  const result = createHabit([], "    ", "2026-09-04");

  assert.deepEqual(result, { ok: false, error: "NOMBRE_VACIO" });
});

test("calculateStreak devuelve 0 si nunca fue marcado", () => {
  assert.equal(calculateStreak([], "2026-09-04"), 0);
});

test("calculateStreak devuelve 1 si fue marcado hoy por primera vez", () => {
  assert.equal(calculateStreak(["2026-09-04"], "2026-09-04"), 0 + 1);
});

test("calculateStreak incrementa con días consecutivos sin salto", () => {
  const fechas = ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04"];
  assert.equal(calculateStreak(fechas, "2026-09-04"), 4);
});

test("calculateStreak continúa la racha ante un salto de exactamente 1 día (día de gracia)", () => {
  const fechas = ["2026-09-01", "2026-09-03"];
  assert.equal(calculateStreak(fechas, "2026-09-03"), 2);
});

test("calculateStreak reinicia a 1 ante un salto de 2 o más días", () => {
  const fechas = ["2026-09-01", "2026-09-04"];
  assert.equal(calculateStreak(fechas, "2026-09-04"), 1);
});

test("calculateStreak no acumula ni agota el crédito de gracia entre saltos aislados no consecutivos", () => {
  // Salto de 1 día entre 09-01 y 09-03, luego otro salto de 1 día entre 09-03 y 09-05:
  // ninguno de los dos debería romper la racha porque no son saltos consecutivos de 2+.
  const fechas = ["2026-09-01", "2026-09-03", "2026-09-05"];
  assert.equal(calculateStreak(fechas, "2026-09-05"), 3);
});

test("calculateStreak es 0 si ya pasaron 2 o más días sin ninguna marca nueva", () => {
  const fechas = ["2026-09-01", "2026-09-02"];
  assert.equal(calculateStreak(fechas, "2026-09-05"), 0);
});

function habitFixture(overrides: Partial<Habit> = {}): Habit {
  return {
    id: "b3b1f6b0-8c1e-4a2a-9c3b-1e2f3a4b5c6d",
    name: "Leer 20 minutos",
    createdAt: "2026-09-01",
    completedDates: [],
    ...overrides,
  };
}

test("markHabitDone registra la primera marca del día y recalcula la racha", () => {
  const habit = habitFixture({ completedDates: ["2026-09-01", "2026-09-02"] });

  const result = markHabitDone([habit], habit.id, "2026-09-03");

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.habit.completedDates, [
    "2026-09-01",
    "2026-09-02",
    "2026-09-03",
  ]);
  assert.equal(result.streak, 3);
  assert.deepEqual(result.habits, [result.habit]);
});

test("markHabitDone es idempotente si el hábito ya estaba marcado hoy", () => {
  const habit = habitFixture({ completedDates: ["2026-09-03"] });

  const result = markHabitDone([habit], habit.id, "2026-09-03");

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.habit.completedDates, ["2026-09-03"]);
  assert.equal(result.streak, 1);
});

test("markHabitDone devuelve error si el id no existe y no modifica la lista", () => {
  const habit = habitFixture();
  const habits = [habit];

  const result = markHabitDone(habits, "id-inexistente", "2026-09-03");

  assert.deepEqual(result, { ok: false, error: "HABITO_NO_ENCONTRADO" });
  assert.deepEqual(habits, [habit]);
});

test("listHabits devuelve una lista vacía si no hay hábitos", () => {
  assert.deepEqual(listHabits([], "2026-09-04"), []);
});

test("listHabits indica nombre, racha y si fue marcado hoy para cada hábito", () => {
  const marcadoHoy = habitFixture({
    id: "habit-1",
    name: "Leer 20 minutos",
    completedDates: ["2026-09-03", "2026-09-04"],
  });
  const noMarcadoHoy = habitFixture({
    id: "habit-2",
    name: "Repasar matemáticas",
    completedDates: ["2026-09-01"],
  });

  const result = listHabits([marcadoHoy, noMarcadoHoy], "2026-09-04");

  assert.deepEqual(result, [
    { id: "habit-1", name: "Leer 20 minutos", streak: 2, doneToday: true },
    {
      id: "habit-2",
      name: "Repasar matemáticas",
      streak: 0,
      doneToday: false,
    },
  ]);
});
