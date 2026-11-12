# Projects overview

Index of every project in this repo. Each project is independent (own `package.json`, own lockfile); this is not a monorepo workspace. One file per project below, with purpose, what it does, stack, key files and how to run it.

| Group | Project | One-liner |
| --- | --- | --- |
| AI SDK basics | [my-ai-app](ai-sdk-basics/my-ai-app.md) | Next.js chat app with tools, streamed via `useChat` |
| AI SDK basics | [my-ai-app-nodejs](ai-sdk-basics/my-ai-app-nodejs.md) | Same agent as a terminal REPL |
| AI SDK basics | [getting-started-app-router](ai-sdk-basics/getting-started-app-router.md) | Stock AI SDK getting-started chat app |
| AI SDK basics | [ai-agents-lab](ai-sdk-basics/ai-agents-lab.md) | 17 numbered lessons on agents with the AI SDK |
| AI SDK basics | [capstone-exercise-ai-agents-lab](ai-sdk-basics/capstone-exercise-ai-agents-lab.md) | Conference-assistant agent combining all lessons |
| Agents & harnesses | [tools-agent](agents-and-harnesses/tools-agent.md) | Tool-calling agent + Vitest evals |
| Agents & harnesses | [agent-loop-demo](agents-and-harnesses/agent-loop-demo.md) | TUI coding agent ("loopitos") |
| Agents & harnesses | [mini-coder](agents-and-harnesses/mini-coder.md) | Coding agent with policy gate, event log, DBOS durability |
| Agents & harnesses | [harness-lab](agents-and-harnesses/harness-lab.md) | Minimal test-first agent harness |
| Harness tutorials (ES) | [harness-eng-tuto-es](harness-tutorials/harness-eng-tuto-es.md) | Spanish tutorials: AGENTS.md, sensors, hooks, layered architecture |
| MCP | [mdev-mcp-server](mcp/mdev-mcp-server.md) | Toy MCP servers: `add` and `get_weather` |
| MCP | [mdev-mcp-issue-tracker-main](mcp/mdev-mcp-issue-tracker-main.md) | Full-stack issue tracker + MCP server over its API |
| RAG | [rag-notes](rag/rag-notes.md) | Q&A over your own notes (Prisma 8 + pgvector) |
| RAG | [rag-next-pgvector](rag/rag-next-pgvector.md) | Document extraction + cited RAG / SQL chat |
| SDD | [sdd-habits-web](sdd/sdd-habits-web.md) | Habit tracker built with Spec-Driven Development |
| Tooling | [repo-tooling](repo-tooling.md) | Root-level `.claude/`, `.agents/`, `skills-lock.json` |

## Common stack

- TypeScript, pnpm (most projects), Node via `.nvmrc`.
- [Vercel AI SDK](https://ai-sdk.dev/) with OpenAI as the default provider; Zod-typed tools.
- Needs `OPENAI_API_KEY` in a local `.env` / `.env.local` for most LLM projects. Never commit these.
- Postgres + `vector` extension for the RAG apps and `mini-coder` durability.

## Learning path (suggested order)

1. `my-ai-app-nodejs` → `my-ai-app` → `getting-started-app-router` (basics)
2. `ai-agents-lab` → `capstone-exercise-ai-agents-lab` (agent concepts)
3. `tools-agent` → `harness-lab` → `agent-loop-demo` → `mini-coder` (harnesses)
4. `harness-eng-tuto-es` (guides/sensors/hooks)
5. `mdev-mcp-server` → `mdev-mcp-issue-tracker-main` (MCP)
6. `rag-notes` → `rag-next-pgvector` (RAG)
7. `sdd-habits-web` (spec-driven development)

> Note: the root `README.md` does not yet list `harness-eng-tuto-es`, `mdev-mcp-server` or `mdev-mcp-issue-tracker-main`; they are documented here.
