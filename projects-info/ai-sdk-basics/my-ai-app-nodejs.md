# my-ai-app-nodejs

**Purpose:** The same agent loop as `my-ai-app`, without a framework.

**What it does:** `index.ts` is a terminal REPL using `readline` and `streamText`; keeps message history and streams the reply, running tools as needed.

**Stack:** Node.js, tsx, AI SDK, OpenAI.

**Run:** `cd my-ai-app-nodejs && pnpm install && pnpm tsx index.ts`
