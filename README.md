# roadmap-ai-agents

Three standalone examples for building AI agents with the [Vercel AI SDK](https://ai-sdk.dev/) — a streaming chat UI, a terminal agent, and a tool-calling agent with an eval suite.

## What is this?

Each folder is an independent, self-contained project (its own `package.json`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml`) — not a single monorepo workspace. They share the same core: `streamText`/`generateText` from the `ai` package, OpenAI as the model provider, and Zod-typed tools.

| Project | What it demonstrates |
|---|---|
| [`my-ai-app/`](my-ai-app) | Next.js (App Router) chat app. `app/api/chat/route.ts` streams model output to a React UI via `useChat`, with a `weather` and a `convertFahrenheitToCelsius` tool. |
| [`my-ai-app-nodejs/`](my-ai-app-nodejs) | The same agent loop as a terminal REPL (`index.ts`) — no framework, just `readline` and `streamText`. |
| [`tools-agent/`](tools-agent) | A tool-calling agent (`src/agent.ts`) with `read_file` and `http_fetch` tools, plus a Vitest eval suite (`evals/`) that checks tool routing, token/cost accounting, and resistance to prompt injection via file content. |

## Quick Start

Each project is run from its own directory. For example, the Next.js chat app:

```bash
cd my-ai-app
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The other two projects follow the same `cd <project> && pnpm install` pattern:

```bash
# terminal chat agent
cd my-ai-app-nodejs
pnpm install
pnpm tsx index.ts

# tool-calling agent + evals
cd tools-agent
pnpm install
pnpm eval
```

All three expect an `OPENAI_API_KEY` in a local `.env` (or `.env.local` for the Next.js app).

## Project Structure

```text
.
├── my-ai-app/           Next.js chat app (AI SDK + React)
│   ├── agent/agent.ts   Model + provider config
│   └── app/api/chat/    Streaming chat route
├── my-ai-app-nodejs/    Terminal chat agent (Node.js + tsx)
│   └── index.ts
└── tools-agent/         Tool-calling agent + evals
    ├── src/agent.ts     Agent with read_file / http_fetch tools
    └── evals/           Vitest eval suite, baseline pass rates, cost tracing
```

## Documentation

| Doc | Description |
|---|---|
| [`my-ai-app/README.md`](my-ai-app/README.md) | Default Next.js/`create-next-app` instructions for that project. |
| [`tools-agent/evals/cases.ts`](tools-agent/evals/cases.ts) | Eval cases, including the prompt-injection regression test. |

## Related Repos

- [fm-agents-v2](https://github.com/oscaroceguera/fm-agents-v2) — companion AI agents practice repo.
