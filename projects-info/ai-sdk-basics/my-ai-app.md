# my-ai-app

**Purpose:** Next.js (App Router) chat app, the canonical AI SDK + React example.

**What it does**
- `app/api/chat/route.ts` streams model output (`streamText`) to the React UI, which uses `useChat`.
- Two tools: `weather` and `convertFahrenheitToCelsius`, so the model chains tool calls (multi-step).
- `agent/` holds the agent definition; `AGENTS.md` / `CLAUDE.md` give agent guidance for the project.

**Stack:** Next.js, React, Tailwind (postcss), AI SDK, OpenAI, pnpm.

**Run:** `cd my-ai-app && pnpm install && pnpm dev` → http://localhost:3000 (needs `OPENAI_API_KEY` in `.env.local`).
