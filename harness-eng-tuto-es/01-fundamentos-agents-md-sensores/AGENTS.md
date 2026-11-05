# AGENTS.md - fundamentos-harness

Este proyecto me permite practicar como usar harness (fundamentos agents md sensores).

## Comandos

- `nvm use` (usa la version de node.js especificada)
- `pnpm install` - (usa pnpm; no npm ni yarn)
- `pnpm check` - typecheck + lint + test. Obligatorio para decir "Listo".
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
