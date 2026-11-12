# mdev-mcp-issue-tracker-main

**Purpose:** Course project: a GitHub-style issue tracker plus MCP servers that expose it to AI clients.

**Parts**
- `backend/`: Fastify + SQLite + BetterAuth (TypeScript, Vitest). Auth, issues CRUD, tags, filtering, assignees. Migrations and seed scripts.
- `frontend/`: React + Vite + Tailwind (shadcn config) UI at :5173; API at :3000.
- `mcp/` (finished): `main.js` registers `api-based-tools.js` (about 13 tools wrapping the REST API) and a `database-schema` resource (`schema://database`, reads SQLite schema).
- `mcp-scratch/` (course workspace): `jobs-based-tools.js`, `streamable.js`, `style-checker.js` (an MCP prompt for code style, with `style-guide.md`), and the MCP client config example.
- Docs: `API.md`, `TESTING.md`, `TASKS.md`, `INSTRUCTIONS.md`.

**Run:** configure `.env` from `.env.template` in backend and frontend, `npm run migrate` (and `npm run seed`) in backend, then `npm run dev` from the root.
