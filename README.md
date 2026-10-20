# roadmap-ai-agents

Standalone examples for building with AI/LLMs, grouped by topic: AI SDK basics, agent loops and harnesses, retrieval-augmented generation (RAG), and Spec-Driven Development (SDD).

## What is this?

Each folder is an independent, self-contained project with its own `package.json` and `pnpm-lock.yaml`. This is not a monorepo workspace. Most projects are TypeScript on the [Vercel AI SDK](https://ai-sdk.dev/) (`streamText`/`generateText`, Zod-typed tools) with OpenAI as the model provider.

### AI SDK basics

| Project                                                                                    | What it demonstrates                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`my-ai-app/`](my-ai-app)                                                                  | Next.js (App Router) chat app. `app/api/chat/route.ts` streams model output to a React UI via `useChat`, with a `weather` and a `convertFahrenheitToCelsius` tool.                                   |
| [`my-ai-app-nodejs/`](my-ai-app-nodejs)                                                    | The same agent loop as a terminal REPL (`index.ts`). No framework, just `readline` and `streamText`.                                                                                                 |
| [`ai-sdk-vercel/getting-started-app-router/`](ai-sdk-vercel/getting-started-app-router)    | The AI SDK getting-started chat app for the Next.js App Router.                                                                                                                                       |
| [`ai-sdk-vercel/ai-agents-lab/`](ai-sdk-vercel/ai-agents-lab)                              | Numbered lessons (`src/00-smoke.ts` … `src/16b-openai-tools.ts`): first agent, tools, instructions, streaming, callbacks, stop conditions, `prepareStep`, structured output, context, approvals, subagents, routing. |
| [`ai-sdk-vercel/capstone-exercise-ai-agents-lab/`](ai-sdk-vercel/capstone-exercise-ai-agents-lab) | Capstone that combines the lessons: a research agent with its own tools, instructions, data and step limits (`src/capstone/`).                                                                        |

### Agents and harnesses

| Project                               | What it demonstrates                                                                                                                                                                                                                                                                         |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`tools-agent/`](tools-agent)         | A tool-calling agent (`src/agent.ts`) with `read_file` and `http_fetch` tools, plus a Vitest eval suite (`evals/`) that checks tool routing, token/cost accounting, and resistance to prompt injection via file content.                                                                     |
| [`agent-loop-demo/`](agent-loop-demo) | A terminal coding agent with a TUI: bash/file tools, a todo list, persistent tasks (`.tasks/`), on-demand skills (`.skills/`), subagents via a `task` tool, context compaction when nearing the token limit (`compact.ts`), and Laminar tracing.                                            |
| [`mini-coder/`](mini-coder)           | A small coding agent with a policy gate (`src/gate.ts`: allow / ask / deny per tool call), human approvals, a JSONL event log with per-run cost, context summarization, and a durable version of the loop checkpointed in Postgres with DBOS (`src/workflow.ts`). Evals run against `fixtures/toy-repo`. |
| [`harness-lab/`](harness-lab)         | A minimal agent harness built test-first: a provider-agnostic `Model` interface with a `FakeModel` for deterministic tests, a tool registry, a workspace-scoped file/test toolset, a step-limited loop with JSON logging, and a CLI.                                                       |

### RAG

| Project                                   | What it demonstrates                                                                                                                                                                                                                                                       |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`rag-notes/`](rag-notes)                 | Ask questions about your own `.md`, `.txt` and text-based `.pdf` notes. Chunks and embeds them into Postgres/pgvector (Prisma 8), answers only from matching chunks and cites sources with page numbers. Built feature by feature with dated specs under `specs/`.        |
| [`rag-next-pgvector/`](rag-next-pgvector) | Upload invoices, receipts or contracts (images or PDFs). A vision LLM extracts structured data for review; confirmed documents are stored in typed tables plus pgvector embeddings. The chat answers with cited semantic search, or with a read-only LLM-written SQL query for totals. (README in Spanish.) |

### Spec-Driven Development

| Project                             | What it demonstrates                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`sdd-habits-web/`](sdd-habits-web) | A Next.js habit-tracker built via Spec-Driven Development: a `docs/constitution.md`, a spec/plan/tasks cycle under `specs/001-habits-mvp/`, and the resulting app — pure habit/streak logic in `src/lib/habits/core.ts`, JSON file persistence, and a CLI (`scripts/habits-cli.ts`). `prompts.md` records the prompts used to drive the process. |

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
cd my-ai-app-nodejs && pnpm tsx index.ts

# AI SDK agent lessons (pick any lesson file)
cd ai-sdk-vercel/ai-agents-lab && pnpm s src/02-first-agent.ts
cd ai-sdk-vercel/capstone-exercise-ai-agents-lab && pnpm s src/capstone.ts

# tool-calling agent + evals
cd tools-agent && pnpm eval

# terminal coding agent with TUI
cd agent-loop-demo && pnpm start

# mini-coder: reset the playground repo, run tests, run evals
cd mini-coder
pnpm scratch          # copies fixtures/toy-repo to /tmp/mc-scratch
pnpm check            # typecheck + smoke tests
pnpm start doctor     # check ripgrep and DATABASE_URL
pnpm eval

# harness-lab: tests, then run the agent on a workspace
cd harness-lab
pnpm test
pnpm agent --workspace <dir> "make the tests pass"

# RAG apps (need Postgres with pgvector; see each project's README)
cd rag-notes && pnpm dev
cd rag-next-pgvector && pnpm dev

# SDD habit-tracker web app
cd sdd-habits-web
pnpm dev        # http://localhost:3000
pnpm test       # runs src/**/*.test.ts and scripts/**/*.test.ts
```

### Environment

- Most projects expect an `OPENAI_API_KEY` in a local `.env` (or `.env.local` for the Next.js apps).
- `harness-lab` falls back to a fake model when `OPENAI_API_KEY` is unset. Set `HARNESS_MODEL` to change the default `gpt-4.1-mini`.
- `mini-coder`, `rag-notes` and `rag-next-pgvector` also need a `DATABASE_URL` for Postgres. Both RAG apps need the `vector` extension.
- `agent-loop-demo` reads `LMNR_PROJECT_API_KEY` for Laminar tracing.
- `sdd-habits-web` needs no API key. It stores habits in a local JSON file.

## Project Structure

```text
.
├── my-ai-app/                 Next.js chat app (AI SDK + React)
├── my-ai-app-nodejs/          Terminal chat agent (Node.js + tsx)
├── ai-sdk-vercel/
│   ├── getting-started-app-router/       AI SDK getting-started chat app
│   ├── ai-agents-lab/src/                Numbered agent lessons (00–16)
│   └── capstone-exercise-ai-agents-lab/  Research-agent capstone
├── tools-agent/               Tool-calling agent + Vitest evals
├── agent-loop-demo/           TUI coding agent: tasks, skills, subagents, compaction
├── mini-coder/                Coding agent: policy gate, approvals, event log, DBOS durability
│   ├── src/                   loop, gate, workflow, tools, context management
│   ├── evals/                 Single-turn and long-context evals
│   └── fixtures/toy-repo/     Playground repo the agent works on
├── harness-lab/               Minimal test-first agent harness
│   ├── src/core/              loop, types, fake model, logger, workspace
│   ├── src/models/            AI SDK adapter + env-based model selection
│   ├── src/tools/             Registry, fs tools, run_tests
│   └── test/basic/            Vitest suite
├── rag-notes/                 RAG over your notes (Prisma 8 + pgvector)
│   └── specs/                 Dated plan/requirements/validation per feature
├── rag-next-pgvector/         Document extraction + RAG/SQL chat (pgvector)
└── sdd-habits-web/            Spec-Driven Development example (Next.js habit tracker)
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
| [`mini-coder/evals/cases.ts`](mini-coder/evals/cases.ts)                      | Single-turn eval cases for the coding agent, scored against `evals/baseline.json`.                              |
| [`rag-notes/README.md`](rag-notes/README.md)                                  | Pipeline, API routes, PDF limitations and setup for the notes RAG app.                                          |
| [`rag-notes/prisma-8.md`](rag-notes/prisma-8.md)                              | How the Prisma 8 contract workflow and CLI differ from Prisma 5/6.                                              |
| [`rag-next-pgvector/README.md`](rag-next-pgvector/README.md)                  | Setup, schema and per-file walkthrough of the document-extraction RAG app (Spanish).                            |
| [`sdd-habits-web/docs/constitution.md`](sdd-habits-web/docs/constitution.md)  | The project's non-negotiable principles (stack, spec-first, logic/UI separation, tests, persistence, language). |
| [`sdd-habits-web/specs/001-habits-mvp/`](sdd-habits-web/specs/001-habits-mvp) | Spec, plan, and task breakdown for the habit-tracking MVP.                                                      |
| [`sdd-habits-web/prompts.md`](sdd-habits-web/prompts.md)                      | The actual prompts used to drive the constitution → spec → plan → code cycle.                                   |

## Related Repos

- [fm-agents-v2](https://github.com/oscaroceguera/fm-agents-v2) — companion AI agents practice repo.
- [SDD-course](https://github.com/oscaroceguera/spec-driven-developmet-course/tree/main)
