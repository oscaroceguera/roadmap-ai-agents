"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createHabit,
  listHabits,
  markHabitDone,
  type HabitListItem,
} from "@/lib/habits/core";
import {
  DEFAULT_HABITS_FILE,
  loadHabits,
  saveHabits,
} from "@/lib/habits/storage";
import { getTodayIso } from "@/lib/habits/today";

export async function getHabits(): Promise<HabitListItem[]> {
  const data = await loadHabits(DEFAULT_HABITS_FILE);
  return listHabits(data.habits, getTodayIso());
}

export async function createHabitAction(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "");
  const data = await loadHabits(DEFAULT_HABITS_FILE);
  const result = createHabit(data.habits, name, getTodayIso());

  if (!result.ok) {
    redirect("/?error=nombre-vacio");
  }

  await saveHabits({ habits: result.habits }, DEFAULT_HABITS_FILE);
  revalidatePath("/");
}

export async function markHabitDoneAction(formData: FormData): Promise<void> {
  const habitId = String(formData.get("habitId") ?? "");
  const data = await loadHabits(DEFAULT_HABITS_FILE);
  const result = markHabitDone(data.habits, habitId, getTodayIso());

  if (!result.ok) {
    redirect("/?error=habito-no-encontrado");
  }

  await saveHabits({ habits: result.habits }, DEFAULT_HABITS_FILE);
  revalidatePath("/");
}
