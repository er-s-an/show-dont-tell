/** Host-side card embedding: AppBridge over postMessage to a sandboxed
 * srcdoc iframe. Our own cards only — same-window handshake, no proxy origin. */

import {
  AppBridge,
  PostMessageTransport,
  getToolUiResourceUri,
} from "@modelcontextprotocol/ext-apps/app-bridge";
import type { CallToolResult, Tool } from "@modelcontextprotocol/client";
import type { McpConnection } from "./mcp.js";

const HOST_INFO = { name: "show-dont-tell-simulator", version: "1.0.0" };

export interface EmbeddedCard {
  iframe: HTMLIFrameElement;
  bridge: AppBridge;
}

export function toolHasCard(tool: Tool): boolean {
  return !!getToolUiResourceUri(tool);
}

export async function embedCard(opts: {
  container: HTMLElement;
  mcp: McpConnection;
  tool: Tool;
  input: Record<string, unknown>;
  result: CallToolResult;
}): Promise<EmbeddedCard | null> {
  const { container, mcp, tool, input, result } = opts;
  const uri = getToolUiResourceUri(tool);
  if (!uri) return null;

  const html = await mcp.readCardHtml(uri);

  const iframe = document.createElement("iframe");
  iframe.className = "card-frame";
  // Start below content height so the first app size report can grow to the
  // intrinsic document size instead of inheriting a browser iframe minimum.
  iframe.style.height = "1px";
  iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms");
  iframe.setAttribute("title", `${tool.name} card`);
  container.appendChild(iframe);

  const caps = mcp.client.getServerCapabilities();
  const bridge = new AppBridge(
    mcp.client,
    HOST_INFO,
    {
      openLinks: {},
      serverTools: caps?.tools,
      serverResources: caps?.resources,
      updateModelContext: { text: {} },
      message: { text: {} },
    },
    {
      hostContext: {
        theme: "light",
        platform: "web",
        containerDimensions: { maxHeight: 2400 },
        displayMode: "inline",
        availableDisplayModes: ["inline"],
      },
    },
  );

  bridge.onopenlink = async (params) => {
    window.open(params.url, "_blank", "noopener,noreferrer");
    return {};
  };
  bridge.onloggingmessage = (params) => console.debug("[card]", params);
  bridge.onmessage = async () => ({});
  bridge.onupdatemodelcontext = async () => ({});
  bridge.onsizechange = async ({ height }) => {
    if (height !== undefined) {
      // `body.scrollHeight` is at least the current viewport height, so using
      // it together with a +N fudge factor creates a positive feedback loop.
      // Our same-origin srcdoc exposes its real app root; measure that box and
      // use the reported value only as a pre-initialization fallback.
      const appRoot = iframe.contentDocument?.body.firstElementChild;
      const intrinsic = appRoot?.getBoundingClientRect().height;
      const next = Math.min(Math.ceil(intrinsic && intrinsic > 0 ? intrinsic : height), 2400);
      const current = Number.parseFloat(iframe.style.height) || 0;
      if (Math.abs(current - next) > 1) iframe.style.height = `${next}px`;
    }
    return {};
  };
  bridge.onrequestdisplaymode = async () => ({ mode: "inline" });

  const initialized = new Promise<void>((resolve) => {
    const prev = bridge.oninitialized;
    bridge.oninitialized = (...args: unknown[]) => {
      resolve();
      bridge.oninitialized = prev;
      // @ts-expect-error — chaining the previous handler if present
      bridge.oninitialized?.(...args);
    };
  });

  // Attach the transport BEFORE loading the document, so the app's
  // ui/initialize request always lands on a listening host.
  await bridge.connect(
    new PostMessageTransport(iframe.contentWindow!, iframe.contentWindow!),
  );
  iframe.srcdoc = html;

  await Promise.race([
    initialized,
    new Promise((_, reject) => setTimeout(() => reject(new Error("card init timeout")), 8000)),
  ]);

  bridge.sendToolInput({ arguments: input });
  bridge.sendToolResult(result);

  return { iframe, bridge };
}
