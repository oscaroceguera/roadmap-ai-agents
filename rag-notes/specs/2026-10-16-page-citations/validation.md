# Phase 5: Page citations in answers — Validation

## Automated

Run in `rag-notes/`:

- `pnpm vitest run`: all tests pass, including the new `context.test.ts`.
- `pnpm tsc --noEmit`: no type errors.
- `pnpm eslint` on the changed `src/` files: clean.
- `pnpm build`: succeeds.

The `context.test.ts` tests must assert:

- [ ] A PDF chunk is labeled `name p.N`, and that includes `page: 1`.
- [ ] A chunk with `page: null` is labeled with the bare name, exactly as before.
- [ ] `buildContext` numbers sources from `[1]`, uses `(source: <label>)`, and joins them with `\n\n---\n\n`.
- [ ] `buildContext([])` returns `""`.

## Manual

With `pnpm dev` running and `multi.pdf` uploaded and indexed:

- [ ] Ask "What do my notes say about bananas?". The answer cites `[n]`, and source card `[n]` reads `multi.pdf · p.3 · chunk …`.
- [ ] Ask about apples. The cited card shows `p.1`.
- [ ] Ask about something that isn't in any note. The answer is exactly "I couldn't find that in your notes."
- [ ] Ask about an indexed `.md` note. Its card shows no page: `notes.md · chunk N`.
- [ ] The `[buildContext]` server log shows `(source: multi.pdf p.3)`.

## Definition of done

- PDF sources show `name p.N` in the model context and `· p.N` in the Ask UI.
- `.md`/`.txt` sources, the system prompt, the fallback, and the `/api/ask` response shape are unchanged.
- All automated and manual checks pass, and Phase 5 is ticked in `specs/roadmap.md`. No new dependencies.
