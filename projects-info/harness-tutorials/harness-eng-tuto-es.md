# harness-eng-tuto-es

**Purpose:** Spanish-language tutorials on *harness engineering*: agent = model + harness (guides, sensors, hooks). **Not listed in the root README.**

## 01-fundamentos-agents-md-sensores
- Tutorial README explaining guides (feedforward) vs sensors (feedback), computational vs inferential controls, `AGENTS.md` as a short map, and which agents read which files.
- Tiny TS project (`src/sum.ts`, `tests/sum.test.ts`) with ESLint, tsc, Vitest and a `.claude/` hook that runs checks after edits.

## fullstack-from-zero
- "Talk" API in TypeScript + Express with enforced layers: `domain` → `application` → `infrastructure` → `ui`, wired only in `src/main.ts`.
- Sensors: `pnpm check` = typecheck + lint + tests; `tests/architecture.test.ts` enforces layer imports; custom ESLint rule `local/no-clock-in-domain`; Claude hook `run-check.sh`.
- `AGENTS.md` rules: strict TS (no `any`, `@ts-ignore`, `eslint-disable`), no `console.log`, relative `.js` imports, tests with every behaviour change.

**Run:** `nvm use && pnpm install && pnpm check` (and `pnpm dev` for the API on :3000 in fullstack-from-zero).
