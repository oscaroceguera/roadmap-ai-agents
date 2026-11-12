# agent-loop-demo (package name: loopitos)

**Purpose:** A terminal coding agent that shows the full anatomy of an agent loop.

**What it does**
- TUI (`ui.ts`) over an agent loop (`index.ts`) with bash and file tools (`tools.ts`).
- Todo list (`todo.ts`) and persistent tasks in `.tasks/` (`task.ts`).
- On-demand skills from `.skills/` (`skills.ts`).
- Subagents via a `task` tool.
- Context compaction when nearing the token limit (`compact.ts`).
- Laminar tracing (`LMNR_PROJECT_API_KEY`).

**Run:** `pnpm install && pnpm start` (`node index.ts`); typecheck with `pnpm typecheck`.
