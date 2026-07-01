# Render MCP Server

Deploy to [Render.com](https://render.com) directly through AI assistants.

This MCP (Model Context Protocol) server allows AI assistants like Claude to interact with the Render API, enabling deployment and management of services on Render.com.

## Features

This server covers everything Render's official MCP server does **plus** mutating
operations their server intentionally omits (triggering deploys, deleting resources,
managing custom domains, restarting, and cancelling deploys).

**Services**
- List all services and get details of a specific service
- Create services: generic `create_service` plus typed `create_web_service`,
  `create_static_site`, and `create_cron_job`
- Deploy, restart, and delete services
- Manage environment variables and custom domains

**Deploys**
- Get deployment history, get a single deploy, and cancel an in-progress deploy

**Workspaces**
- List workspaces, get workspace details, and select a default workspace so
  create/logs/metrics tools don't need an `ownerId` each call

**Observability**
- List and filter logs (`list_logs`) and enumerate log label values
- Fetch performance metrics (`get_metrics`): CPU, memory, HTTP requests/latency,
  bandwidth, instance count, active connections

**Datastores**
- Postgres: list, get, create, and run **read-only** SQL queries (`query_render_postgres`)
- Key Value (Redis): list, get, and create instances

> **Note on `query_render_postgres`:** this tool connects to your database using the
> `pg` driver and enforces read-only access (single statement, `SELECT`/`WITH`/
> `EXPLAIN`/`SHOW` only, run inside a `READ ONLY` transaction). Run `npm install`
> after installing the package to ensure the `pg` dependency is present.

## Installation

```bash
npm install -g @niyogi/render-mcp
```

## Configuration

1. Get your Render API key from [Render Dashboard](https://dashboard.render.com/account/api-keys)
2. Configure the MCP server with your key:

```bash
node bin/render-mcp.js configure --api-key=YOUR_API_KEY
```

Alternatively, you can run `node bin/render-mcp.js configure` without the `--api-key` flag to be prompted for your API key.

## Usage

### Starting the Server

```bash
node bin/render-mcp.js start
```

### Checking Configuration

```bash
node bin/render-mcp.js config
```

### Running Diagnostics

```bash
node bin/render-mcp.js doctor
```

Note: If you've installed the package globally, you can also use the shorter commands:
```bash
render-mcp start
render-mcp config
render-mcp doctor
```

## Using with Different AI Assistants

### Using with Claude Code

The quickest way is the `claude mcp add` CLI, which registers the server via `npx`
(no global install needed):

```bash
claude mcp add render -e RENDER_API_KEY=YOUR_API_KEY -- npx -y @niyogi/render-mcp start
```

By default this adds the server to the current project. Use a scope flag to change that:

- `-s user` — available across all your projects
- `-s project` — shared with your team via a checked-in `.mcp.json`
- `-s local` (default) — just this project, only for you

Alternatively, add it manually to your MCP config (`.mcp.json` in the project root,
or `~/.claude.json` for user scope):

```json
{
  "mcpServers": {
    "render": {
      "command": "npx",
      "args": ["-y", "@niyogi/render-mcp", "start"],
      "env": {
        "RENDER_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

Instead of passing the key via `env`, you can store it once with
`npx @niyogi/render-mcp configure` (saved to `~/.render-mcp/config.json`) and omit
the `env` block.

Then verify the connection inside Claude Code with the `/mcp` command — `render`
should appear as connected and its tools listed.

### Using with Cline

1. Add the following to your Cline MCP settings file:
   ```json
   {
     "mcpServers": {
       "render": {
         "command": "node",
         "args": ["/path/to/render-mcp/bin/render-mcp.js", "start"],
         "env": {
           "RENDER_API_KEY": "your-render-api-key"
         },
         "disabled": false,
         "autoApprove": []
       }
     }
   }
   ```

2. Restart Cline for the changes to take effect
3. You can now interact with Render through Claude:
   ```
   Claude, please deploy my web service to Render
   ```

### Using with Windsurf/Cursor

1. Install the render-mcp package:
   ```bash
   npm install -g @niyogi/render-mcp
   ```

2. Configure your API key:
   ```bash
   node bin/render-mcp.js configure --api-key=YOUR_API_KEY
   ```

3. Start the MCP server in a separate terminal:
   ```bash
   node bin/render-mcp.js start
   ```

4. In Windsurf/Cursor settings, add the Render MCP server:
   - Server Name: render
   - Server Type: stdio
   - Command: node
   - Arguments: ["/path/to/render-mcp/bin/render-mcp.js", "start"]

5. You can now use the Render commands in your AI assistant

### Using with Claude API Integrations

For custom applications using Claude's API directly:

1. Ensure the render-mcp server is running:
   ```bash
   node bin/render-mcp.js start
   ```

2. In your application, when sending messages to Claude via the API, include the MCP server connections in your request:

   ```json
   {
     "mcpConnections": [
       {
         "name": "render",
         "transport": {
           "type": "stdio",
           "command": "node",
           "args": ["/path/to/render-mcp/bin/render-mcp.js", "start"]
         }
       }
     ]
   }
   ```

3. Claude will now be able to interact with your Render MCP server

## Example Prompts

Here are some example prompts you can use with Claude once the MCP server is connected:

- "List all my services on Render"
- "Deploy my web service with ID srv-123456"
- "Create a new static site on Render from my GitHub repo"
- "Show me the deployment history for my service"
- "Add an environment variable to my service"
- "Add a custom domain to my service"
- "List my Render workspaces and select the team one"
- "Show me the error logs for srv-123456 from the last hour"
- "What's the CPU and memory usage for srv-123456?"
- "Query my Render Postgres: SELECT count(*) FROM users"
- "Restart my service srv-123456"
- "Create a Postgres database and a Redis instance for my app"

## Development

### Building from Source

```bash
git clone https://github.com/niyogi/render-mcp.git
cd render-mcp
npm install
npm run build
```

### Running Tests

```bash
npm test
```

## License

MIT
