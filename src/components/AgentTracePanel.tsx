/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent Trace Panel
 * Shows, step by step, which Sanity Context MCP tools the Gemini agent called
 * (graph = live dataset via GROQ, docs = Knowledge Base), so a viewer can see
 * the agent actually reading real content rather than guessing from memory.
 */
import { Database, BookOpen, Bot, AlertTriangle } from 'lucide-react';
import type { ContextAgentResult } from '../types/widgets.ts';

export function AgentTracePanel({ agent }: { agent: ContextAgentResult | null | undefined }) {
  if (!agent) return null;

  if (!agent.enabled) {
    return (
      <div className="bg-slate-900/70 border border-amber-900/60 rounded-xl p-3.5 text-xs text-amber-200 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Sanity Context MCP agent not active</p>
          <p className="text-amber-300/80 mt-0.5">{agent.reason || 'Configure SANITY_ORG_ID / SANITY_CONTEXT_TOKEN to enable it.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 sm:p-5 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-1.5">
        <span className="font-semibold text-slate-200 flex items-center gap-1.5 text-xs">
          <Bot className="w-3.5 h-3.5 text-cyan-400" />
          Sanity Context Agent Trace
        </span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-cyan-300 border border-slate-800">
          {agent.model} · {agent.steps} step{agent.steps === 1 ? '' : 's'}
        </span>
      </div>

      {agent.error && (
        <p className="text-[11px] text-rose-300 bg-rose-950/40 border border-rose-900/50 rounded-lg p-2">{agent.error}</p>
      )}

      {agent.summary && <p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-line">{agent.summary}</p>}

      {agent.findings?.length > 0 && (
        <ul className="text-[11px] text-slate-300 list-disc list-inside space-y-0.5">
          {agent.findings.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      )}

      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
        {agent.trace.map((t, i) => (
          <div key={i} className="flex items-start gap-2 bg-slate-950/70 border border-slate-800 rounded-lg p-2 text-[10.5px]">
            {t.source === 'graph'
              ? <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              : <BookOpen className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-slate-200 truncate">{t.tool}</span>
                <span className={`shrink-0 ${t.ok ? 'text-slate-500' : 'text-rose-400'}`}>{t.ms}ms{!t.ok && ' · error'}</span>
              </div>
              <p className="text-slate-500 truncate">{JSON.stringify(t.args)}</p>
              <p className="text-slate-400 mt-0.5 line-clamp-2">{t.preview}</p>
            </div>
          </div>
        ))}
        {agent.trace.length === 0 && !agent.error && (
          <p className="text-[11px] text-slate-500">No tool calls were needed for this diff.</p>
        )}
      </div>
    </div>
  );
}
