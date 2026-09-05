# Constitution

1. **Simplicidad del stack**: Next.js (App Router) + TypeScript + Tailwind. No se añaden nuevas dependencias a `package.json` sin actualizar antes la spec.
2. **Spec antes que código**: Ninguna función o componente se implementa si no está descrito en la spec activa dentro de `specs/`; todo PR referencia la spec que implementa.
3. **Separación lógica/interfaz**: Las reglas de hábitos y rachas viven únicamente en `src/lib/habits/core.ts`, sin imports de React/Next; componentes y Server Actions solo llaman a esas funciones, nunca reimplementan lógica.
4. **Política de tests**: Toda función exportada de `src/lib/habits/core.ts` tiene tests unitarios antes de mergear; `pnpm test` debe pasar en cada cambio.
5. **Persistencia**: Los datos se guardan en un único archivo JSON local vía `src/lib/habits/storage.ts`; cambiar el esquema del JSON exige actualizar la spec primero.
6. **Idioma**: Identificadores, nombres de archivo y comentarios de código en inglés; todo texto visible al usuario (UI, mensajes de error) en español.
