/**
 * ChronoGraph context agent.
 *
 * Gemini decides which Sanity Context MCP tools to call (graph = GROQ over the
 * live dataset, docs = Knowledge Base of specs/changelogs/runbooks), reads what
 * comes back, and reports contradictions between sources side by side.
 */
import { GoogleGenAI } from '@google/genai';
import { getContextConfig, connectContext, toolResultText, type ContextKind } from '../sanity/contextMcpClient.ts';
import type { ContractDecision } from './decisionStore.ts';

const MAX_STEPS = 8;
const MAX_TOOL_CHARS = 12000;

export interface ToolTraceEntry {
  step: number;
  tool: string;
  source: ContextKind;
  args: unknown;
  ms: number;
  ok: boolean;
  preview: string;
}
export interface Claim { text: string; source: string }
export interface Contradiction {
  id: string;
  field: string;
  attribute: string;
  claimA: Claim;
  claimB: Claim;
  decision?: { chosen: 'A' | 'B'; reason?: string; decidedBy: string; decidedAt: string };
}
export interface ContextAgentResult {
  enabled: boolean;
  reason?: string;
  error?: string;
  model?: string;
  summary?: string;
  findings: string[];
  contradictions: Contradiction[];
  trace: ToolTraceEntry[];
  endpoints?: Record<ContextKind, string>;
  steps: number;
}

// ---------- pure helpers (unit tested) ----------

export function contradictionId(serviceId: string, field: string, attribute: string): string {
  return `${serviceId}.${field}.${attribute}`.toLowerCase().replace(/\s+/g, '-');
}

/** Pulls the JSON report out of the model's final message. */
export function parseAgentReport(text: string, serviceId: string): {
  summary: string; findings: string[]; contradictions: Contradiction[];
} {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  let raw = fenced?.[1];
  if (!raw) {
    const start = text.lastIndexOf('{"');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end > start) raw = text.slice(start, end + 1);
  }
  const summary = (fenced ? text.replace(fenced[0], '') : raw ? text.replace(raw, '') : text).trim();
  let data: any = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }

  const contradictions: Contradiction[] = (Array.isArray(data.contradictions) ? data.contradictions : [])
    .filter((c: any) => c?.field && c?.claimA?.text && c?.claimB?.text)
    .map((c: any) => {
      const attribute = String(c.attribute || 'other');
      return {
        id: contradictionId(serviceId, String(c.field), attribute),
        field: String(c.field),
        attribute,
        claimA: { text: String(c.claimA.text), source: String(c.claimA.source || 'unknown') },
        claimB: { text: String(c.claimB.text), source: String(c.claimB.source || 'unknown') },
      };
    });
  return {
    summary: String(data.summary || summary || '').trim(),
    findings: Array.isArray(data.findings) ? data.findings.map(String) : [],
    contradictions,
  };
}

export function applyDecisions(list: Contradiction[], decisions: ContractDecision[]): Contradiction[] {
  const byId = new Map(decisions.map((d) => [d.contradictionId, d]));
  return list.map((c) => {
    const d = byId.get(c.id);
    return d ? { ...c, decision: { chosen: d.chosen, reason: d.reason, decidedBy: d.decidedBy, decidedAt: d.decidedAt } } : c;
  });
}

const prefixed = (kind: ContextKind, name: string) => `${kind}__${name}`;
export function splitToolName(full: string): { kind: ContextKind; name: string } {
  const i = full.indexOf('__');
  return { kind: full.slice(0, i) as ContextKind, name: full.slice(i + 2) };
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}\n…[truncated ${s.length - n} chars]` : s);

// ---------- agent ----------

export async function runContextAgent(opts: {
  diff: string;
  targetServiceId: string;
  breakages: unknown[];
  decisions: ContractDecision[];
  traceId?: string;
}): Promise<ContextAgentResult> {
  const cfg = getContextConfig();
  const empty: ContextAgentResult = { enabled: false, findings: [], contradictions: [], trace: [], steps: 0 };

  if (!cfg.configured) {
    return { ...empty, reason: `Sanity Context MCP not configured (missing: ${cfg.missing.join(', ')}). Using built-in demo graph.` };
  }
  if (!process.env.GEMINI_API_KEY) {
    return { ...empty, reason: 'GEMINI_API_KEY missing, agent loop cannot run.' };
  }

  const clients: Partial<Record<ContextKind, Awaited<ReturnType<typeof connectContext>>>> = {};
  const trace: ToolTraceEntry[] = [];
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  try {
    const activeKinds = (['graph', 'docs'] as ContextKind[]).filter((k) => cfg.enabled[k]);
    const declarations: any[] = [];
    const connectErrors: string[] = [];
    for (const kind of activeKinds) {
      try {
        const c = await connectContext(cfg.urls[kind], cfg.token);
        clients[kind] = c;
        const { tools } = await c.listTools();
        for (const t of tools) {
          const schema: any = { ...(t.inputSchema as any) };
          delete schema.$schema;
          declarations.push({
            name: prefixed(kind, t.name),
            description: `[${kind === 'graph' ? 'Sanity dataset (GROQ)' : 'Knowledge Base'}] ${t.description || t.name}`,
            parametersJsonSchema: schema,
          });
        }
      } catch (e: any) {
        // Endpoint not created yet (e.g. the dataset endpoint) — skip it and
        // keep going with whichever endpoints did connect (docs-only mode).
        connectErrors.push(`${kind}: ${e?.message || e}`);
      }
    }
    if (declarations.length === 0) {
      return { ...empty, enabled: true, error: `No Context MCP endpoint connected. ${connectErrors.join(' | ')}`, endpoints: cfg.urls };
    }

    const decided = opts.decisions.length
      ? opts.decisions.map((d) => `- ${d.field}/${d.attribute}: human ruled claim ${d.chosen} (${d.chosen === 'A' ? d.claimA : d.claimB}) [${d.sourceA} vs ${d.sourceB}]`).join('\n')
      : '(none yet)';

    const hasGraph = activeKinds.includes('graph') && !!clients.graph;
    const hasDocs = activeKinds.includes('docs') && !!clients.docs;
    const systemInstruction = `You are ChronoGraph, a breaking-change sentinel. You have NO built-in knowledge of this company's services.
Everything must come from tools:
${hasGraph ? '- graph__* tools query the live Sanity dataset with GROQ: services, apiEndpoint contracts (fieldContracts, consumers).\n' : ''}${hasDocs ? '- docs__* tools read a Knowledge Base of OpenAPI specs, consumer changelogs and runbooks (call docs__initial_context first to see the outline, then docs__knowledge_base_read with paths copied verbatim; read several relevant paths in one call). docs__knowledge_base_search uses EXACT keyword matching, not semantic search — a camelCase field name like "taxId" will often NOT match because the indexer tokenizes it as separate words. If a search for the exact field name returns "No entries matched", immediately retry with the words split and lowercased (e.g. "taxId" -> "tax id", "billingCycleAnchor" -> "billing cycle anchor"), then with a broader topic word (e.g. "billing", "nullable", "required"), before giving up on that field.\n' : ''}
${hasGraph
  ? 'Procedure: 1) query the graph for the target service, its endpoints and consumers of every field the diff touches; 2) read the KB entries about those fields and consumers; 3) compare. When the dataset and a document, or two documents, disagree about a field (nullability, type, unit, required, deprecation window), do NOT pick a side: report both claims with their sources.'
  : 'The dataset endpoint is not connected in this run; the deterministic diff findings already supplied are your only structured-data source. Use the docs tools to read the OpenAPI spec, consumer changelogs and runbooks about the fields in the diff. When two documents disagree about a field (nullability, type, unit, required, deprecation window), do NOT pick a side: report both claims with their sources.'}

Rulings already made by humans (treat as settled, do not re-raise):
${decided}
Finish with a short plain-text impact summary, then ONE fenced json block:
\`\`\`json
{"summary":"...","findings":["..."],"contradictions":[{"field":"fieldName","attribute":"nullability|type|unit|required|deprecation|other","claimA":{"text":"...","source":"doc path or dataset _id"},"claimB":{"text":"...","source":"..."}}]}
\`\`\`
Use an empty contradictions array if none. Never invent sources.`;

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const contents: any[] = [{
      role: 'user',
      parts: [{ text: `Target service: ${opts.targetServiceId}\nDeterministic diff findings: ${JSON.stringify(opts.breakages).slice(0, 4000)}\n\nDiff:\n${opts.diff}` }],
    }];

    let finalText = '';
    let steps = 0;
    for (; steps < MAX_STEPS; steps++) {
      const res = await ai.models.generateContent({
        model, contents,
        config: { systemInstruction, temperature: 0.1, tools: [{ functionDeclarations: declarations }] },
      });
      const modelContent = res.candidates?.[0]?.content;
      if (modelContent) contents.push(modelContent);
      const calls = res.functionCalls ?? [];
      if (!calls.length) { finalText = res.text ?? ''; break; }

      const responseParts: any[] = [];
      for (const call of calls) {
        const { kind, name } = splitToolName(call.name || '');
        const t0 = Date.now();
        let out = ''; let ok = true;
        try {
          const client = clients[kind];
          if (!client) throw new Error(`unknown tool source '${kind}'`);
          const r: any = await client.callTool({ name, arguments: (call.args as any) || {} });
          out = toolResultText(r); ok = !r?.isError;
        } catch (e: any) { out = `Tool error: ${e?.message || e}`; ok = false; }
        trace.push({ step: steps + 1, tool: call.name || '', source: kind, args: call.args, ms: Date.now() - t0, ok, preview: clip(out, 280) });
        responseParts.push({ functionResponse: { name: call.name, response: { output: clip(out, MAX_TOOL_CHARS) } } });
      }
      contents.push({ role: 'user', parts: responseParts });
    }

    if (!finalText) { // step budget exhausted: force a final answer without tools
      contents.push({ role: 'user', parts: [{ text: 'Stop calling tools. Give your final summary and the json block now.' }] });
      const res = await ai.models.generateContent({ model, contents, config: { systemInstruction, temperature: 0.1 } });
      finalText = res.text ?? '';
    }

    const report = parseAgentReport(finalText, opts.targetServiceId);
    return {
      enabled: true, model, trace, steps,
      summary: report.summary, findings: report.findings,
      contradictions: applyDecisions(report.contradictions, opts.decisions),
      endpoints: cfg.urls,
    };
  } catch (e: any) {
    return { ...empty, enabled: true, error: `Context agent failed: ${e?.message || e}`, trace, endpoints: cfg.urls, model };
  } finally {
    await Promise.allSettled(Object.values(clients).map((c) => c?.close()));
  }
}
