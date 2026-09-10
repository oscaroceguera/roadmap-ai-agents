# roadmap-ai-agents

Four standalone examples for building with AI/LLMs — a streaming chat UI, a terminal agent, a tool-calling agent with an eval suite, and a Spec-Driven Development (SDD) web app.

## What is this?

Each folder is an independent, self-contained project (its own `package.json` and `pnpm-lock.yaml`) — not a single monorepo workspace. The first three share the same core: `streamText`/`generateText` from the [Vercel AI SDK](https://ai-sdk.dev/), OpenAI as the model provider, and Zod-typed tools. The fourth is a separate exercise in spec-first development with an AI coding agent.

| Project                                 | What it demonstrates                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`my-ai-app/`](my-ai-app)               | Next.js (App Router) chat app. `app/api/chat/route.ts` streams model output to a React UI via `useChat`, with a `weather` and a `convertFahrenheitToCelsius` tool.                                                                                                                                                                               |
| [`my-ai-app-nodejs/`](my-ai-app-nodejs) | The same agent loop as a terminal REPL (`index.ts`) — no framework, just `readline` and `streamText`.                                                                                                                                                                                                                                            |
| [`tools-agent/`](tools-agent)           | A tool-calling agent (`src/agent.ts`) with `read_file` and `http_fetch` tools, plus a Vitest eval suite (`evals/`) that checks tool routing, token/cost accounting, and resistance to prompt injection via file content.                                                                                                                         |
| [`sdd-habits-web/`](sdd-habits-web)     | A Next.js habit-tracker built via Spec-Driven Development: a `docs/constitution.md`, a spec/plan/tasks cycle under `specs/001-habits-mvp/`, and the resulting app — pure habit/streak logic in `src/lib/habits/core.ts`, JSON file persistence, and a CLI (`scripts/habits-cli.ts`). `prompts.md` records the prompts used to drive the process. |

## Quick Start

Each project is run from its own directory. For example, the Next.js chat app:

```bash
cd my-ai-app
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The other projects follow the same `cd <project> && pnpm install` pattern:

```bash
# terminal chat agent
cd my-ai-app-nodejs
pnpm install
pnpm tsx index.ts

# tool-calling agent + evals
cd tools-agent
pnpm install
pnpm eval

# SDD habit-tracker web app
cd sdd-habits-web
pnpm install
pnpm dev        # http://localhost:3000
pnpm test       # runs src/**/*.test.ts and scripts/**/*.test.ts
```

The first three projects expect an `OPENAI_API_KEY` in a local `.env` (or `.env.local` for the Next.js app). `sdd-habits-web` needs no API key — it stores habits in a local JSON file.

## Project Structure

```text
.
├── my-ai-app/           Next.js chat app (AI SDK + React)
│   ├── agent/agent.ts   Model + provider config
│   └── app/api/chat/    Streaming chat route
├── my-ai-app-nodejs/    Terminal chat agent (Node.js + tsx)
│   └── index.ts
├── tools-agent/         Tool-calling agent + evals
│   ├── src/agent.ts     Agent with read_file / http_fetch tools
│   └── evals/           Vitest eval suite, baseline pass rates, cost tracing
└── sdd-habits-web/      Spec-Driven Development example (Next.js habit tracker)
    ├── docs/constitution.md   Non-negotiable project principles
    ├── specs/001-habits-mvp/  spec.md / plan.md / tasks.md for the MVP feature
    ├── src/lib/habits/        Pure habit + streak logic, tested in isolation
    ├── scripts/habits-cli.ts  CLI for creating/completing/listing habits
    └── prompts.md             The prompts used to drive the SDD workflow
```

## Documentation

| Doc                                                                           | Description                                                                                                     |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [`my-ai-app/README.md`](my-ai-app/README.md)                                  | Default Next.js/`create-next-app` instructions for that project.                                                |
| [`tools-agent/evals/cases.ts`](tools-agent/evals/cases.ts)                    | Eval cases, including the prompt-injection regression test.                                                     |
| [`sdd-habits-web/docs/constitution.md`](sdd-habits-web/docs/constitution.md)  | The project's non-negotiable principles (stack, spec-first, logic/UI separation, tests, persistence, language). |
| [`sdd-habits-web/specs/001-habits-mvp/`](sdd-habits-web/specs/001-habits-mvp) | Spec, plan, and task breakdown for the habit-tracking MVP.                                                      |
| [`sdd-habits-web/prompts.md`](sdd-habits-web/prompts.md)                      | The actual prompts used to drive the constitution → spec → plan → code cycle.                                   |

## Related Repos

- [fm-agents-v2](https://github.com/oscaroceguera/fm-agents-v2) — companion AI agents practice repo.
- [SDD-course](https://github.com/oscaroceguera/spec-driven-developmet-course/tree/main)
