# mdev-mcp-server

**Purpose:** Master.dev MCP course, first exercises: minimal MCP servers over stdio.

**What it does**
- `mcp.js`: server `add-server` with an `add` tool (two numbers).
- `weather.js`: `get_weather` tool (current weather for lat/long via Open-Meteo) and a resource template.

**Stack:** `@modelcontextprotocol/sdk`, `openmeteo`, `zod`, plain ESM JavaScript.

**Use:** register in an MCP client as a `command: node`, `args: [<abs path>/mcp.js]` stdio server (example config in `mdev-mcp-issue-tracker-main/mcp-scratch/README.md`).
