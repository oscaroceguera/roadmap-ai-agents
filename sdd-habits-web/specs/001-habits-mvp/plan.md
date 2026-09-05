# Plan 001: Habits MVP

Este documento traduce `spec.md` (el qué y el por qué) en decisiones técnicas (el cómo), respetando `docs/constitution.md`. Ante cualquier conflicto, `spec.md` prevalece sobre este plan. Las tres dudas marcadas `[NECESITA ACLARACIÓN]` en la spec (unicidad de nombre, zona horaria de "hoy", largo máximo del nombre) siguen abiertas como decisiones de negocio; este plan las aísla técnicamente para no bloquear el resto del diseño (ver sección 5, decisiones 1, 3 y 7).

## 1. Estructura de módulos

```
sdd-habits-web/
├── src/
│   ├── lib/
│   │   └── habits/
│   │       ├── core.ts        # Lógica pura: crear, marcar, listar, calcular racha
│   │       └── storage.ts     # Leer/escribir data/habits.json
│   └── app/
│       ├── page.tsx           # Server Component: formulario + listado
│       └── actions.ts         # Server Actions: orquestan core.ts + storage.ts
├── scripts/
│   └── habits-cli.ts          # Contrato de comandos para desarrollo y pruebas manuales
└── data/
    └── habits.json            # Persistencia local (no versionado en git)
```

| Módulo | Responsabilidad | Cubre |
|---|---|---|
| `core.ts` | `createHabit`, `markHabitDone`, `listHabits`, `calculateStreak`. Sin imports de React/Next ni acceso a disco (constitución, principio 3). | RF-1, RF-2, RF-3, RF-4, RNF-4 |
| `storage.ts` | `loadHabits` / `saveHabits`, único punto de lectura/escritura de `data/habits.json`. | RNF-2 |
| `actions.ts` | Server Actions que llaman a `core.ts` + `storage.ts` y traducen los resultados a mensajes en español; no reimplementan reglas de negocio (constitución, principio 3). | RF-1, RF-2, RF-3, RNF-3 |
| `page.tsx` | Formulario de creación, botón de marcar, listado con racha e indicador "hecho hoy". | RF-1.1, RF-2.1/2.2, RF-3.1/3.2/3.3, RNF-1 |
| `scripts/habits-cli.ts` | Expone el mismo contrato de comandos (sección 4) por línea de comandos, para verificar `core.ts`/`storage.ts` sin levantar la UI. | RF-1, RF-2, RF-3 (verificación) |

**Contratos de `core.ts`** (firmas descriptivas, sin implementación):

- `createHabit(nombre)`: recorta espacios; si el resultado no está vacío, agrega el hábito con racha 0 y devuelve el hábito creado; si queda vacío, devuelve un resultado de error `NOMBRE_VACIO` sin modificar la lista. — Cubre RF-1.1, RF-1.2, RF-1.3.
- `markHabitDone(habitId, hoy)`: si el id existe y no estaba marcado hoy, agrega `hoy` a sus fechas completadas y devuelve el hábito con racha recalculada; si ya estaba marcado hoy, devuelve el mismo estado sin error (idempotente); si el id no existe, devuelve un resultado de error `HABITO_NO_ENCONTRADO`. — Cubre RF-2.1, RF-2.2, RF-2.3.
- `listHabits(hoy)`: devuelve, para cada hábito, su nombre, su racha (vía `calculateStreak`) y si su última fecha completada es igual a `hoy`. — Cubre RF-3.1, RF-3.3 (RF-3.2 se resuelve en la capa de presentación cuando la lista devuelta está vacía).
- `calculateStreak(fechasCompletadas, hoy)`: función pura, ver algoritmo en sección 3. — Cubre RF-4.1 a RF-4.4.

## 2. Modelo de datos (JSON)

Archivo único `data/habits.json`, leído y escrito completo en cada operación (volumen esperado: un usuario, decenas de hábitos).

```json
{
  "habits": [
    {
      "id": "b3b1f6b0-8c1e-4a2a-9c3b-1e2f3a4b5c6d",
      "name": "Leer 20 minutos",
      "createdAt": "2026-09-01",
      "completedDates": ["2026-09-01", "2026-09-02", "2026-09-04"]
    },
    {
      "id": "a1c2d3e4-5f60-4718-9a2b-3c4d5e6f7080",
      "name": "Repasar matemáticas",
      "createdAt": "2026-09-03",
      "completedDates": []
    }
  ]
}
```

| Campo | Tipo | Descripción | Cubre |
|---|---|---|---|
| `id` | string (UUID) | Identidad estable del hábito, independiente del nombre. | RF-1, RF-2.3 |
| `name` | string | Nombre tal como lo ingresó el usuario, recortado de espacios. | RF-1.1, RF-1.3 |
| `createdAt` | string ISO `YYYY-MM-DD` | Fecha de creación, solo auditoría; no interviene en el cálculo de racha. | RF-1.2 |
| `completedDates` | string[] (ISO `YYYY-MM-DD`) | Fechas marcadas como hechas, sin duplicados. Única fuente de verdad para la racha; no se guarda ningún contador cacheado. | RF-2, RF-4, RNF-2 |

No se persiste un campo `streak`: se deriva siempre de `completedDates` (justificación en sección 5, decisión 2).

## 3. Algoritmo de cálculo de racha (pseudocódigo)

Cubre RF-4.1, RF-4.2, RF-4.3, RF-4.4. Recibe `hoy` como parámetro (nunca lee el reloj internamente, ver decisión 3).

```
ALGORITMO calcularRacha(fechasCompletadas, hoy)
  fechas ← ordenar_ascendente(quitar_duplicados(fechasCompletadas))
  SI fechas está vacío ENTONCES
    DEVOLVER 0
  FIN SI

  ultimaMarca ← la fecha más reciente de "fechas" que sea <= hoy
  SI no existe tal fecha ENTONCES
    DEVOLVER 0
  FIN SI

  // Si ya pasaron 2 días completos sin marcar, la racha está rota
  // aunque todavía no haya ocurrido un nuevo intento de marcado (RF-4.3).
  SI diferenciaEnDias(ultimaMarca, hoy) >= 3 ENTONCES
    DEVOLVER 0
  FIN SI

  racha ← 1
  actual ← ultimaMarca
  PARA i DESDE (posición de ultimaMarca en "fechas" - 1) HASTA 0, DECREMENTANDO
    candidata ← fechas[i]
    salto ← diferenciaEnDias(candidata, actual)
    SI salto == 1 ENTONCES                 // día consecutivo, sin salto
      racha ← racha + 1
      actual ← candidata
    SINO SI salto == 2 ENTONCES            // exactamente un día salteado (día de gracia, RF-4.2)
      racha ← racha + 1
      actual ← candidata
    SINO
      DETENER el bucle                     // 2+ días salteados: la cadena se corta aquí (RF-4.3)
    FIN SI
  FIN PARA

  DEVOLVER racha
FIN ALGORITMO
```

Notas de diseño:
- El crédito de gracia no se acumula ni se agota: cada transición entre dos fechas marcadas se evalúa de forma independiente, por lo que un salto aislado de 1 día nunca se "gasta" de forma permanente (RF-4.4).
- La racha se recalcula igual desde `listHabits` que desde `markHabitDone`: no hay un camino de cálculo distinto para listar vs. marcar (ver decisión 2, sección 5).

## 4. Contrato de comandos ("CLI")

**Nota de interpretación**: la constitución fija Next.js como única interfaz de producto (principio 1). El contrato de comandos aquí definido se implementa como herramienta de desarrollo y pruebas manuales (`scripts/habits-cli.ts`), consumiendo las mismas funciones de `core.ts`/`storage.ts` que usan las Server Actions — no sustituye ni compite con la interfaz web.

### `habits create <nombre>`
- Éxito: imprime el hábito creado (id, nombre, racha 0). Código de salida `0`.
- Error (nombre vacío o solo espacios): mensaje de error en español a stderr. Código de salida `1`.
- Cubre: RF-1.1, RF-1.2, RF-1.3.

### `habits done <id>`
- Éxito, primera marca del día: confirmación con la racha recalculada. Código `0`.
- Éxito, ya marcado hoy: mismo mensaje de estado, sin error ni duplicado (idempotente). Código `0`.
- Error, id inexistente: mensaje de error a stderr. Código `2`.
- Cubre: RF-2.1, RF-2.2, RF-2.3, RF-4.

### `habits list`
- Éxito, con hábitos: tabla con nombre, racha actual e indicador de marcado hoy. Código `0`.
- Éxito, sin hábitos: mensaje "No hay hábitos registrados todavía." Código `0` (estado válido, no error).
- Cubre: RF-3.1, RF-3.2, RF-3.3.

### Códigos de salida

| Código | Significado | Cuándo aplica |
|---|---|---|
| `0` | Éxito, incluye casos idempotentes y listas vacías | Cualquier comando con operación válida |
| `1` | Error de validación de entrada del usuario | `create` con nombre vacío/solo espacios |
| `2` | Recurso no encontrado | `done` con un id que no existe |

Las Server Actions de `actions.ts` exponen el mismo contrato (mismos casos de éxito/error), cambiando solo el canal de salida: un objeto de resultado en vez de stdout/stderr y código de proceso, traducido a un mensaje en español en `page.tsx` (RNF-3).

## 5. Decisiones técnicas justificadas

1. **Identidad del hábito por `id` (UUID), no por nombre.** Permite resolver RF-2.3 ("hábito no existe") sin depender de si se permiten nombres duplicados. *Alternativa descartada*: usar el nombre como clave única — obligaría a resolver ahora mismo la pregunta abierta `[NECESITA ACLARACIÓN]` sobre duplicados en la spec.
2. **La racha se deriva siempre de `completedDates`, sin campo cacheado.** Garantiza que `listHabits` y `markHabitDone` muestren siempre el mismo valor "actual" (RF-3.1), incluso si pasó tiempo sin marcar. *Alternativa descartada*: guardar un contador `streak` actualizado solo al marcar — quedaría desactualizado al listar tras días sin marcar, contradiciendo RF-3.1.
3. **`hoy` se inyecta como parámetro en `core.ts`, nunca se lee el reloj dentro del módulo.** Aísla la pregunta abierta sobre zona horaria a un único punto de llamada (en `actions.ts`/`habits-cli.ts`) y hace las funciones puras y testeables (constitución, principios 3 y 4). *Alternativa descartada*: usar `new Date()` dentro de `core.ts` — impediría tests determinísticos y mezclaría lógica con entorno de ejecución.
4. **Persistencia en un único archivo JSON (`data/habits.json`), leído/escrito completo por operación.** Suficiente para un usuario y volumen educativo; cumple el principio 5 de la constitución tal cual. *Alternativa descartada*: una base de datos embebida (SQLite) — violaría los principios 1 y 5 de la constitución (stack simple, persistencia declarada como JSON).
5. **Generación de `id` con `crypto.randomUUID()` nativo.** Disponible en el runtime de Node y de Next.js sin dependencias adicionales. *Alternativa descartada*: añadir la librería `uuid` — prohibido por el principio 1 de la constitución sin antes actualizar la spec, y no aporta nada que el runtime no dé ya.
6. **`scripts/habits-cli.ts` se ejecuta con el soporte nativo de TypeScript de Node 22 (`--experimental-strip-types`), sin transpilador adicional.** El `.nvmrc` ya fija Node v22.23.2, que soporta ejecutar `.ts` simples sin build previo. *Alternativa descartada*: añadir `tsx` o `ts-node` como devDependency — nueva dependencia no justificada dado que el runtime ya cubre el caso de uso.
7. **Fechas como string ISO `YYYY-MM-DD`, calculadas con la hora del servidor.** Asunción explícita mientras la spec no resuelva `[NECESITA ACLARACIÓN]` sobre zona horaria; al resolverse, el cambio queda contenido en el punto donde se obtiene `hoy` (decisión 3), sin tocar `core.ts`. *Alternativa descartada*: timestamps con hora completa — granularidad innecesaria para una unidad de "día".
8. **Un solo conjunto de reglas de negocio (`core.ts`) consumido tanto por `actions.ts` como por `habits-cli.ts`.** Evita duplicar la lógica de RF-1 a RF-4 en dos lugares. *Alternativa descartada*: implementar la CLI con su propia copia de las reglas — violaría el principio 3 de la constitución (separación lógica/interfaz, lógica solo en `core.ts`).

## 6. Estrategia de tests

Conforme al principio 4 de la constitución: toda función exportada de `core.ts` tiene tests unitarios antes de mergear; `pnpm test` debe pasar en cada cambio.

- **`core.ts` (unitarios, sin I/O, fechas inyectadas como parámetro fijo — nunca el reloj real):**
  - `createHabit`: nombre válido → racha 0 (RF-1.1, RF-1.2); nombre vacío o solo espacios → error, sin modificar la lista (RF-1.3).
  - `markHabitDone`: primera marca del día → racha recalculada (RF-2.1); segunda marca el mismo día → mismo estado, sin error (RF-2.2, idempotencia); id inexistente → error, sin modificar datos (RF-2.3).
  - `calculateStreak`: sin marcas → 0; marcado hoy por primera vez → 1; días consecutivos sin salto → incrementa; salto de exactamente 1 día → continúa (RF-4.2); salto de 2+ días → reinicia a 1 (RF-4.3); saltos aislados no consecutivos → nunca rompen la racha (RF-4.4); han pasado 2+ días sin ninguna marca nueva → racha ya en 0 al listar, sin necesidad de una acción de marcado.
  - `listHabits`: lista vacía (RF-3.2); indicador "marcado hoy" correcto por hábito (RF-3.3).
- **`storage.ts` (integración ligera, con archivo temporal por test, nunca el archivo real de datos):** guardar y volver a leer produce los mismos datos; archivo inexistente inicializa una lista vacía (RNF-2).
- **`scripts/habits-cli.ts` (contrato):** un test por comando que valida el texto de salida relevante y el código de salida de la tabla de la sección 4, reutilizando `core.ts`/`storage.ts` reales — no reimplementa aserciones de reglas de negocio ya cubiertas arriba.
- **`actions.ts` y `page.tsx`:** sin tests unitarios (dependen del runtime de Next.js); se verifican manualmente con `pnpm dev` siguiendo los criterios de finalización de `spec.md` antes de cerrar la tarea, junto con `pnpm lint`, tal como exige `AGENTS.md`.
