# AGENTS.md — habits-web

## Proyecto

Aplicación web en Next.js para registrar hábitos de estudio y calcular rachas de días consecutivos. Núcleo puro (`src/lib/habits/core.ts`) + capa de UI y Server Actions (`src/app/page.tsx`, `src/app/actions.ts`). Persistencia en JSON local (`src/lib/habits/storage.ts`).

## Comandos

- Ejecutar en desarrollo: `pnpm dev` (o `npm rundev` / `yarn dev`)
- Construir producción: `pnpm build`
- Tests: `pnpm test` (usando Jest o Vitest)
- Linter: `pnpm lint`

## Estilo

- TypeScript estricto, tipado fuerte (interfaces/types) en todas las funciones y props de componentes.
- Next.js App Router: Usa React Server Components por defecto; utiliza `"use client"` estrictamente cuando necesites interactividad del lado del cliente o hooks.
- Tailwind CSS para los estilos.
- Identificadores, nombres de archivos y variables en inglés; mensajes en la UI y contenido para el usuario en español.

## Reglas

- Lee `docs/constitution.md` y la spec activa en `specs/` antes de tocar código.
- No añadas dependencias al `package.json` ni cambies el formato o esquema del archivo JSON sin actualizar antes la spec.
- No modifiques archivos dentro de `specs/` salvo petición explícita.
- Crea el archivo .nvmrc con la version de node.js v22.23.2

## Al terminar cualquier tarea

- Ejecuta `npm run test` y `npm run lint` (o el equivalente en tu gestor de paquetes), y confirma en tu respuesta que no hay errores de tipado ni tests fallidos.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
