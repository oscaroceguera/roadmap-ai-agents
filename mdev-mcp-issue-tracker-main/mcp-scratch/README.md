Mcp settings

```JSON
 "mcpServers": {
    "demo-server": {
      "command": "/Users/oscaroceguera/.nvm/versions/node/v24.20.0/bin/node",
      "args": [
        "/Users/oscaroceguera/Documents/Repos/examples/roadmap-ai-agents/mdev-mcp-server/mcp.js"
      ],
      "env": {
        "NODE_OPTIONS": "--no-deprecation"
      }
    },
    "weather-server": {
      "command": "/Users/oscaroceguera/.nvm/versions/node/v24.20.0/bin/node",
      "args": [
        "/Users/oscaroceguera/Documents/Repos/examples/roadmap-ai-agents/mdev-mcp-server/weather.js"
      ],
      "env": {
        "NODE_OPTIONS": "--no-deprecation"
      }
    },
    "schema-server": {
      "command": "/Users/oscaroceguera/.nvm/versions/node/v24.20.0/bin/node",
      "args": [
        "/Users/oscaroceguera/Documents/Repos/examples/roadmap-ai-agents/mdev-mcp-issue-tracker-main/mcp-scratch/main.js"
      ],
      "env": {
        "NODE_OPTIONS": "--no-deprecation"
      }
    },
    "code-style-server": {
      "command": "/Users/oscaroceguera/.nvm/versions/node/v24.20.0/bin/node",
      "args": [
        "/Users/oscaroceguera/Documents/Repos/examples/roadmap-ai-agents/mdev-mcp-issue-tracker-main/mcp-scratch/style-checker.js"
      ],
      "env": {
        "NODE_OPTIONS": "--no-deprecation"
      }
    }
  },
```
