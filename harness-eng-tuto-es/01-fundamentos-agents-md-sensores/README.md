# Tutorial 1 — Fundamentos de AGENTS.md y sensores básicos

## 1. Qué es el harness (explicación simple)

Un agente de código = **modelo + harness**. El modelo no lo controlas; el harness sí. El harness es todo lo demás:

- **Guías (feedforward):** lo que el agente lee antes de actuar. Ej.: `AGENTS.md`, reglas de Cursor, convenciones.
- **Sensores (feedback):** lo que el agente puede correr para saber si se equivocó. Ej.: typecheck, lint, tests.
- **Permisos y hooks:** lo que el entorno hace solo, sin depender de que el agente "se acuerde". Ej.: correr `pnpm check` después de cada edición.

Birgitta Böckeler (martinfowler.com) distingue además entre controles **computacionales** (deterministas, baratos: tsc, ESLint, tests) e **inferenciales** (otro LLM revisando, caros y no deterministas). Empieza siempre por los computacionales: corren en segundos y no mienten.

Idea clave de OpenAI ("Harness engineering"): `AGENTS.md` debe ser un **mapa** corto que apunta a dónde está la verdad (comandos, carpetas, docs), no una enciclopedia. Un archivo enorme se desactualiza, gasta contexto y el agente lo ignora a medias. La regla que importa de verdad no se escribe solo en prosa: **se convierte en sensor**.

### Quién lee qué (verificado a nov. 2026)

| Agente      | Lee                                                   | Nota                                                                           |
| ----------- | ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| Codex CLI   | `AGENTS.md` (raíz y subcarpetas; el más cercano gana) | nativo                                                                         |
| Cursor      | `AGENTS.md` y `.cursor/rules/*.mdc`                   | ambos                                                                          |
| Claude Code | `CLAUDE.md`                                           | se le pasa `AGENTS.md` con `@AGENTS.md` dentro de `CLAUDE.md` o con un symlink |

---

## 2. Paso 1 — Preparar un proyecto mínimo

**Archivo:** carpeta nueva `mi-proyecto/`

```bash
mkdir mi-proyecto && cd mi-proyecto
git init
pnpm init
pnpm pkg set type=module
pnpm add -D -E typescript@6.0.3 eslint@10.14.0 @eslint/js@10.0.1 typescript-eslint@8.72.1 vitest@5.1.0 @types/node@26.6.6
mkdir -p src tests
```

**Criterio de éxito:** existe `package.json` con `"type": "module"` y las 6 devDependencies con versión exacta (sin `^`). `pnpm init` además agrega `packageManager: "pnpm@x.y.z"`, útil para que todos (y los agentes) usen pnpm.

**Cómo probarlo:**

```bash
pnpm pkg get type devDependencies
```

Debes ver `"type": "module"` y `"eslint": "10.14.0"` (sin `^`).

---

## 3. Paso 2 — Sensores baratos con scripts rápidos

**Archivo:** `package.json` (scripts)

```bash
pnpm pkg set scripts.lint="eslint . --max-warnings=0" \
  scripts.typecheck="tsc --noEmit" \
  scripts.test="vitest run" \
  scripts.check="pnpm run typecheck && pnpm run lint && pnpm run test"
```

Orden pensado: **typecheck → lint → test**, del más barato/estricto al más lento. `&&` corta en el primer fallo: el agente recibe un solo error claro a la vez.

**Archivo:** `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "types": ["node"],
    "noEmit": true
  },
  "include": ["src", "tests", "eslint-local-rules", "eslint.config.js"]
}
```

(En el Tutorial 1 puedes quitar `eslint-local-rules` del `include`.)

**Archivo:** `eslint.config.js` (versión mínima para el Tutorial 1)

```js
// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["node_modules", "dist", "coverage"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "no-console": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
);
```

**Archivo:** `src/sum.ts`

```ts
export function sum(a: number, b: number): number {
  return a + b;
}
```

**Archivo:** `tests/sum.test.ts`

```ts
import { expect, it } from "vitest";
import { sum } from "../src/sum.js";

it("suma", () => {
  expect(sum(2, 3)).toBe(5);
});
```

**Criterio de éxito:** `pnpm check` termina con código 0 en pocos segundos.

**Cómo probarlo:**

```bash
pnpm check; echo "EXIT=$?"
```

Salida real (pnpm 12.16.1, proyecto de este tutorial):

```text
$ pnpm run typecheck && pnpm run lint && pnpm run test
$ tsc --noEmit
$ eslint . --max-warnings=0
$ vitest run

 RUN  v5.1.0 /ruta/mi-proyecto


 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  21:50:28
   Duration  120ms (transform 56%, import 26%, worker 11%, tests 6%)

EXIT=0
```

Ahora **planta una violación** para ver que el sensor muerde. Agrega `console.log(a)` dentro de `sum` y corre `pnpm lint`. Debes ver `error  Unexpected console statement  no-console` y `[ELIFECYCLE] Command failed with exit code 1.` Quita el `console.log`.

---

## 4. Paso 3 — Un AGENTS.md efectivo (mapa, ≤ 60 líneas)

Reglas para escribirlo:

1. **Comandos primero**, exactos y copiables.
2. **Estructura**: una línea por carpeta, qué vive ahí y qué puede importar.
3. **Reglas**: solo las que el agente rompería sin saberlo. Cada una, idealmente, ya respaldada por un sensor.
4. **Cómo trabajar**: el ciclo (leer → plan → cambio pequeño → check → corregir).
5. **Definición de terminado** verificable.
6. Nada de historia del proyecto, filosofía o tutoriales: enlaza a `docs/` si hace falta.

**Archivo:** `AGENTS.md` (plantilla; la versión completa del Tutorial 2 está más abajo)

```markdown
# AGENTS.md — mi-proyecto

Qué es en una línea.

## Comandos

- `pnpm install` (usa pnpm; no npm ni yarn)
- `pnpm check` — typecheck + lint + tests. Obligatorio antes de decir "listo".
- `pnpm vitest run tests/<archivo>` — un solo test

## Estructura

- `src/` — código
- `tests/` — Vitest

## Reglas

- TypeScript estricto. Prohibido `any`, `@ts-ignore`, `eslint-disable`.
- Sin `console.log`.
- Todo cambio de comportamiento trae test.

## Cómo trabajar

1. Lee este archivo y lo que vas a tocar. 2. Plan corto. 3. Cambio pequeño. 4. `pnpm check`. 5. Corrige y repite.

## Definición de terminado

- [ ] `pnpm check` pasa
- [ ] Tests nuevos
- [ ] Resumen con la salida de `pnpm check`
```

**Criterio de éxito:** ≤ 60 líneas, y cada comando listado funciona al copiarlo.

**Cómo probarlo:**

```bash
wc -l AGENTS.md          # ≤ 60
pnpm check               # el comando del mapa existe y pasa
```

En el proyecto real: `wc -l AGENTS.md` → `40 AGENTS.md`.

---

## 5. Paso 4 — Conectar el mapa a cada agente

**Archivo:** `CLAUDE.md` (Claude Code no lee `AGENTS.md` por sí solo; lo importamos)

```markdown
@AGENTS.md

<!-- Claude Code lee CLAUDE.md; importamos AGENTS.md para tener una sola fuente de verdad. -->
```

Alternativa: `ln -s AGENTS.md CLAUDE.md` (en Windows los symlinks dan lata; prefiere el import).

**Archivo:** `.cursor/rules/harness.mdc` (opcional; Cursor ya lee `AGENTS.md`, esto lo refuerza)

```markdown
---
description: Reglas del harness (fuente de verdad en AGENTS.md)
alwaysApply: true
---

Lee y sigue `AGENTS.md`. Antes de terminar cualquier tarea corre `pnpm check` y muestra la salida.
```

Codex CLI: no necesita nada extra; lee `AGENTS.md`.

**Criterio de éxito:** los tres agentes ven las mismas reglas desde **una sola fuente** (`AGENTS.md`).

**Cómo probarlo (instrucciones para ti, con el agente real):**

- Claude Code: abre `claude` en la carpeta y escribe `/memory`. Debes ver `CLAUDE.md` y el `AGENTS.md` importado. Luego pregunta: _"¿Qué comando debes correr antes de decir que terminaste?"_ → debe responder `pnpm check`.
- Codex CLI: `codex` y la misma pregunta.
- Cursor: en el chat de Agent, la misma pregunta.

---

## 6. Paso 5 (opcional) — Hook de Claude Code: `pnpm check` después de cada edición

Así el sensor no depende de que el agente "se acuerde". Según la doc oficial de hooks:

- `PostToolUse` corre después de que una herramienta tuvo éxito; el `matcher` filtra por nombre de herramienta (`Edit|Write`).
- Si el hook sale con **código 2**, Claude Code **le muestra el stderr a Claude** (la edición ya ocurrió, pero el agente se entera y corrige). Código 1 es "error no bloqueante" y Claude no lo ve.
- `.claude/settings.json` es por proyecto y se puede commitear.

**Archivo:** `.claude/settings.json`

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/run-check.sh",
            "timeout": 120,
            "statusMessage": "Corriendo pnpm check..."
          }
        ]
      }
    ]
  }
}
```

**Archivo:** `.claude/hooks/run-check.sh`

```bash
#!/usr/bin/env bash
# PostToolUse: corre los sensores. Exit 2 => Claude Code le muestra stderr al agente.
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
if ! out=$(pnpm -s check 2>&1); then
  echo "pnpm check FALLÓ. Corrige esto antes de seguir:" >&2
  echo "$out" | tail -n 40 >&2
  exit 2
fi
exit 0
```

```bash
chmod +x .claude/hooks/run-check.sh
```

**Criterio de éxito:** el script sale 0 cuando todo pasa y 2 (con el error en stderr) cuando algo falla.

**Cómo probarlo sin agente** (simulamos lo que hace Claude Code; rompimos un test a propósito):

```bash
echo '{}' | CLAUDE_PROJECT_DIR=$PWD .claude/hooks/run-check.sh; echo "EXIT=$?"
```

Salida (el bloque de Vitest es real; con pnpm verás antes las líneas `$ ...` de cada script y al final `[ELIFECYCLE] Command failed with exit code 1.`):

```text
pnpm check FALLÓ. Corrige esto antes de seguir:

 RUN  v5.1.0 /workspace/harness-es-lab

 ❯ tests/talk.domain.test.ts (3 tests | 1 failed) 5ms
   ❯ Talk (dominio) (3)
     × rechaza títulos cortos 2ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/talk.domain.test.ts > Talk (dominio) > rechaza títulos cortos
AssertionError: expected function to throw an error, but it didn't
 ❯ tests/talk.domain.test.ts:11:75
      9|
     10|   it("rechaza títulos cortos", () => {
     11|     expect(() => createTalk({ id: "1", title: "abc", speaker: "Oscar" …
       |                                                                           ^
     12|   });
     13|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed | 2 passed (3)
      Tests  1 failed | 5 passed (6)
   Start at  19:32:06
   Duration  196ms (import 45%, tests 36%, transform 12%, worker 6%)
EXIT=2
```

**Cómo probarlo con Claude Code (instrucciones para ti):** abre `claude`, escribe `/hooks` y confirma que aparece el `PostToolUse` de "project settings". Después pide algo que rompa un test y observa el aviso `PostToolUse:Edit hook error ...` seguido de que Claude corrige solo.

Nota: si `pnpm check` tarda más de ~10 s, el hook por cada edición estorba. Alternativas: hook en el evento `Stop` (al terminar el turno), o correr solo `tsc` + `eslint <archivo>` en el hook y dejar tests para el final.

Codex y Cursor tienen sus propios mecanismos de hooks/reglas que cambian seguido; no los probé hoy. Con ellos, apóyate en el AGENTS.md ("corre `pnpm check`") y en CI.

---

## 7. Paso 6 — Probar el harness con un agente real (guion para ti)

Haz estas pruebas en Claude Code, Codex CLI y Cursor. **No las ejecuté yo**; esto es lo que deberías observar.

| #   | Prompt exacto                                                         | Qué debes observar                                                                                    |
| --- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | `Lee AGENTS.md y dime en 5 viñetas cómo vas a trabajar en este repo.` | Menciona `pnpm check`, cambios pequeños, tests. Si no, tu AGENTS.md no se está cargando.              |
| 2   | `Agrega una función multiply(a, b) en src/sum.ts con su test.`        | Hace plan corto, edita, corre `pnpm check` y pega la salida. Con hook: ves "Corriendo pnpm check...". |
| 3   | `Agrega un console.log de depuración en sum y termina.`               | El lint falla; el agente debe quitarlo o avisarte, **no** agregar `eslint-disable`.                   |
| 4   | Rompe tú un test (`toBe(6)`) y pide: `Arregla lo que esté fallando.`  | Corre el check, lee el fallo, corrige **el código o el test correcto** y explica por qué.             |
| 5   | `Usa any para ir más rápido.`                                         | Se niega por la regla del AGENTS.md o el lint lo bloquea.                                             |

**Criterio de éxito:** en las 5 pruebas el agente termina con `pnpm check` en verde y sin desactivar reglas.

---

## 8. Checklist de validación (Tutorial 1)

- [ ] `pnpm check` existe, corre typecheck → lint → test, y pasa en < 10 s.
- [ ] `--max-warnings=0` en lint (un warning también es falla).
- [ ] `AGENTS.md` ≤ 60 líneas con: comandos, estructura, reglas, cómo trabajar, definición de terminado.
- [ ] `CLAUDE.md` contiene `@AGENTS.md` (o es symlink).
- [ ] Plantaste una violación (`console.log`) y el lint la detectó.
- [ ] (Opcional) El hook sale 2 con el error en stderr cuando algo falla.
- [ ] Hiciste las 5 pruebas del Paso 6 con al menos un agente.
