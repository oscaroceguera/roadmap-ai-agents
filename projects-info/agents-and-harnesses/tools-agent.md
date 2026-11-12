# tools-agent

**Purpose:** A small tool-calling agent plus an eval suite, showing how to test agent behaviour.

**What it does**
- `src/agent.ts`: agent with `read_file` and `http_fetch` tools.
- `evals/` (Vitest): `cases.ts` defines cases; checks cover tool routing, token/cost accounting (`trace.ts`), and resistance to prompt injection via file content. `baseline.json` stores a score baseline.

**Run:** `pnpm install && pnpm eval` (needs `OPENAI_API_KEY`).
