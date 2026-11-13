# Notas de estudio MCP

Preguntas y respuestas para repasar. Código de referencia: `lib/mcp/register.ts`.

## ¿Para qué sirve `annotations` en `registerTool`?

Son **metadatos (hints) que describen el comportamiento de la tool** al cliente MCP (Claude Desktop, Claude Code, IDEs). No cambian lo que hace la tool: ayudan al cliente a decidir cómo presentarla y si pedir confirmación al usuario antes de ejecutarla.

| Hint | Significado | Default (spec) |
|---|---|---|
| `readOnlyHint: true` | La tool **no modifica** nada de su entorno (solo lee). | `false` |
| `idempotentHint: true` | Llamarla varias veces con los mismos args tiene el mismo efecto que una sola vez. Solo aplica si `readOnlyHint` es `false`. | `false` |
| `openWorldHint: false` | Solo interactúa con un dominio **cerrado** (dataset local). `true` = toca el mundo exterior (web, APIs de terceros). | `true` |
| `destructiveHint` | Puede hacer actualizaciones destructivas. Solo aplica si `readOnlyHint` es `false`. | `true` |

**En el código**
- `get_talk` (`register.ts:22-26`): lee `TALKS` local, determinista, sin red → `readOnly + idempotent + openWorld: false`.
- `search_talks` (`register.ts:67`): solo lee, pero llama a la API de ratings (`fetchRating`) → `openWorldHint: true`. `idempotentHint` es redundante si ya es `readOnly`.

**Para qué sirve en la práctica**
- Auto-aprobar tools `readOnly` sin pedir permiso; confirmar las destructivas.
- Mostrarlas distinto en la UI (p. ej. icono de solo lectura).
- Políticas de seguridad: bloquear `openWorld` en entornos aislados.

**Advertencia:** son solo hints, **no garantías**. Los clientes deben tratarlos como no confiables salvo que el servidor sea de confianza. No son un mecanismo de seguridad; la validación y autorización real van en el servidor.

`annotations.title` también existe en la spec, pero aquí ya se pasa `title` a nivel de config (`register.ts:11`).

## ¿Para qué sirve `structuredContent`?

Es el **resultado de la tool en formato JSON tipado**, pensado para que el **cliente/código** lo consuma sin tener que parsear texto.

| Campo | Para quién | Qué contiene |
|---|---|---|
| `content` | Modelo / humano | Texto, imágenes, etc. (lo que se "lee") |
| `structuredContent` | Cliente / código | Objeto JSON con forma predecible |

**En el código** (`register.ts:41-48`): `content` devuelve los bullets de texto y `structuredContent: { year, talks }` devuelve los mismos datos como objeto.

**`outputSchema`:** si en `registerTool` defines un `outputSchema`, el SDK valida `structuredContent` contra él y el cliente puede confiar en su forma. Hoy este archivo no define `outputSchema`, así que no hay validación.

**Compatibilidad:** la spec recomienda incluir también el JSON serializado en `content` para clientes que no soportan `structuredContent`.

**Errores:** con `isError: true` solo se usa `content` (ver `register.ts:31-39`).

## ¿Para qué sirve `client/demo-client.ts`?

Es un **cliente MCP de prueba** que se conecta al servidor y verifica que funciona. Es una demo, no parte del servidor.

| Paso | Qué hace | Línea |
|---|---|---|
| Conectar | `StreamableHTTPClientTransport` a `MCP_URL` (default `http://localhost:3000/api/mcp`) | 6, 13 |
| Negociar versión | `versionNegotiation: { mode: "auto" }` + `getDiscoverResult()` → moderno (2026-07-28) vs legacy (2025) | 11, 15-20 |
| Listar tools | `client.listTools()` | 22-23 |
| Llamar tool | `get_talk` con `{ year: 2026 }` | 25-29 |
| Probar error | `get_talk` con `{ year: "nope" }` → `isError` debe ser `true` | 31-35 |
| Cerrar | `client.close()` en `finally` | 36-38 |

**Para qué se usa**
- Verificar que el servidor responde, expone sus tools y valida entradas.
- Ver la negociación de versión cliente/servidor.
- Ejemplo mínimo de cliente MCP en TypeScript.

**Cómo correrlo:** levantar el servidor en el puerto 3000 y ejecutar `npx tsx client/demo-client.ts`.
