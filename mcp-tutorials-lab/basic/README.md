# 01 · Basic MCP: a typed stdio server in TypeScript

You will build `jsconf-mcp`, a small MCP server that runs on your machine over **stdio**. It has:

- one **tool**, `get_talk`, with a Zod input schema, an output schema and annotations
- two **resources**: `jsconf://talks` (static) and `jsconf://schedule/{year}` (template)
- one **prompt**, `recommend_talks`
- **Vitest** tests: in-process, plus one end-to-end test over stdio
- configuration for **Claude Code** and **Cursor**

Time: about 45 minutes. Protocol: **MCP 2026-07-28** (stateless). SDK: **TypeScript SDK v2** (`@modelcontextprotocol/server` and `@modelcontextprotocol/client` 2.4.0).

> Every command below was run on Node 24.22.1 and the outputs are copied from those runs. Paths are relative to the project root `basic/` unless stated otherwise.

## Project tree at the start

```text
basic/        (empty folder)
```

## Project tree at the end

```text
basic/
├── .cursor/
│   └── mcp.json
├── src/
│   ├── data/
│   │   └── talks.ts
│   ├── prompts/
│   │   └── summarize-talk.ts
│   ├── resources/
│   │   └── schedule.ts
│   ├── tools/
│   │   └── get-talk.ts
│   ├── index.ts
│   └── server.ts
├── test/
│   ├── helpers.ts
│   ├── server.test.ts
│   └── stdio.e2e.test.ts
├── .gitignore
├── .mcp.json
├── package.json
├── tsconfig.json
├── tsconfig.test.json
└── vitest.config.ts
```

## Mental model (2 minutes)

```text
 Claude Code / Cursor (MCP host)
        │  spawns `node dist/index.js`
        ▼
  stdin  ──JSON-RPC requests──▶  your server  (src/index.ts → serveStdio(createServer))
  stdout ◀──JSON-RPC responses──
  stderr ──▶ logs (safe to write here)
```

- **stdout belongs to the protocol.** A stray `console.log` corrupts the stream. Log with `console.error`.
- **Tools** are actions the _model_ chooses to call. **Resources** are data the _app/user_ attaches. **Prompts** are templates the _user_ picks (for example a slash command).
- `createServer()` is a **factory**. The SDK calls it to build a server, and the tests call the same function. That keeps a single source of truth.

---

## Step 1 · Scaffold the project

**Why:** pinned versions make the tutorial reproducible. `"type": "module"` plus `NodeNext` gives you real ESM, which the SDK v2 packages require. Vitest 5 needs Node ≥ 22.12.

Run these from the folder where you keep projects:

```bash
mkdir basic && cd basic
pnpm init
pnpm add -E @modelcontextprotocol/server@2.4.0 zod@4.6.7
pnpm add -E -D @modelcontextprotocol/client@2.4.0 typescript@7.0.2 tsx@4.23.15 vitest@5.0.5 @types/node@24.19.2
```

`-E` (`--save-exact`) writes `2.4.0`, not `^2.4.0`. The client package is a **dev** dependency: the tests use it, the server never does.

Now replace the generated file.

**File: `package.json`**

```json
{
  "name": "jsconf-mcp-basic",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=22.12.0"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsx src/index.ts",
    "start": "node dist/index.js",
    "typecheck": "tsc -p tsconfig.test.json",
    "test": "vitest run",
    "inspect": "pnpm dlx @modelcontextprotocol/inspector@2.12.0 node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/server": "2.4.0",
    "zod": "4.6.7"
  },
  "devDependencies": {
    "@modelcontextprotocol/client": "2.4.0",
    "@types/node": "24.19.2",
    "tsx": "4.23.15",
    "typescript": "7.0.2",
    "vitest": "5.0.5"
  }
}
```

**File: `tsconfig.json`**: the build config (emits `dist/`).

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": false,
    "sourceMap": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src"]
}
```

**File: `tsconfig.test.json`**: type-checks tests too, without emitting anything.

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": { "noEmit": true, "rootDir": "." },
  "include": ["src", "test", "vitest.config.ts"]
}
```

**File: `.gitignore`**

```text
node_modules
dist
```

### Test this step

```bash
node -v && pnpm exec tsc -v && pnpm ls --depth=0
```

Expected (versions must match):

```text
v24.22.1
Version 7.0.2
jsconf-mcp-basic@0.1.0 /path/to/basic
├── @modelcontextprotocol/client@2.4.0
├── @modelcontextprotocol/server@2.4.0
├── @types/node@24.19.2
├── tsx@4.23.15
├── typescript@7.0.2
├── vitest@5.0.5
└── zod@4.6.7
```

If `node -v` prints v20 or older, install Node 24 LTS first (for example `nvm install 24`). Vitest 5 refuses to start on Node 20.

---

## Step 2 · Add the data module

**Why:** keep the domain (talks) separate from the MCP code. Later you can swap the array for a database without touching the tool.

**File: `src/data/talks.ts`**

```ts
// Sample data inspired by JSConf MX. Fictional talks — swap for a DB/API later.
export interface Talk {
  year: number;
  title: string;
  speaker: string;
  track: "main" | "workshop";
  tags: string[];
}

export const TALKS: readonly Talk[] = [
  {
    year: 2024,
    title: "Signals in the Wild",
    speaker: "Ana López",
    track: "main",
    tags: ["react", "signals"],
  },
  {
    year: 2024,
    title: "Edge Functions from Zero",
    speaker: "Diego Ramírez",
    track: "workshop",
    tags: ["vercel", "edge"],
  },
  {
    year: 2025,
    title: "Type-Safe APIs with Zod 4",
    speaker: "María Fernández",
    track: "main",
    tags: ["typescript", "zod"],
  },
  {
    year: 2025,
    title: "Testing at the Speed of Vitest",
    speaker: "Luis Herrera",
    track: "workshop",
    tags: ["testing", "vitest"],
  },
  {
    year: 2026,
    title: "Shipping MCP Servers to Production",
    speaker: "Oscar Oceguera",
    track: "main",
    tags: ["mcp", "ai", "node"],
  },
];

export const YEARS = [...new Set(TALKS.map((t) => t.year))].sort();

export function talksByYear(year: number): Talk[] {
  return TALKS.filter((t) => t.year === year);
}
```

### Test this step

```bash
pnpm exec tsx -e "import('./src/data/talks.ts').then(m => console.log(m.YEARS, m.talksByYear(2026).map(t => t.title)))"
```

Expected:

```text
[ 2024, 2025, 2026 ] [ 'Shipping MCP Servers to Production' ]
```

---

## Step 3 · Your first tool: `get_talk`, served over stdio

Three files: the tool, the server factory and the stdio entry point.

**Why each part matters:**

- `inputSchema` (Zod) is turned into JSON Schema for the model **and** validates every call before your handler runs. A bad `year` never reaches your code.
- `outputSchema` plus `structuredContent` gives hosts typed JSON. `content` (text) is what the model reads.
- `annotations` tell the host that the tool is read-only, idempotent and does not touch the outside world, so a host can auto-approve it.
- A "no data" case returns `isError: true` with a helpful message rather than throwing. The model can read the message and recover ("Known years: …").
- The `description` says **when** to use the tool, not only what it does. Models choose tools from descriptions.

**File: `src/tools/get-talk.ts`**

```ts
import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { talksByYear, YEARS } from "../data/talks.js";

const TalkSchema = z.object({
  year: z.number(),
  title: z.string(),
  speaker: z.string(),
  track: z.enum(["main", "workshop"]),
  tags: z.array(z.string()),
});

export function registerGetTalk(server: McpServer): void {
  server.registerTool(
    "get_talk",
    {
      title: "Get JSConf talks by year",
      description:
        "List the talks given at the conference in a given year. Use when the user asks who spoke, " +
        "what was presented, or about a specific edition. Returns title, speaker, track and tags.",
      inputSchema: z.object({
        year: z
          .number()
          .int()
          .min(2000)
          .max(2100)
          .describe("Conference year, e.g. 2025"),
        track: z
          .enum(["main", "workshop"])
          .optional()
          .describe("Optional filter by track"),
      }),
      outputSchema: z.object({ year: z.number(), talks: z.array(TalkSchema) }),
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ year, track }) => {
      const talks = talksByYear(year).filter(
        (t) => !track || t.track === track,
      );
      if (talks.length === 0) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `No talks found for ${year}. Known years: ${YEARS.join(", ")}`,
            },
          ],
        };
      }
      const text = talks
        .map((t) => `• ${t.title} — ${t.speaker} [${t.track}]`)
        .join("\n");
      return {
        content: [{ type: "text", text }],
        structuredContent: { year, talks },
      };
    },
  );
}
```

**File: `src/server.ts`** (first version: tool only; Steps 4 and 5 add two lines each)

```ts
import { McpServer } from "@modelcontextprotocol/server";
import { registerGetTalk } from "./tools/get-talk.js";

/** Factory: builds a fresh, fully-registered server. Used by stdio and by tests. */
export function createServer(): McpServer {
  const server = new McpServer(
    { name: "jsconf-mcp", version: "0.1.0" },
    {
      instructions:
        "Conference catalog. Call get_talk(year) before answering questions about speakers.",
    },
  );
  registerGetTalk(server);
  return server;
}
```

**File: `src/index.ts`**

```ts
#!/usr/bin/env node
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createServer } from "./server.js";

// stdout is the JSON-RPC channel: never console.log here. Use stderr for logs.
serveStdio(createServer);
console.error("[jsconf-mcp] stdio server ready");
```

Notes:

- Imports end in `.js` even though the files are `.ts`. That is how NodeNext ESM works: TypeScript resolves `./server.js` to `server.ts` and the emitted JS is correct.
- `import * as z from 'zod/v4'` is the import style the SDK v2 docs use.
- `serveStdio(createServer)` handles both the 2026-07-28 protocol and older 2025-era clients over stdio.

### Test this step

Build, then drive the real binary with the **MCP Inspector CLI** (no UI and no model needed):

```bash
pnpm run build
pnpm dlx @modelcontextprotocol/inspector@2.12.0 --cli node dist/index.js --method tools/list
```

Expected (trimmed; the first line is our stderr log):

```text
[jsconf-mcp] stdio server ready
{
  "tools": [
    {
      "name": "get_talk",
      "title": "Get JSConf talks by year",
      "description": "List the talks given at the conference in a given year. Use when the user asks who spoke, what was presented, or about a specific edition. Returns title, speaker, track and tags.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "year": { "type": "integer", "minimum": 2000, "maximum": 2100, "description": "Conference year, e.g. 2025" },
  ...
```

Call the tool:

```bash
pnpm dlx @modelcontextprotocol/inspector@2.12.0 --cli node dist/index.js \
  --method tools/call --tool-name get_talk --tool-arg year=2026
```

```text
[jsconf-mcp] stdio server ready
{
  "content": [
    {
      "type": "text",
      "text": "• Shipping MCP Servers to Production — Oscar Oceguera [main]"
    }
  ],
  "structuredContent": {
    "year": 2026,
    "talks": [
      {
        "year": 2026,
        "title": "Shipping MCP Servers to Production",
        "speaker": "Oscar Oceguera",
        "track": "main",
        "tags": [
          "mcp",
          "ai",
          "node"
        ]
      }
    ]
  }
}
```

Now send bad input. The Zod schema rejects it before the handler runs:

```bash
pnpm dlx @modelcontextprotocol/inspector@2.12.0 --cli node dist/index.js \
  --method tools/call --tool-name get_talk --tool-arg year=1999
echo "exit code: $?"
```

```text
[jsconf-mcp] stdio server ready
{
  "content": [
    {
      "type": "text",
      "text": "Input validation error: Invalid arguments for tool get_talk: year: Too small: expected number to be >=2000"
    }
  ],
  "isError": true
}
{"error":{"code":"tool_is_error","message":"Tool 'get_talk' returned isError:true."}}
```

```text
exit code: 5
```

The Inspector CLI exits with **5** when a tool result has `isError: true`, which is handy in CI (see tutorial 02).

> Prefer a UI? `pnpm run inspect` opens the Inspector web app on `http://localhost:6274` with the same server.

---

## Step 4 · Add resources

**Why:** resources are read-only context the _user or app_ attaches (like "attach file"). A **template** (`jsconf://schedule/{year}`) exposes many URIs. Its `list` callback makes them discoverable in `resources/list`.

**File: `src/resources/schedule.ts`**

```ts
import { type McpServer, ResourceTemplate } from "@modelcontextprotocol/server";
import { TALKS, talksByYear, YEARS } from "../data/talks.js";

export function registerScheduleResources(server: McpServer): void {
  // Static resource: the full catalog as JSON.
  server.registerResource(
    "talks-catalog",
    "jsconf://talks",
    {
      title: "All talks",
      description: "Every talk in the catalog as JSON",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(TALKS, null, 2),
        },
      ],
    }),
  );

  // Template resource: one schedule per year, enumerable via `list`.
  server.registerResource(
    "schedule-by-year",
    new ResourceTemplate("jsconf://schedule/{year}", {
      list: async () => ({
        resources: YEARS.map((y) => ({
          uri: `jsconf://schedule/${y}`,
          name: `Schedule ${y}`,
        })),
      }),
    }),
    {
      title: "Schedule by year",
      description: "Markdown schedule for one edition",
      mimeType: "text/markdown",
    },
    async (uri, { year }) => {
      const talks = talksByYear(Number(year));
      const md = [
        `# JSConf ${year}`,
        ...talks.map((t) => `- **${t.title}** — ${t.speaker} (${t.track})`),
      ].join("\n");
      return {
        contents: [{ uri: uri.href, mimeType: "text/markdown", text: md }],
      };
    },
  );
}
```

**File: `src/server.ts`**: exact diff:

```diff
 import { McpServer } from '@modelcontextprotocol/server';
+import { registerScheduleResources } from './resources/schedule.js';
 import { registerGetTalk } from './tools/get-talk.js';
@@
   registerGetTalk(server);
+  registerScheduleResources(server);
   return server;
```

### Test this step

```bash
pnpm run build
pnpm dlx @modelcontextprotocol/inspector@2.12.0 --cli node dist/index.js --method resources/list
```

```text
[jsconf-mcp] stdio server ready
{
  "resources": [
    {
      "name": "talks-catalog",
      "title": "All talks",
      "uri": "jsconf://talks",
      "description": "Every talk in the catalog as JSON",
      "mimeType": "application/json"
    },
    {
      "name": "Schedule 2024",
      "title": "Schedule by year",
      "uri": "jsconf://schedule/2024",
      "description": "Markdown schedule for one edition",
      "mimeType": "text/markdown"
    },
    {
      "name": "Schedule 2025",
      "title": "Schedule by year",
      "uri": "jsconf://schedule/2025",
      "description": "Markdown schedule for one edition",
      "mimeType": "text/markdown"
    },
    {
      "name": "Schedule 2026",
      "title": "Schedule by year",
      "uri": "jsconf://schedule/2026",
      "description": "Markdown schedule for one edition",
      "mimeType": "text/markdown"
    }
  ]
}
```

Read one templated resource:

```bash
pnpm dlx @modelcontextprotocol/inspector@2.12.0 --cli node dist/index.js \
  --method resources/read --uri jsconf://schedule/2025
```

```text
[jsconf-mcp] stdio server ready
{
  "contents": [
    {
      "uri": "jsconf://schedule/2025",
      "mimeType": "text/markdown",
      "text": "# JSConf 2025\n- **Type-Safe APIs with Zod 4** — María Fernández (main)\n- **Testing at the Speed of Vitest** — Luis Herrera (workshop)"
    }
  ]
}
```

---

## Step 5 · Add a prompt

**Why:** prompts are reusable, user-invoked templates. In Claude Code they show up as slash commands (`/mcp__jsconf-basic__recommend_talks`). Prompt arguments are always **strings** on the wire, so the schema uses `z.string()`.

**File: `src/prompts/summarize-talk.ts`**

```ts
import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

export function registerSummarizePrompt(server: McpServer): void {
  server.registerPrompt(
    "recommend_talks",
    {
      title: "Recommend talks",
      description: "Ask the model to recommend talks for a developer profile",
      argsSchema: z.object({
        year: z.string().describe("Conference year, e.g. 2025"),
        interests: z
          .string()
          .describe('Comma-separated interests, e.g. "react, testing"'),
      }),
    },
    ({ year, interests }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text:
              `Use the get_talk tool with year=${year}. Then recommend the 2 best talks for a developer ` +
              `interested in: ${interests}. Explain each pick in one sentence.`,
          },
        },
      ],
    }),
  );
}
```

**File: `src/server.ts`**: exact diff:

```diff
 import { McpServer } from '@modelcontextprotocol/server';
+import { registerSummarizePrompt } from './prompts/summarize-talk.js';
 import { registerScheduleResources } from './resources/schedule.js';
@@
   registerScheduleResources(server);
+  registerSummarizePrompt(server);
   return server;
```

Final **`src/server.ts`**:

```ts
import { McpServer } from "@modelcontextprotocol/server";
import { registerSummarizePrompt } from "./prompts/summarize-talk.js";
import { registerScheduleResources } from "./resources/schedule.js";
import { registerGetTalk } from "./tools/get-talk.js";

/** Factory: builds a fresh, fully-registered server. Used by stdio and by tests. */
export function createServer(): McpServer {
  const server = new McpServer(
    { name: "jsconf-mcp", version: "0.1.0" },
    {
      instructions:
        "Conference catalog. Call get_talk(year) before answering questions about speakers.",
    },
  );
  registerGetTalk(server);
  registerScheduleResources(server);
  registerSummarizePrompt(server);
  return server;
}
```

### Test this step

```bash
pnpm run build
pnpm dlx @modelcontextprotocol/inspector@2.12.0 --cli node dist/index.js \
  --method prompts/get --prompt-name recommend_talks --prompt-args year=2025 interests=testing
```

```text
[jsconf-mcp] stdio server ready
{
  "messages": [
    {
      "role": "user",
      "content": {
        "type": "text",
        "text": "Use the get_talk tool with year=2025. Then recommend the 2 best talks for a developer interested in: testing. Explain each pick in one sentence."
      }
    }
  ]
}
```

---

## Step 6 · Vitest tests (in-process + stdio e2e)

**Why:** Inspector checks are manual. Tests lock the behavior in place. Two layers:

1. **In-process** (fast, no child process): a real `Client` talks to `createMcpHandler(createServer)` through a `fetch` function. This exercises the full 2026-07-28 protocol path (discovery, validation, results) with no port.
2. **End-to-end over stdio**: spawns `dist/index.js` exactly as Claude Code would.

**File: `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    testTimeout: 15_000,
  },
});
```

**File: `test/helpers.ts`**

```ts
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { createServer } from "../src/server.js";

/** Connects a real Client to our server factory in-process (2026-07-28 era, no port). */
export async function connectInProcess() {
  const handler = createMcpHandler(createServer);
  const transport = new StreamableHTTPClientTransport(
    new URL("http://test.local/mcp"),
    {
      fetch: (url, init) => handler.fetch(new Request(url, init)),
    },
  );
  const client = new Client(
    { name: "vitest", version: "1.0.0" },
    { versionNegotiation: { mode: "auto" } },
  );
  await client.connect(transport);
  return {
    client,
    close: async () => {
      await client.close();
      await handler.close();
    },
  };
}
```

**File: `test/server.test.ts`**

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Client } from "@modelcontextprotocol/client";
import { connectInProcess } from "./helpers.js";

let client: Client;
let close: () => Promise<void>;

beforeEach(async () => {
  ({ client, close } = await connectInProcess());
});
afterEach(async () => {
  await close();
});

describe("jsconf-mcp (in-process, 2026-07-28)", () => {
  it("negotiates the modern era", () => {
    expect(client.getDiscoverResult()).toBeDefined();
    expect(client.getServerVersion()?.name).toBe("jsconf-mcp");
  });

  it("lists get_talk with read-only annotations", async () => {
    const { tools } = await client.listTools();
    const tool = tools.find((t) => t.name === "get_talk");
    expect(tool?.annotations?.readOnlyHint).toBe(true);
    expect(tool?.inputSchema.required).toEqual(["year"]);
  });

  it("returns structured talks for a known year", async () => {
    const res = await client.callTool({
      name: "get_talk",
      arguments: { year: 2025 },
    });
    expect(res.isError).toBeFalsy();
    const data = res.structuredContent as { talks: { speaker: string }[] };
    expect(data.talks.map((t) => t.speaker)).toEqual([
      "María Fernández",
      "Luis Herrera",
    ]);
  });

  it("filters by track", async () => {
    const res = await client.callTool({
      name: "get_talk",
      arguments: { year: 2025, track: "workshop" },
    });
    expect((res.structuredContent as { talks: unknown[] }).talks).toHaveLength(
      1,
    );
  });

  it("returns a recoverable tool error for an unknown year", async () => {
    const res = await client.callTool({
      name: "get_talk",
      arguments: { year: 2019 },
    });
    expect(res.isError).toBe(true);
    expect(JSON.stringify(res.content)).toContain(
      "Known years: 2024, 2025, 2026",
    );
  });

  it("rejects bad input via the Zod schema", async () => {
    const res = await client.callTool({
      name: "get_talk",
      arguments: { year: "twenty" },
    });
    expect(res.isError).toBe(true);
    expect(JSON.stringify(res.content)).toContain("Input validation error");
  });

  it("lists and reads resources", async () => {
    const { resources } = await client.listResources();
    expect(resources.map((r) => r.uri)).toContain("jsconf://schedule/2026");
    const { contents } = await client.readResource({
      uri: "jsconf://schedule/2026",
    });
    expect((contents[0] as { text: string }).text).toContain("Oscar Oceguera");
  });

  it("renders the recommend_talks prompt", async () => {
    const { messages } = await client.getPrompt({
      name: "recommend_talks",
      arguments: { year: "2025", interests: "testing" },
    });
    expect((messages[0]!.content as { text: string }).text).toContain(
      "year=2025",
    );
  });
});
```

**File: `test/stdio.e2e.test.ts`**

```ts
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { describe, expect, it } from "vitest";

// Spawns the real built binary (run `pnpm run build` first).
describe("stdio e2e", () => {
  it("serves get_talk over stdio", async () => {
    const client = new Client({ name: "vitest-stdio", version: "1.0.0" });
    await client.connect(
      new StdioClientTransport({
        command: "node",
        args: ["dist/index.js"],
        stderr: "ignore",
      }),
    );
    try {
      const res = await client.callTool({
        name: "get_talk",
        arguments: { year: 2026 },
      });
      expect(JSON.stringify(res.content)).toContain(
        "Shipping MCP Servers to Production",
      );
    } finally {
      await client.close();
    }
  });
});
```

### Test this step

```bash
pnpm run build && pnpm run typecheck && pnpm exec vitest run --reporter=verbose
```

```text

 RUN  v5.0.5 /workspace/mcp-lab/basic

 ✓ test/server.test.ts > jsconf-mcp (in-process, 2026-07-28) > negotiates the modern era 49ms
 ✓ test/server.test.ts > jsconf-mcp (in-process, 2026-07-28) > lists get_talk with read-only annotations 11ms
 ✓ test/server.test.ts > jsconf-mcp (in-process, 2026-07-28) > returns structured talks for a known year 8ms
 ✓ test/server.test.ts > jsconf-mcp (in-process, 2026-07-28) > filters by track 4ms
 ✓ test/server.test.ts > jsconf-mcp (in-process, 2026-07-28) > returns a recoverable tool error for an unknown year 4ms
 ✓ test/server.test.ts > jsconf-mcp (in-process, 2026-07-28) > rejects bad input via the Zod schema 3ms
 ✓ test/server.test.ts > jsconf-mcp (in-process, 2026-07-28) > lists and reads resources 8ms
 ✓ test/server.test.ts > jsconf-mcp (in-process, 2026-07-28) > renders the recommend_talks prompt 4ms
 ✓ test/stdio.e2e.test.ts > stdio e2e > serves get_talk over stdio 143ms

 Test Files  2 passed (2)
      Tests  9 passed (9)
   Start at  02:08:51
   Duration  340ms (tests 51%, import 41%, transform 6%, worker 1%)
```

Break something on purpose to see a test fail. In `src/tools/get-talk.ts`, change `isError: true` to `isError: false` and run `pnpm exec vitest run`: "returns a recoverable tool error for an unknown year" fails. Revert the change.

---

## Step 7 · Use it from Claude Code

**Why:** a project-scoped `.mcp.json` lives in the repo, so teammates get the server automatically after approving it.

```bash
pnpm run build
claude mcp add --scope project jsconf-basic -- node dist/index.js
```

This writes **File: `.mcp.json`**:

```json
{
  "mcpServers": {
    "jsconf-basic": {
      "type": "stdio",
      "command": "node",
      "args": ["dist/index.js"],
      "env": {}
    }
  }
}
```

### Test this step

```bash
claude mcp list
```

Expected (Claude Code 2.1.310):

```text
Checking MCP server health…

jsconf-basic: node dist/index.js - ⏸ Pending approval (run `claude` to approve)
```

Start `claude` in the `basic/` folder, approve the project server when prompted, and run `/mcp`. You should see `jsconf-basic · connected · 1 tool`. Then ask: _"Who spoke at JSConf 2026?"_. Claude calls `get_talk` with `{"year": 2026}`.

> Verified on the box: the `claude mcp add` and `claude mcp list` output above. **Not verified:** the interactive approval and an actual model tool call, which need your Claude login.

---

## Step 8 · Use it from Cursor

**Why:** Cursor reads `.cursor/mcp.json` from the project. `${workspaceFolder}` makes the path independent of where Cursor starts the process.

**File: `.cursor/mcp.json`**

```json
{
  "mcpServers": {
    "jsconf-basic": {
      "command": "node",
      "args": ["${workspaceFolder}/dist/index.js"]
    }
  }
}
```

### Test this step

1. `pnpm run build`
2. Open the `basic/` folder in Cursor → **Settings → MCP**. `jsconf-basic` appears with a green dot and lists `get_talk`.
3. In Agent chat, ask _"List the 2025 workshop talks"_. Cursor proposes `get_talk` with `{"year":2025,"track":"workshop"}`.

> **Not verified on the box** (no Cursor GUI there). The JSON format is Cursor's documented `mcpServers` format. If the server shows red, open **Output → MCP Logs**. The usual cause is a missing `dist/` (run `pnpm run build`).

---

## Troubleshooting

| Symptom                                   | Cause                         | Fix                                      |
| ----------------------------------------- | ----------------------------- | ---------------------------------------- |
| Host shows "connection closed" right away | Something wrote to **stdout** | Use `console.error`, never `console.log` |
| `ERR_MODULE_NOT_FOUND ... /server`        | Import without `.js`          | Write `./server.js` in TS imports        |
| Vitest: "requires Node ^22.12"            | Old Node                      | Install Node 24 LTS                      |
| e2e test fails with ENOENT                | `dist/` missing               | `pnpm run build` before `pnpm test`      |
| Inspector exit code 5                     | Tool returned `isError: true` | Expected for bad input                   |

## What you learned

- stdio transport, a server factory, and why stdout is sacred
- typed tools (input/output schemas, annotations, recoverable `isError`)
- static and template resources; prompts
- testing at two levels with Vitest; Inspector CLI for quick manual checks
- wiring into Claude Code and Cursor

Next: **[02 · Intermediate](02-intermediate-mcp.md)** takes the same tools to a Next.js route on Vercel, adds a TS client, CI and npm publishing.
