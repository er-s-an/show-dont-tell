/** Browser-side MCP client for the simulator. Talks Streamable HTTP directly
 * to the show-dont-tell server (CORS-enabled, stateless). */

import {
  Client,
  StreamableHTTPClientTransport,
  type CallToolResult,
  type Resource,
  type Tool,
} from "@modelcontextprotocol/client";

const IMPLEMENTATION = { name: "show-dont-tell-simulator", version: "1.0.0" };

export interface McpConnection {
  client: Client;
  tools: Map<string, Tool>;
  resources: Map<string, Resource>;
  call: (name: string, args: Record<string, unknown>) => Promise<CallToolResult>;
  readCardHtml: (uri: string) => Promise<string>;
}

export async function connectMcp(url: string): Promise<McpConnection> {
  const client = new Client(IMPLEMENTATION);
  await client.connect(new StreamableHTTPClientTransport(new URL(url)));

  // Wire-log hook: every tools/call — whether sent by the simulator's chat
  // controller (client.callTool) or by a card through the AppBridge (which
  // calls client.request directly) — is announced on the window so the
  // demo/verification overlay can show the real MCP traffic.
  const rawRequest = client.request.bind(client);
  client.request = ((req: { method?: string; params?: { name?: string } }, ...rest: unknown[]) => {
    if (req?.method === "tools/call") {
      window.dispatchEvent(new CustomEvent("sdt:mcp-call", { detail: req?.params?.name ?? "?" }));
    }
    return rawRequest(req as never, ...(rest as []));
  }) as typeof client.request;

  const toolsList = await client.listTools();
  const tools = new Map(toolsList.tools.map((t) => [t.name, t]));
  const resourcesList = await client.listResources();
  const resources = new Map(resourcesList.resources.map((r) => [r.uri, r]));

  return {
    client,
    tools,
    resources,
    call: (name, args) =>
      client.callTool({ name, arguments: args }) as Promise<CallToolResult>,
    readCardHtml: async (uri) => {
      const res = await client.readResource({ uri });
      const content = res.contents[0] as { text?: string; blob?: string };
      return content.text ?? atob(content.blob ?? "");
    },
  };
}
