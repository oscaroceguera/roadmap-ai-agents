# AGENTS.md — harness-es-lab

API de charlas (Talk) en TypeScript + Express. Este archivo es un **mapa**, no un manual.

## Comandos

- `nvm use` - usar la version de node descrita en el archivo .nvmrc
- `pnpm install` — instalar dependencias (versiones exactas, no actualices sin pedirlo)
- `pnpm check` — typecheck + lint + tests. **Obligatorio antes de decir "listo".**
- `pnpm typecheck` · `pnpm lint` · `pnpm test` — sensores por separado
- `pnpm exec vitest run tests/<archivo>` — un solo test
- `pnpm dev` — levanta la API en http://localhost:3000

## Estructura (capas)

- `src/domain/` — entidades y reglas puras. No importa NADA de otras capas ni librerías.
- `src/application/` — casos de uso y puertos (interfaces). Solo importa `domain`.
- `src/infrastructure/` — adaptadores (repos, reloj, Prisma). Importa `application` y `domain`.
- `src/ui/` — HTTP/React. Solo importa `application`.
- `src/main.ts` — composition root; único lugar que conecta todas las capas.
- `tests/` — Vitest. `architecture.test.ts` vigila las capas.

Las capas las hace cumplir ESLint (`eslint.config.js`). Si lint falla por una capa, mueve el código; no desactives la regla.

## Reglas

- TypeScript estricto. Prohibido `any`, `@ts-ignore` y `eslint-disable`.
- Sin `console.log`; en `main.ts` usa `process.stdout.write`.
- El dominio no lee el reloj: recibe `now: Date` (regla `local/no-clock-in-domain`).
- Imports relativos con extensión `.js` (ESM NodeNext).
- Todo cambio de comportamiento trae su test.
- No agregues dependencias sin preguntar.

## Cómo trabajar

1. Lee este archivo y los archivos que vas a tocar.
2. Escribe un plan corto (3–6 pasos) antes de editar.
3. Haz cambios pequeños; después de cada uno corre `pnpm check`.
4. Si falla, lee el error, corrígelo y vuelve a correr. No ignores sensores.

## Definición de terminado

- [ ] `pnpm check` pasa sin warnings
- [ ] Tests nuevos para el comportamiento nuevo
- [ ] Ninguna regla de capas violada ni desactivada
- [ ] Resumen final: qué cambió, qué archivos, salida de `pnpm check`
