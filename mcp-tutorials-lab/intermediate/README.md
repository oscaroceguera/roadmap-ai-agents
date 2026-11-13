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

`https://mcp-poc-intermediate.vercel.app/api/mcp`

## Tools

| Tool           | What it does                |
| -------------- | --------------------------- |
| `get_talk`     | Talks of one year           |
| `search_talks` | Keyword search with ratings |
