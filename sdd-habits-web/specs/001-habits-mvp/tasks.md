# Tasks 001: Habits MVP

Desglose de `plan.md` en tareas pequeñas (máx. 20-30 min cada una), ordenadas por dependencia. Cada tarea indica los RF/RNF que cubre y una condición "Hecho cuando:" verificable. Al terminar cualquier tarea, corre `pnpm test` y `pnpm lint` según exige `AGENTS.md`.

## 0. Configuración inicial del proyecto

- [x] **0.1 Inicializar el proyecto Next.js (App Router + TypeScript + Tailwind)**
  Cubre: RNF-1 (base de la app), principio 1 de la constitución.
  Hecho cuando: `pnpm dev` levanta una página por defecto sin errores en consola, y existen `tsconfig.json`, `tailwind.config.*` y `src/app/`.

- [x] **0.2 Crear `.nvmrc` con la versión de Node v22.23.2**
  Cubre: regla explícita de `AGENTS.md`.
  Hecho cuando: el archivo `.nvmrc` en la raíz contiene exactamente `v22.23.2` y `nvm use` (o equivalente) no da error.

- [x] **0.3 Configurar el test runner (Jest o Vitest) y el script `pnpm test`**
  Cubre: principio 4 de la constitución (política de tests).
  Hecho cuando: `pnpm test` corre sin tests (0 tests, 0 fallos) y sale con código 0.

## 1. Persistencia (`storage.ts`)

- [x] **1.1 Implementar `loadHabits` / `saveHabits` en `src/lib/habits/storage.ts`**
  Cubre: RNF-2.
  Hecho cuando: `loadHabits` sobre un archivo inexistente devuelve `{ habits: [] }` sin lanzar error, y `saveHabits` escribe el JSON con el esquema de `plan.md` sección 2.

- [x] **1.2 Tests de `storage.ts` con archivo temporal**
  Cubre: RNF-2.
  Hecho cuando: `pnpm test` pasa un test que guarda y vuelve a leer datos obteniendo el mismo contenido, y otro que confirma que un archivo inexistente inicializa lista vacía; ningún test toca `data/habits.json` real.

## 2. Lógica de negocio pura (`core.ts`)

- [x] **2.1 Implementar `createHabit(nombre)`**
  Cubre: RF-1.1, RF-1.2, RF-1.3.
  Hecho cuando: `createHabit` recorta espacios, agrega el hábito con racha 0 si el nombre no queda vacío, y devuelve error `NOMBRE_VACIO` sin modificar la lista si queda vacío tras el recorte.

- [x] **2.2 Tests de `createHabit`**
  Cubre: RF-1.1, RF-1.2, RF-1.3.
  Hecho cuando: `pnpm test` pasa casos de nombre válido (racha 0) y nombre vacío/solo espacios (error, lista sin cambios).

- [x] **2.3 Implementar `calculateStreak(fechasCompletadas, hoy)`**
  Cubre: RF-4.1, RF-4.2, RF-4.3, RF-4.4.
  Hecho cuando: la función sigue el pseudocódigo de `plan.md` sección 3 (día de gracia de 1 día, reinicio a 1 tras 2+ días salteados, 0 si nunca se marcó o si ya pasaron 2+ días sin marcar).

- [x] **2.4 Tests de `calculateStreak`**
  Cubre: RF-4.1, RF-4.2, RF-4.3, RF-4.4.
  Hecho cuando: `pnpm test` pasa los seis casos listados en `plan.md` sección 6 (sin marcas, primera marca, consecutivos, salto de 1, salto de 2+, saltos aislados no acumulables).

- [x] **2.5 Implementar `markHabitDone(habitId, hoy)`**
  Cubre: RF-2.1, RF-2.2, RF-2.3.
  Hecho cuando: marca la fecha `hoy` si no estaba marcada y recalcula racha con `calculateStreak`; si ya estaba marcada hoy devuelve el mismo estado sin duplicar ni dar error; si el id no existe devuelve error `HABITO_NO_ENCONTRADO` sin modificar datos.

- [x] **2.6 Tests de `markHabitDone`**
  Cubre: RF-2.1, RF-2.2, RF-2.3.
  Hecho cuando: `pnpm test` pasa casos de primera marca del día, marca repetida el mismo día (idempotencia) e id inexistente (error, sin mutación).

- [x] **2.7 Implementar `listHabits(hoy)`**
  Cubre: RF-3.1, RF-3.3.
  Hecho cuando: devuelve para cada hábito nombre, racha (vía `calculateStreak`) y si su última fecha completada es igual a `hoy`.

- [x] **2.8 Tests de `listHabits`**
  Cubre: RF-3.1, RF-3.3.
  Hecho cuando: `pnpm test` pasa un caso con lista vacía y un caso que verifica el indicador "marcado hoy" por hábito.

## 3. CLI de verificación manual (`scripts/habits-cli.ts`)

- [x] **3.1 Implementar `habits create <nombre>`**
  Cubre: RF-1.1, RF-1.2, RF-1.3.
  Hecho cuando: éxito imprime el hábito creado y sale con código 0; nombre vacío/solo espacios imprime error en stderr y sale con código 1 (tabla de `plan.md` sección 4).

- [x] **3.2 Implementar `habits done <id>`**
  Cubre: RF-2.1, RF-2.2, RF-2.3, RF-4.
  Hecho cuando: éxito (marca nueva o repetida) imprime la racha y sale con código 0; id inexistente imprime error en stderr y sale con código 2.

- [x] **3.3 Implementar `habits list`**
  Cubre: RF-3.1, RF-3.2, RF-3.3.
  Hecho cuando: con hábitos imprime tabla (nombre, racha, marcado hoy) y código 0; sin hábitos imprime "No hay hábitos registrados todavía." y código 0.

- [x] **3.4 Tests de contrato de `habits-cli.ts`**
  Cubre: RF-1, RF-2, RF-3 (verificación).
  Hecho cuando: `pnpm test` pasa un test por comando que valida el texto de salida relevante y el código de salida, reutilizando `core.ts`/`storage.ts` reales.

## 4. Server Actions (`actions.ts`)

- [x] **4.1 Implementar Server Action para crear hábito**
  Cubre: RF-1.1, RF-1.2, RF-1.3, RNF-3.
  Hecho cuando: llama a `createHabit` + `storage.ts`, y devuelve un mensaje de error en español para el caso de nombre vacío, sin reimplementar la validación en `actions.ts`.

- [x] **4.2 Implementar Server Action para marcar hábito como hecho**
  Cubre: RF-2.1, RF-2.2, RF-2.3, RNF-3.
  Hecho cuando: llama a `markHabitDone` + `storage.ts`, y devuelve un mensaje de error en español si el id no existe, sin reimplementar lógica de idempotencia.

- [x] **4.3 Implementar obtención de datos para el listado**
  Cubre: RF-3.1, RF-3.2, RF-3.3, RNF-3.
  Hecho cuando: la página puede obtener la lista de hábitos (vía `listHabits` + `storage.ts`) para renderizarla en `page.tsx`.

## 5. Interfaz (`page.tsx`)

- [x] **5.1 Formulario de creación de hábito**
  Cubre: RF-1.1.
  Hecho cuando: al enviar un nombre válido desde el navegador, el hábito aparece en el listado con racha 0; al enviar nombre vacío/solo espacios se muestra un mensaje de error en español sin crear el hábito.

- [x] **5.2 Listado de hábitos con racha e indicador "hecho hoy"**
  Cubre: RF-3.1, RF-3.3, RNF-1.
  Hecho cuando: cada hábito listado muestra su racha actual y si fue marcado hoy, reflejando cambios en menos de 1 segundo tras crear/marcar.

- [x] **5.3 Mensaje de estado vacío**
  Cubre: RF-3.2.
  Hecho cuando: sin ningún hábito creado, la página muestra un mensaje indicando que no hay hábitos registrados en vez de una lista vacía.

- [x] **5.4 Botón de marcar hábito como hecho**
  Cubre: RF-2.1, RF-2.2, RNF-1.
  Hecho cuando: al pulsar el botón la racha se actualiza en pantalla; al pulsarlo de nuevo el mismo día no cambia el estado ni muestra error.

## 6. Verificación final

- [x] **6.1 Verificación manual contra los criterios de finalización de `spec.md`**
  Cubre: todos los RF (RF-1 a RF-4) y RNF-1 a RNF-4.
  Hecho cuando: siguiendo `pnpm dev`, se ejecutan a mano los tres flujos de "Criterios de finalización" de `spec.md` y todos se comportan como se describe, sin dudas `[NECESITA ACLARACIÓN]` pendientes.

- [x] **6.2 Verificación de tipado y lint**
  Cubre: RNF-4, requisito de cierre de `AGENTS.md`.
  Hecho cuando: `pnpm test` y `pnpm lint` corren sin errores de tipado ni tests fallidos.
