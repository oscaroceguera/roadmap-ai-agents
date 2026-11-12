# sdd-habits-web

**Purpose:** Example of Spec-Driven Development (constitution → spec → plan → tasks → code).

**What it does**
- Habit tracker (Next.js): pure habit and streak logic in `src/lib/habits/core.ts`, JSON file persistence (`data/`), CLI at `scripts/habits-cli.ts`.
- Process artifacts: `docs/constitution.md` (non-negotiables), `specs/001-habits-mvp/` (spec/plan/tasks), `prompts.md` (prompts used).
- No API key needed.

**Run:** `pnpm install && pnpm dev` (http://localhost:3000); `pnpm test`.
