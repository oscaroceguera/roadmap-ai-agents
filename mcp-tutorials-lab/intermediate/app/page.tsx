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
