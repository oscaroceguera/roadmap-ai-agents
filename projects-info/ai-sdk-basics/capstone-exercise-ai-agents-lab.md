# ai-sdk-vercel/capstone-exercise-ai-agents-lab

**Purpose:** Capstone that combines the `ai-agents-lab` lessons in one agent.

**What it does:** A conference assistant built with `ToolLoopAgent` (`src/capstone/agent.ts`):
- Tools: `searchTalks`, `getSpeaker`, `bookSeat`, `research` (`tools.ts`, `research.ts`).
- Call options validated with Zod (`attendeeName`, `ticketType: general | vip`) and injected into instructions via `prepareCall`.
- Tool approvals: `bookSeat` auto-approved for VIP, needs user approval otherwise.
- Limits: `MAX_STEPS = 10`, `TOKEN_BUDGET = 20_000` (`limits.ts`); structured answer schema in `data.ts`.
- `src/capstone.ts` is the CLI: prompts for name/ticket, then runs the agent and handles approval requests.

**Run:** `pnpm install && pnpm s src/capstone.ts`. Needs `OPENAI_API_KEY`; booking DB env vars have fake defaults.
