# ai-sdk-vercel/ai-agents-lab

**Purpose:** Step-by-step lessons on building agents with the AI SDK. Each file is a runnable script.

**Lessons (`src/`)**
| File | Topic |
| --- | --- |
| `00-smoke.ts` | Smoke test the model connection |
| `02-first-agent.ts` | First agent |
| `03-one-tool.ts`, `04-multi-tool.ts` | Tools (one, then several) |
| `05-instructions.ts` | System instructions |
| `06-stream.ts` | Streaming |
| `07-callbacks.ts` | Lifecycle callbacks |
| `08a-step-limit.ts`, `08d-done-tool.ts` | Stop conditions (step limit, "done" tool) |
| `09-prepare-step.ts` | `prepareStep` per-step control |
| `10-structured.ts` | Structured output |
| `11-call-options.ts` | Per-call options |
| `12-context.ts` | Tool context |
| `13-approvals.ts` | Human approvals |
| `14-subagents.ts` | Subagents |
| `16-routing.ts`, `16b-openai-tools.ts` | Routing, provider-native tools |

Shared: `model.ts` (model selection), `tools.ts`.

**Run:** `pnpm install && pnpm s src/02-first-agent.ts` (pick any lesson). Needs `OPENAI_API_KEY` in `.env`.
