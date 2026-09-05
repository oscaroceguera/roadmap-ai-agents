import { randomUUID } from "node:crypto";

export interface Habit {
  id: string;
  name: string;
  createdAt: string;
  completedDates: string[];
}

export interface HabitsData {
  habits: Habit[];
}

export type CreateHabitResult =
  | { ok: true; habit: Habit; habits: Habit[] }
  | { ok: false; error: "NOMBRE_VACIO" };

export function createHabit(
  habits: Habit[],
  name: string,
  today: string,
): CreateHabitResult {
  const trimmedName = name.trim();
  if (trimmedName === "") {
    return { ok: false, error: "NOMBRE_VACIO" };
  }

  const habit: Habit = {
    id: randomUUID(),
    name: trimmedName,
    createdAt: today,
    completedDates: [],
  };

  return { ok: true, habit, habits: [...habits, habit] };
}

function diffInDays(from: string, to: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const fromMs = Date.parse(`${from}T00:00:00Z`);
  const toMs = Date.parse(`${to}T00:00:00Z`);
  return Math.round((toMs - fromMs) / msPerDay);
}

export function calculateStreak(completedDates: string[], today: string): number {
  const dates = [...new Set(completedDates)].sort();
  if (dates.length === 0) {
    return 0;
  }

  const lastMarkedIndex = dates.findLastIndex((date) => date <= today);
  if (lastMarkedIndex === -1) {
    return 0;
  }

  const lastMarked = dates[lastMarkedIndex];
  if (diffInDays(lastMarked, today) >= 3) {
    return 0;
  }

  let streak = 1;
  let current = lastMarked;
  for (let i = lastMarkedIndex - 1; i >= 0; i--) {
    const candidate = dates[i];
    const gap = diffInDays(candidate, current);
    if (gap === 1 || gap === 2) {
      streak += 1;
      current = candidate;
    } else {
      break;
    }
  }

  return streak;
}

export type MarkHabitDoneResult =
  | { ok: true; habit: Habit; streak: number; habits: Habit[] }
  | { ok: false; error: "HABITO_NO_ENCONTRADO" };

export function markHabitDone(
  habits: Habit[],
  habitId: string,
  today: string,
): MarkHabitDoneResult {
  const index = habits.findIndex((habit) => habit.id === habitId);
  if (index === -1) {
    return { ok: false, error: "HABITO_NO_ENCONTRADO" };
  }

  const existing = habits[index];
  const completedDates = existing.completedDates.includes(today)
    ? existing.completedDates
    : [...existing.completedDates, today];

  const habit: Habit = { ...existing, completedDates };
  const updatedHabits = habits.map((h, i) => (i === index ? habit : h));

  return {
    ok: true,
    habit,
    streak: calculateStreak(habit.completedDates, today),
    habits: updatedHabits,
  };
}

export interface HabitListItem {
  id: string;
  name: string;
  streak: number;
  doneToday: boolean;
}

export function listHabits(habits: Habit[], today: string): HabitListItem[] {
  return habits.map((habit) => ({
    id: habit.id,
    name: habit.name,
    streak: calculateStreak(habit.completedDates, today),
    doneToday: habit.completedDates.includes(today),
  }));
}
