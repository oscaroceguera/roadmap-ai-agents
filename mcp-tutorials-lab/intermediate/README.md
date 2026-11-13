# 02 · Intermediate MCP: remote server on Next.js (Vercel), TS client, CI and publishing

You will turn the catalog into a **remote MCP server** that people can use without cloning anything:

- a **stateless Streamable HTTP** endpoint at `app/api/mcp/route.ts` in a Next.js 16 app, using `mcp-handler`, ready for Vercel
- error handling that models can recover from (validation errors, upstream failures)
- Vitest tests that call **the exact route handler** in-process
- a **TypeScript client** (`client/demo-client.ts`)
- the same tools as an **npm package with a stdio bin** (`npx @oscaroceguera/jsconf-mcp`)
- a **`server.json`** for the official MCP Registry, validated against its schema
- a **GitHub Actions** pipeline with an Inspector smoke test

Prerequisite: [01 · Basic](01-basic-mcp.md). Time: about 90 minutes.

> **What ran on the box and what did not.** Everything here was built and run locally (`next build`, `next start`, curl, Inspector, tests, `pnpm pack`, installing the packed tarball, schema validation). **Not run:** `vercel deploy`, `pnpm publish`, `mcp-publisher publish` and the GitHub Actions run. Each of these has a local equivalent below that proves the same thing.

## Project tree at the start

```text
intermediate/        (empty folder)
```

## Project tree at the end

```text
intermediate/
├── .github/
│   └── workflows/
│       └── ci.yml
├── app/
│   ├── api/
│   │   └── mcp/
│   │       └── route.ts
│   ├── layout.tsx
│   └── page.tsx
├── bin/
│   └── stdio.ts
├── client/
│   └── demo-client.ts
├── lib/
│   ├── data/
│   │   ├── ratings.ts
│   │   └── talks.ts
│   └── mcp/
│       └── register.ts
├── scripts/
│   ├── smoke-inspector.sh
│   └── validate-server-json.mjs
├── test/
│   ├── helpers.ts
│   └── route.test.ts
├── .gitignore
├── README.md
├── next.config.ts
├── package.json
├── server.json
├── tsconfig.bin.json
├── tsconfig.json
└── vitest.config.ts
```

## Why one shared `register.ts`?

```text
                    lib/mcp/register.ts  (tools defined once)
                     ▲                        ▲
app/api/mcp/route.ts (HTTP, Vercel)     bin/stdio.ts (npx, local)
```

The HTTP route and the stdio binary both call `registerJsconf(server)`, so the tools cannot drift between the two.

## Why stateless?

MCP **2026-07-28** removed the session handshake from HTTP. Every request carries its protocol version, client info and capabilities in `params._meta`, and the routing headers `Mcp-Method` / `Mcp-Name`. Any Vercel function instance can answer any request, with no sticky sessions, no session store and no SSE stream to keep open. `mcp-handler` 2.3.0 still answers older 2025-era clients through a built-in fallback.

---

## Step 1 · Scaffold a minimal Next.js 16 app

**Why:** you need only a route handler. A tiny `app/` keeps the build fast. Note the dependency split: only `@modelcontextprotocol/server` and `zod` are runtime **dependencies**, because that is all the published stdio bin needs. Next, React and `mcp-handler` are needed only to build the web app, so they are dev dependencies (Vercel installs dev dependencies when it builds).

```bash
mkdir intermediate && cd intermediate
pnpm init
pnpm add -E @modelcontextprotocol/server@2.4.0 zod@4.6.7
pnpm add -E -D next@16.4.3 react@19.3.1 react-dom@19.3.1 mcp-handler@2.3.0 \
  @modelcontextprotocol/client@2.4.0 typescript@7.0.2 tsx@4.23.15 vitest@5.0.5 \
  @types/node@24.19.2 @types/react@19.3.0 @types/react-dom@19.3.0 ajv@8.20.0 ajv-formats@3.0.1
```

**File: `package.json`** (final version; `mcpName` and `bin` are explained in Steps 7–8)

```json
{
  "name": "@oscaroceguera/jsconf-mcp",
  "version": "0.2.0",
  "description": "JSConf-style talks catalog as an MCP server (Streamable HTTP on Next.js + stdio bin)",
  "mcpName": "io.github.oscaroceguera/jsconf-mcp",
  "type": "module",
  "license": "MIT",
  "engines": {
    "node": ">=22.12.0"
  },
  "bin": {
    "jsconf-mcp": "dist/bin/stdio.js"
  },
  "files": ["dist", "README.md"],
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start --port 3000",
    "build:bin": "tsc -p tsconfig.bin.json",
    "prepublishOnly": "pnpm run build:bin",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "client": "tsx client/demo-client.ts",
    "validate:server-json": "node scripts/validate-server-json.mjs"
  },
  "dependencies": {
    "@modelcontextprotocol/server": "2.4.0",
    "zod": "4.6.7"
  },
  "devDependencies": {
    "@modelcontextprotocol/client": "2.4.0",
    "@types/node": "24.19.2",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "ajv": "8.20.0",
    "ajv-formats": "3.0.1",
    "mcp-handler": "2.3.0",
    "next": "16.4.3",
    "react": "19.3.1",
    "react-dom": "19.3.1",
    "tsx": "4.23.15",
    "typescript": "7.0.2",
    "vitest": "5.0.5"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/oscaroceguera/jsconf-mcp.git"
  }
}
```

**File: `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["dom", "dom.iterable", "es2023"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    },
    "allowImportingTsExtensions": true
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts"
  ],
  "exclude": ["node_modules", "dist"]
}
```

**File: `next.config.ts`**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

**File: `app/layout.tsx`**

```tsx
export const metadata = { title: "JSConf MCP" };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

**File: `app/page.tsx`**

```tsx
export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui", padding: 32 }}>
      <h1>JSConf MCP server</h1>
      <p>
        MCP endpoint: <code>/api/mcp</code> (Streamable HTTP, stateless)
      </p>
    </main>
  );
}
```

**File: `.gitignore`**

```text
node_modules
.next
dist
*.tsbuildinfo
next-env.d.ts
```

### Test this step

```bash
pnpm exec next build
```

Expected: the build ends with a route table containing `○ /`. (Route `/api/mcp` appears after Step 3.)

---

## Step 2 · Data, a simulated upstream and the shared tools

**Why:**

- `search_talks` calls a "ratings API", which makes it an **open-world** tool (`openWorldHint: true`). Upstreams fail, so the handler **catches** the failure and returns `isError: true` with a next step ("Retry later or use get_talk"). It does not throw a protocol error the model cannot act on.
- Zod `.trim().min(2).max(50)` rejects junk queries before any network call.
- `RATINGS_DOWN=1` lets you simulate an outage in tests and by hand.
- Imports use the `.ts` extension (`allowImportingTsExtensions`). The same files then compile for the bin with `rewriteRelativeImportExtensions` (Step 7).

**File: `lib/data/talks.ts`**

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

**File: `lib/data/ratings.ts`**

```ts
// Simulated upstream "ratings" API. In real life this would be a fetch() to another service.
const RATINGS: Record<string, number> = {
  "Signals in the Wild": 4.7,
  "Edge Functions from Zero": 4.4,
  "Type-Safe APIs with Zod 4": 4.9,
  "Testing at the Speed of Vitest": 4.6,
  "Shipping MCP Servers to Production": 4.8,
};

export async function fetchRating(title: string): Promise<number | undefined> {
  if (process.env.RATINGS_DOWN === "1")
    throw new Error("ratings upstream unavailable (503)");
  return RATINGS[title];
}
```

**File: `lib/mcp/register.ts`**

```ts
import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { fetchRating } from "../data/ratings.ts";
import { TALKS, talksByYear, YEARS } from "../data/talks.ts";

/** Registers every tool on any McpServer: shared by the Next.js route and the stdio bin. */
export function registerJsconf(server: McpServer): void {
  server.registerTool(
    "get_talk",
    {
      title: "Get talks by year",
      description:
        'List conference talks for one year (title, speaker, track). Use for "who spoke in <year>".',
      inputSchema: z.object({
        year: z
          .number()
          .int()
          .min(2000)
          .max(2100)
          .describe("Conference year, e.g. 2025"),
      }),
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ year }) => {
      const talks = talksByYear(year);
      if (talks.length === 0) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `No talks for ${year}. Known years: ${YEARS.join(", ")}`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: "text",
            text: talks.map((t) => `• ${t.title} — ${t.speaker}`).join("\n"),
          },
        ],
        structuredContent: { year, talks },
      };
    },
  );

  server.registerTool(
    "search_talks",
    {
      title: "Search talks with ratings",
      description:
        "Full-text search over talk titles and tags; includes the audience rating (1-5) from the ratings API.",
      inputSchema: z.object({
        query: z
          .string()
          .trim()
          .min(2)
          .max(50)
          .describe('Keyword, e.g. "react" or "testing"'),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ query }) => {
      const q = query.toLowerCase();
      const hits = TALKS.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.includes(q)),
      );
      try {
        const rated = await Promise.all(
          hits.map(async (t) => ({ ...t, rating: await fetchRating(t.title) })),
        );
        return {
          content: [
            {
              type: "text",
              text:
                rated
                  .map((t) => `${t.title} (${t.year}) ★${t.rating ?? "?"}`)
                  .join("\n") || "No matches",
            },
          ],
          structuredContent: { query, results: rated },
        };
      } catch (err) {
        // Recoverable: tell the model what happened and what to do next.
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Ratings service failed: ${(err as Error).message}. Retry later or use get_talk.`,
            },
          ],
        };
      }
    },
  );
}
```

### Test this step

```bash
pnpm exec tsc --noEmit && echo "types OK"
```

```text
types OK
```

---

## Step 3 · The route handler: `app/api/mcp/route.ts`

**Why:** `createMcpHandler` from `mcp-handler` returns a Web-standard `(Request) => Response` handler that the App Router can export directly. It is stateless by design.

**File: `app/api/mcp/route.ts`**

```ts
import { createMcpHandler } from "mcp-handler";
import { registerJsconf } from "@/lib/mcp/register";

// One stateless handler: 2026-07-28 natively, 2025-era Streamable HTTP via fallback.
const handler = createMcpHandler(
  (server) => {
    registerJsconf(server);
  },
  {
    serverInfo: { name: "jsconf-mcp", version: "0.2.0" },
    instructions:
      "Conference catalog. Prefer get_talk for a year, search_talks for topics.",
  },
);

export { handler as GET, handler as POST, handler as DELETE };
```

### Test this step

Terminal A:

```bash
pnpm exec next build && pnpm exec next start --port 3000
```

Terminal B: a **raw 2026-07-28 request** with curl. Look at the `_meta` envelope and the `Mcp-Method` / `Mcp-Name` headers:

```bash
curl -s -X POST http://localhost:3000/api/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -H 'mcp-protocol-version: 2026-07-28' \
  -H 'mcp-method: tools/call' \
  -H 'mcp-name: get_talk' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_talk","arguments":{"year":2026},
       "_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28",
                "io.modelcontextprotocol/clientInfo":{"name":"curl","version":"1.0.0"},
                "io.modelcontextprotocol/clientCapabilities":{}}}}'
```

```text
{"result":{"content":[{"type":"text","text":"• Shipping MCP Servers to Production — Oscar Oceguera"}],"structuredContent":{"year":2026,"talks":[{"year":2026,"title":"Shipping MCP Servers to Production","speaker":"Oscar Oceguera","track":"main","tags":["mcp","ai","node"]}]},"resultType":"complete","_meta":{"io.modelcontextprotocol/serverInfo":{"name":"jsconf-mcp","version":"0.2.0"}}},"jsonrpc":"2.0","id":1}
```

There was no `initialize` and no session id: one request, one answer. Leave out `_meta` and the server tells you exactly what is missing:

```text
{"jsonrpc":"2.0","error":{"code":-32602,"message":"Invalid params: the MCP-Protocol-Version header names protocol revision 2026-07-28, but the request is missing the required per-request envelope key(s): _meta","data":{"envelope":{"missing":["_meta"]}}},"id":1}
```

The same endpoint works with the Inspector CLI (it negotiates the older era, which shows the fallback working):

```bash
pnpm dlx @modelcontextprotocol/inspector@2.12.0 --cli http://localhost:3000/api/mcp --method tools/list | grep '"name"'
```

```text
      "name": "get_talk",
      "name": "search_talks",
```

```bash
pnpm dlx @modelcontextprotocol/inspector@2.12.0 --cli http://localhost:3000/api/mcp \
  --method tools/call --tool-name search_talks --tool-arg query=react
```

```text
{
  "content": [
    {
      "type": "text",
      "text": "Signals in the Wild (2024) ★4.7"
    }
  ],
  "structuredContent": {
    "query": "react",
    "results": [
      {
        "year": 2024,
        "title": "Signals in the Wild",
        "speaker": "Ana López",
        "track": "main",
        "tags": [
          "react",
          "signals"
        ],
        "rating": 4.7
      }
    ]
  }
}
```

Simulate an outage: stop the server, start it with `RATINGS_DOWN=1 pnpm exec next start --port 3000`, and repeat the call. You get `isError: true` with "Ratings service failed: ratings upstream unavailable (503). Retry later or use get_talk.", and the Inspector exits with code 5.

---

## Step 4 · Test the route in-process with Vitest

**Why:** no port, no `next dev` and no flakiness. The helper hands a custom `fetch` to the real client transport that calls your exported `POST` directly. This covers the same code path that Vercel runs.

**File: `vitest.config.ts`**

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname) } },
  test: { include: ["test/**/*.test.ts"], testTimeout: 15_000 },
});
```

**File: `test/helpers.ts`**

```ts
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { POST } from "@/app/api/mcp/route";

/** Real Client -> the exact Next.js route handler, in-process (no `next dev`, no port). */
export async function connectToRoute(): Promise<Client> {
  const transport = new StreamableHTTPClientTransport(
    new URL("http://test.local/api/mcp"),
    {
      fetch: (url, init) => POST(new Request(url, init)),
    },
  );
  const client = new Client(
    { name: "vitest", version: "1.0.0" },
    { versionNegotiation: { mode: "auto" } },
  );
  await client.connect(transport);
  return client;
}
```

**File: `test/route.test.ts`**: note the table-driven `bad input` cases and the outage test using `vi.stubEnv`.

```ts
import type { Client } from "@modelcontextprotocol/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { connectToRoute } from "./helpers";

let client: Client;
beforeEach(async () => {
  client = await connectToRoute();
});
afterEach(async () => {
  await client.close();
  vi.unstubAllEnvs();
});

describe("app/api/mcp/route.ts", () => {
  describe("success", () => {
    it("speaks the 2026-07-28 era and lists both tools", async () => {
      expect(client.getDiscoverResult()).toBeDefined();
      const { tools } = await client.listTools();
      expect(tools.map((t) => t.name).sort()).toEqual([
        "get_talk",
        "search_talks",
      ]);
    });

    it("get_talk returns structured content", async () => {
      const res = await client.callTool({
        name: "get_talk",
        arguments: { year: 2024 },
      });
      expect(res.isError).toBeFalsy();
      expect(
        (res.structuredContent as { talks: unknown[] }).talks,
      ).toHaveLength(2);
    });

    it("search_talks merges ratings", async () => {
      const res = await client.callTool({
        name: "search_talks",
        arguments: { query: "vitest" },
      });
      const { results } = res.structuredContent as {
        results: { rating: number }[];
      };
      expect(results[0]?.rating).toBe(4.6);
    });
  });

  describe("bad input", () => {
    it.each([
      [{ year: "nope" }, "expected number"],
      [{ year: 1999 }, "Too small"],
      [{}, "year"],
    ])('get_talk(%j) -> isError mentioning "%s"', async (args, needle) => {
      const res = await client.callTool({ name: "get_talk", arguments: args });
      expect(res.isError).toBe(true);
      expect(JSON.stringify(res.content)).toContain(needle);
    });

    it("search_talks rejects a 1-char query", async () => {
      const res = await client.callTool({
        name: "search_talks",
        arguments: { query: "a" },
      });
      expect(res.isError).toBe(true);
    });

    it("unknown tool is reported as an error", async () => {
      const res = await client
        .callTool({ name: "drop_database", arguments: {} })
        .catch((e: Error) => e);
      expect(JSON.stringify(res instanceof Error ? res.message : res)).toMatch(
        /drop_database/,
      );
    });
  });

  describe("upstream errors", () => {
    it("search_talks returns a recoverable isError when ratings are down", async () => {
      vi.stubEnv("RATINGS_DOWN", "1");
      const res = await client.callTool({
        name: "search_talks",
        arguments: { query: "react" },
      });
      expect(res.isError).toBe(true);
      expect(JSON.stringify(res.content)).toContain(
        "Retry later or use get_talk",
      );
    });
  });
});
```

### Test this step

```bash
pnpm exec vitest run --reporter=verbose
```

```text

 RUN  v5.0.5 /workspace/mcp-lab/intermediate

 ✓ test/route.test.ts > app/api/mcp/route.ts > success > speaks the 2026-07-28 era and lists both tools 59ms
 ✓ test/route.test.ts > app/api/mcp/route.ts > success > get_talk returns structured content 9ms
 ✓ test/route.test.ts > app/api/mcp/route.ts > success > search_talks merges ratings 4ms
 ✓ test/route.test.ts > app/api/mcp/route.ts > bad input > get_talk({"year":"nope"}) -> isError mentioning "expected number" 4ms
 ✓ test/route.test.ts > app/api/mcp/route.ts > bad input > get_talk({"year":1999}) -> isError mentioning "Too small" 3ms
 ✓ test/route.test.ts > app/api/mcp/route.ts > bad input > get_talk({}) -> isError mentioning "year" 3ms
 ✓ test/route.test.ts > app/api/mcp/route.ts > bad input > search_talks rejects a 1-char query 3ms
 ✓ test/route.test.ts > app/api/mcp/route.ts > bad input > unknown tool is reported as an error 3ms
 ✓ test/route.test.ts > app/api/mcp/route.ts > upstream errors > search_talks returns a recoverable isError when ratings are down 3ms

 Test Files  1 passed (1)
      Tests  9 passed (9)
   Start at  02:08:52
   Duration  383ms (import 46%, tests 32%, transform 21%, worker 1%)
```

---

## Step 5 · A TypeScript client

**Why:** this is how _your_ apps (an Express backend, a Next.js server action, a script) call an MCP server without a chat host. `versionNegotiation: { mode: 'auto' }` uses the 2026-07-28 protocol when the server supports it and falls back otherwise.

**File: `client/demo-client.ts`**

```ts
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";

const url = new URL(process.env.MCP_URL ?? "http://localhost:3000/api/mcp");

async function main(): Promise<void> {
  const client = new Client(
    { name: "jsconf-demo-client", version: "1.0.0" },
    { versionNegotiation: { mode: "auto" } },
  );
  await client.connect(new StreamableHTTPClientTransport(url));
  try {
    const era = client.getDiscoverResult()
      ? "modern (2026-07-28)"
      : "legacy (2025-era)";
    console.log(
      `connected to ${client.getServerVersion()?.name} — era: ${era}`,
    );

    const { tools } = await client.listTools();
    console.log("tools:", tools.map((t) => t.name).join(", "));

    const res = await client.callTool({
      name: "get_talk",
      arguments: { year: 2026 },
    });
    console.log("get_talk(2026):", (res.content[0] as { text: string }).text);

    const bad = await client.callTool({
      name: "get_talk",
      arguments: { year: "nope" },
    });
    console.log("bad input isError:", bad.isError);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

### Test this step

With `pnpm exec next start --port 3000` running:

```bash
pnpm run client
```

```text
connected to jsconf-mcp — era: modern (2026-07-28)
tools: get_talk, search_talks
get_talk(2026): • Shipping MCP Servers to Production — Oscar Oceguera
bad input isError: true
```

Point it at any server with `MCP_URL=https://… pnpm run client`.

---

## Step 6 · Deploy to Vercel (+ local equivalent)

**Why:** Vercel runs the route as a Fluid Compute function. Because the handler is stateless, scaling out needs no configuration.

```bash
pnpm add -g vercel@latest
vercel link            # create/link the project
vercel deploy          # preview URL
vercel deploy --prod   # https://jsconf-mcp.vercel.app
```

Then connect a host to the remote URL:

```bash
claude mcp add --transport http jsconf https://jsconf-mcp.vercel.app/api/mcp
```

Cursor (`.cursor/mcp.json`):

```json
{
  "mcpServers": { "jsconf": { "url": "https://jsconf-mcp.vercel.app/api/mcp" } }
}
```

> **Not verified:** no deploy was made (the task did not allow publishing) and the URL `jsconf-mcp.vercel.app` is a placeholder. **Local equivalent (verified):** `next build && next start` runs the same production build of the route, and Steps 3–5 tested it over real HTTP. After you deploy, run the Step 3 curl and `MCP_URL=https://<your-url>/api/mcp pnpm run client` against your URL.

### Test this step (after a real deploy)

```bash
MCP_URL=https://<your-deployment>/api/mcp pnpm run client
```

Expected: the same four lines as Step 5.

---

## Step 7 · The same tools as an npm package with a stdio bin

**Why:** some users want a local server (`npx` in their MCP config). The bin reuses `registerJsconf`. `tsconfig.bin.json` compiles only `bin/` and `lib/`, and rewrites `.ts` imports to `.js`. The `files` field in `package.json` ships only `dist/` and the README.

**File: `bin/stdio.ts`**

```ts
#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { registerJsconf } from "../lib/mcp/register.ts";

// Same tools as app/api/mcp/route.ts, but over stdio for `npx @oscaroceguera/jsconf-mcp`.
serveStdio(() => {
  const server = new McpServer({ name: "jsconf-mcp", version: "0.2.0" });
  registerJsconf(server);
  return server;
});
```

**File: `tsconfig.bin.json`**

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "skipLibCheck": true,
    "rewriteRelativeImportExtensions": true,
    "outDir": "dist",
    "rootDir": ".",
    "types": ["node"]
  },
  "include": ["bin/**/*.ts", "lib/**/*.ts"]
}
```

**File: `README.md`** (the npm page)

````markdown
# @oscaroceguera/jsconf-mcp

JSConf-style talks catalog as an MCP server (protocol 2026-07-28).

## Use it (stdio)

```json
{
  "mcpServers": {
    "jsconf": { "command": "npx", "args": ["-y", "@oscaroceguera/jsconf-mcp"] }
  }
}
```

## Use it (remote, Streamable HTTP)

`https://jsconf-mcp.vercel.app/api/mcp`

## Tools

| Tool           | What it does                |
| -------------- | --------------------------- |
| `get_talk`     | Talks of one year           |
| `search_talks` | Keyword search with ratings |
````

### Test this step

```bash
pnpm run build:bin
pnpm dlx @modelcontextprotocol/inspector@2.12.0 --cli node dist/bin/stdio.js \
  --method tools/call --tool-name get_talk --tool-arg year=2025
```

```text
{
  "content": [
    {
      "type": "text",
      "text": "• Type-Safe APIs with Zod 4 — María Fernández\n• Testing at the Speed of Vitest — Luis Herrera"
    }
  ],
  "structuredContent": {
    "year": 2025,
    "talks": [
      {
        "year": 2025,
        "title": "Type-Safe APIs with Zod 4",
        "speaker": "María Fernández",
        "track": "main",
        "tags": [
          "typescript",
          "zod"
        ]
      },
      {
        "year": 2025,
        "title": "Testing at the Speed of Vitest",
        "speaker": "Luis Herrera",
        "track": "workshop",
        "tags": [
          "testing",
          "vitest"
        ]
      }
    ]
  }
}
```

Check exactly what would be published:

```bash
pnpm pack --dry-run
```

```text
📦 @oscaroceguera/jsconf-mcp@0.2.0
Tarball Contents
README.md
dist/bin/stdio.js
dist/lib/data/ratings.js
dist/lib/data/talks.js
dist/lib/mcp/register.js
package.json
Tarball Details
oscaroceguera-jsconf-mcp-0.2.0.tgz
```

Six files, no `app/`, no tests. (File list from the original `npm pack` run; pnpm prints it in its own format.)

**Local equivalent of `pnpm publish` (verified):** install the real tarball in a clean folder and run it the way a user would:

```bash
pnpm pack                                   # writes oscaroceguera-jsconf-mcp-0.2.0.tgz
mkdir -p /tmp/bintest && cd /tmp/bintest && pnpm init >/dev/null
pnpm add -E "$OLDPWD/oscaroceguera-jsconf-mcp-0.2.0.tgz"
pnpm dlx @modelcontextprotocol/inspector@2.12.0 --cli pnpm exec jsconf-mcp \
  --method tools/call --tool-name get_talk --tool-arg year=2025
```

Expected: the same JSON as above. Only the two runtime dependencies get installed, with no Next or React.

**Real publish (not run):**

```bash
npm login
pnpm publish --access public   # prepublishOnly runs build:bin first; add --no-git-checks if the tree is dirty
```

---

## Step 8 · `server.json` for the MCP Registry

**Why:** the official registry (`registry.modelcontextprotocol.io`) lists servers through a `server.json`. The registry checks that `name` matches `mcpName` in your npm `package.json`, which proves you own the package. With the `io.github.<user>/…` namespace, ownership is proven by GitHub login.

**File: `server.json`**

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
  "name": "io.github.oscaroceguera/jsconf-mcp",
  "title": "JSConf Talks",
  "description": "Search JSConf-style conference talks by year or topic, with ratings.",
  "repository": {
    "url": "https://github.com/oscaroceguera/jsconf-mcp",
    "source": "github"
  },
  "version": "0.2.0",
  "packages": [
    {
      "registryType": "npm",
      "identifier": "@oscaroceguera/jsconf-mcp",
      "version": "0.2.0",
      "transport": { "type": "stdio" }
    }
  ],
  "remotes": [
    {
      "type": "streamable-http",
      "url": "https://jsconf-mcp.vercel.app/api/mcp"
    }
  ]
}
```

**File: `scripts/validate-server-json.mjs`**: validates against the published schema, plus the checks the registry does on publish.

```js
// Validates server.json against the official registry schema + checks mcpName/version consistency.
import { readFile } from "node:fs/promises";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const serverJson = JSON.parse(await readFile("server.json", "utf8"));
const pkg = JSON.parse(await readFile("package.json", "utf8"));
const schema = await (await fetch(serverJson.$schema)).json();

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
const ok = ajv.validate(schema, serverJson);
const problems = [
  ...(ajv.errors ?? []).map((e) => `${e.instancePath} ${e.message}`),
];
if (pkg.mcpName !== serverJson.name)
  problems.push(`package.json mcpName (${pkg.mcpName}) != server.json name`);
if (pkg.version !== serverJson.version)
  problems.push(`version mismatch ${pkg.version} vs ${serverJson.version}`);
if (serverJson.description.length > 100)
  problems.push("description > 100 chars");

if (!ok || problems.length) {
  console.error("server.json INVALID:\n- " + problems.join("\n- "));
  process.exit(1);
}
console.log(`server.json valid (${serverJson.name}@${serverJson.version})`);
```

### Test this step

```bash
pnpm run validate:server-json
```

```text
server.json valid (io.github.oscaroceguera/jsconf-mcp@0.2.0)
```

Change `"version"` in `server.json` to `0.2.1` and run it again. The script fails with a version-mismatch error. Revert the change.

**Real publish (not run):**

```bash
brew install mcp-publisher        # or download from github.com/modelcontextprotocol/registry releases
mcp-publisher login github
mcp-publisher publish
```

---

## Step 9 · CI with GitHub Actions + Inspector smoke test

**Why:** unit tests prove the logic. The smoke test proves that the **built production server** answers real HTTP through an independent client (the Inspector). Exit code 5 (`isError`) is an assertion you can rely on.

**File: `scripts/smoke-inspector.sh`**

```bash
#!/usr/bin/env bash
# Starts the production Next.js server and drives it with MCP Inspector CLI.
# Used by CI (.github/workflows/ci.yml) and runnable locally: bash scripts/smoke-inspector.sh
set -euo pipefail
PORT="${PORT:-3100}"
URL="http://localhost:${PORT}/api/mcp"
INSPECTOR="pnpm dlx @modelcontextprotocol/inspector@2.12.0 --cli ${URL}"

pnpm exec next start --port "$PORT" > /tmp/next-smoke.log 2>&1 &
NEXT_PID=$!
trap 'kill $NEXT_PID 2>/dev/null || true' EXIT

for i in $(seq 1 30); do curl -sf "http://localhost:${PORT}/" > /dev/null && break; sleep 1; done

fail() { echo "✗ $1"; exit 1; }

$INSPECTOR --method tools/list | grep -q '"get_talk"' || fail "tools/list missing get_talk"
echo "✓ tools/list has get_talk"

$INSPECTOR --method tools/call --tool-name get_talk --tool-arg year=2026 | grep -q 'Oscar Oceguera' || fail "get_talk(2026)"
echo "✓ get_talk(2026) ok"

# Inspector CLI exits with code 5 when the tool result has isError: true.
code=0; $INSPECTOR --method tools/call --tool-name get_talk --tool-arg year=1999 > /dev/null 2>&1 || code=$?
[ "$code" -eq 5 ] || fail "expected exit 5 for bad input, got $code"
echo "✓ bad input -> isError (exit 5)"
echo "smoke OK"
```

**File: `.github/workflows/ci.yml`**

```yaml
name: ci

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 12
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm run typecheck
      - run: pnpm test
      - run: pnpm run build
      - run: pnpm run build:bin
      - run: pnpm run validate:server-json
      - name: MCP Inspector CLI smoke test
        run: bash scripts/smoke-inspector.sh
```

### Test this step

Run the same pipeline locally:

```bash
pnpm install --frozen-lockfile && pnpm run typecheck && pnpm test && pnpm run build && pnpm run build:bin \
  && pnpm run validate:server-json && bash scripts/smoke-inspector.sh
```

Last lines:

```text
✓ tools/list has get_talk
✓ get_talk(2026) ok
✓ bad input -> isError (exit 5)
smoke OK
```

> **Not verified:** the workflow on GitHub itself (nothing was pushed). Every command in it was run locally, in this order.

---

## Troubleshooting

| Symptom                                                      | Cause                                                       | Fix                                                |
| ------------------------------------------------------------ | ----------------------------------------------------------- | -------------------------------------------------- |
| `-32602 ... missing ... _meta`                               | Raw 2026-07-28 request without the envelope                 | Add `params._meta` (Step 3), or use the SDK client |
| `406 Not Acceptable`                                         | Missing `accept` header                                     | Send `accept: application/json, text/event-stream` |
| Bin fails with `Cannot find module '../lib/mcp/register.ts'` | Compiled without `rewriteRelativeImportExtensions`          | Use `tsconfig.bin.json`                            |
| Registry rejects the publish                                 | `name` ≠ `mcpName`, or the npm version is not published yet | Publish to npm first; keep the versions in sync    |

## What you learned

- a stateless remote MCP server in a Next.js route, ready for Vercel
- recoverable tool errors versus protocol errors
- in-process route tests, a TS client, an npm stdio bin, registry metadata, and CI with a smoke test

Next: **[03 · Pro](03-pro-mcp.md)**: OAuth, scopes, security, observability, durable jobs and evals.
