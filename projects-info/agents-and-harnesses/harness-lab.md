# harness-lab

**Purpose:** A minimal agent harness built test-first, to understand the pieces without provider lock-in.

**What it does**
- `src/core/`: loop (step-limited, JSON logging), types, `FakeModel` for deterministic tests, logger, workspace scoping.
- `src/models/`: provider-agnostic `Model` interface, AI SDK adapter, env-based selection (falls back to the fake model without `OPENAI_API_KEY`; `HARNESS_MODEL` overrides default `gpt-4.1-mini`).
- `src/tools/`: tool registry, workspace-scoped fs tools, `run_tests`.
- `test/basic/`: Vitest suite.

**Run:** `pnpm test`, then `pnpm agent --workspace <dir> "make the tests pass"`.
