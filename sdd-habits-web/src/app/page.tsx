import { createHabitAction, getHabits, markHabitDoneAction } from "./actions";

const ERROR_MESSAGES: Record<string, string> = {
  "nombre-vacio": "El nombre del hábito no puede estar vacío.",
  "habito-no-encontrado": "No se encontró el hábito indicado.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const habits = await getHabits();
  const errorMessage = error ? ERROR_MESSAGES[error] : undefined;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-6 py-12">
      <header>
        <h1 className="text-2xl font-semibold">Hábitos de estudio</h1>
        <p className="text-sm text-gray-500">
          Crea hábitos, márcalos como hechos hoy y sigue tu racha de días
          consecutivos.
        </p>
      </header>

      <section aria-labelledby="crear-habito">
        <h2 id="crear-habito" className="mb-2 text-lg font-medium">
          Crear hábito
        </h2>
        <form action={createHabitAction} className="flex gap-2">
          <label htmlFor="name" className="sr-only">
            Nombre del hábito
          </label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="Ej. Leer 20 minutos"
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Crear
          </button>
        </form>
        {errorMessage && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {errorMessage}
          </p>
        )}
      </section>

      <section aria-labelledby="mis-habitos">
        <h2 id="mis-habitos" className="mb-2 text-lg font-medium">
          Mis hábitos
        </h2>
        {habits.length === 0 ? (
          <p className="text-sm text-gray-500">
            No hay hábitos registrados todavía.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {habits.map((habit) => (
              <li
                key={habit.id}
                className="flex items-center justify-between rounded border border-gray-200 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{habit.name}</p>
                  <p className="text-sm text-gray-500">
                    Racha actual: {habit.streak}{" "}
                    {habit.streak === 1 ? "día" : "días"}
                    {habit.doneToday ? " · Hecho hoy" : ""}
                  </p>
                </div>
                <form action={markHabitDoneAction}>
                  <input type="hidden" name="habitId" value={habit.id} />
                  <button
                    type="submit"
                    disabled={habit.doneToday}
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {habit.doneToday ? "Hecho hoy" : "Marcar hecho hoy"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
