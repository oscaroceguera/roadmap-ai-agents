# Phase 5: Page citations in answers — Requirements

## Scope

When an answer cites a PDF chunk, the citation shows the page it came from, both in the context the model reads and in the Ask UI. `.md`/`.txt` sources look exactly as they do today.

### Included

- `sourceLabel({ documentName, page })` in a new dependency-free `src/lib/context.ts`: it returns `name p.N` when `page` is set and `name` when it is `null`
- `buildContext` moves from `answer.ts` to `context.ts` and labels each source with `sourceLabel`
- The Ask UI's `Source` type gets `page`, and PDF source cards show `· p.N`
- Vitest tests for `sourceLabel` and `buildContext`
- A manual check against `multi.pdf`

### Not included

- Page numbers inside the answer text (such as `[1, p.3]`). The system prompt and the `[n]` citation parser stay unchanged.
- Any change to the `/api/ask` response shape. `sources` already includes `page`, because `answer()` returns the `RetrievedChunk` rows.
- Library UI, upload limits, and error messages (Phase 6)

### Labels

| Where | PDF chunk (`page: 3`) | `.md`/`.txt` chunk (`page: null`) |
|---|---|---|
| Model context | `[1] (source: paper.pdf p.3)` | `[2] (source: notes.md)`, unchanged |
| Ask UI card header | `[1] paper.pdf · p.3 · chunk 4` | `[2] notes.md · chunk 1`, unchanged |

## Decisions

- **`name p.N` in the context, nothing new in the prompt.** The model still cites `[n]`, and the reader maps `[n]` to a source card that shows the page. That keeps the grounding rules and the exact fallback "I couldn't find that in your notes." untouched.
- **A pure helper in `src/lib/context.ts`.** `answer.ts` creates an OpenAI client and imports `retrieve` (and therefore `db`) when the module loads, so Vitest can't import it without an API key and a database. Moving `buildContext` and `sourceLabel` into a module with no runtime dependencies makes them testable. `import type { RetrievedChunk }` is erased at build time, so no dependency comes with it.
- **`page` is checked against `null`, not for truthiness.** Pages are 1-based, so `0` never appears, but `page != null` states the intent and keeps `page: 1` labeled.
- **The UI formats its own card header.** The card already builds `name · chunk N` inline. Adding `· p.N` there is one conditional, and it keeps the response shape unchanged.

## Context

- Keep the `console.log("[buildContext] - …")` tracing style, and add a matching one to `sourceLabel`.
- Vitest can't resolve `@/`, so `context.ts` and its test use relative imports (`./retrieve` for the type).
- `answer.ts` imports `buildContext` from `@/lib/context`.
- The Ask UI keeps the current mono style: `·` separators and `text-muted`.
- `multi.pdf` has apples on page 1, a blank page 2, and bananas on page 3 (see `src/lib/__fixtures__/README.md`).
