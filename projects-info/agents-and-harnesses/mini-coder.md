# mini-coder

**Purpose:** A compact coding agent that adds production concerns: safety, observability, durability.

**What it does**
- Policy gate (`src/gate.ts`): allow / ask / deny per tool call, with human approvals.
- JSONL event log (`events.jsonl`) with per-run cost.
- Context summarization for long runs.
- Durable loop checkpointed in Postgres with DBOS (`src/workflow.ts`).
- Evals (`evals/`, scored against `baseline.json`) incl. long-context and security cases; fixture repo in `fixtures/toy-repo`.

**Run**
```bash
pnpm install
pnpm scratch        # copy toy-repo to /tmp/mc-scratch
pnpm check          # typecheck + smoke tests
pnpm start doctor   # verify ripgrep + DATABASE_URL
pnpm eval           # or pnpm eval:security
```
Needs `OPENAI_API_KEY` and a Postgres `DATABASE_URL`.
