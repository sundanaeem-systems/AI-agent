/**
 * Sanity Context MCP client (hosted, read-only).
 * https://www.sanity.io/docs/ai/sanity-context-mcp
 *
 * Two endpoints are used:
 *  - graph: dataset source  -> GROQ mode tools (groq_query, schema_explorer, ...)
 *  - docs : Knowledge Base  -> initial_context + knowledge_base_read
 * (An endpoint with a dataset source ignores KB sources, hence two endpoints.)
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export type ContextKind = 'graph' | 'docs';

export interface ContextConfig {
  configured: boolean;
  missing: string[];
  token: string;
  urls: Record<ContextKind, string>;
  names: Record<ContextKind, string>;
  /** Which endpoints are actually usable. Set SANITY_MCP_GRAPH_DISABLED=true
   *  when only a Knowledge Base ("docs") endpoint could be created — the
   *  agent then runs docs-only instead of failing. */
  enabled: Record<ContextKind, boolean>;
}

// Read env lazily so dotenv has always run before we look.
export function getContextConfig(): ContextConfig {
  const org = process.env.SANITY_ORG_ID || '';
  const token = process.env.SANITY_CONTEXT_TOKEN || '';
  const names = {
    graph: process.env.SANITY_MCP_GRAPH_NAME || 'chronograph-graph',
    docs: process.env.SANITY_MCP_DOCS_NAME || 'chronograph-docs',
  };
  const build = (n: string) => `https://api.sanity.io/v1/context/organizations/${org}/mcp/${n}`;
  const urls = {
    graph: process.env.SANITY_MCP_GRAPH_URL || build(names.graph),
    docs: process.env.SANITY_MCP_DOCS_URL || build(names.docs),
  };
  const enabled = {
    graph: process.env.SANITY_MCP_GRAPH_DISABLED !== 'true',
    docs: process.env.SANITY_MCP_DOCS_DISABLED !== 'true',
  };
  const missing: string[] = [];
  if (!org && !(process.env.SANITY_MCP_GRAPH_URL && process.env.SANITY_MCP_DOCS_URL)) missing.push('SANITY_ORG_ID');
  if (!token) missing.push('SANITY_CONTEXT_TOKEN');
  if (!enabled.graph && !enabled.docs) missing.push('at least one of SANITY_MCP_GRAPH_DISABLED/SANITY_MCP_DOCS_DISABLED must allow an endpoint');
  return { configured: missing.length === 0, missing, token, urls, names, enabled };
}

export async function connectContext(url: string, token: string): Promise<Client> {
  const client = new Client({ name: 'chronograph-sentinel', version: '3.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
  });
  await client.connect(transport);
  return client;
}

/** Flattens an MCP tool result into text. */
export function toolResultText(result: any): string {
  const parts = Array.isArray(result?.content) ? result.content : [];
  const text = parts.map((p: any) => (p?.type === 'text' ? p.text : JSON.stringify(p))).join('\n');
  return text || JSON.stringify(result ?? {});
}
