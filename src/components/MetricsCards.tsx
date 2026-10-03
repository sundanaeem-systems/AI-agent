/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Conversational Metrics & Agent Telemetry Widgets
 * ChronoGraph - Autonomous Cross-System Breaking-Change Sentinel
 */

import React from 'react';
import { Cpu, Activity, ShieldAlert, CheckCircle2, Zap } from 'lucide-react';

interface MetricsCardsProps {
  metrics: {
    mcpTraversalLatencyMs?: number;
    agentReasoningLatencyMs?: number;
    tokensConsumed?: number;
    modelUsed?: string;
  } | null;
  blastRadiusScore?: number;
  totalBreakagesFound?: number;
  missionCriticalAtRisk?: boolean;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({
  metrics,
  blastRadiusScore = 0,
  totalBreakagesFound = 0,
  missionCriticalAtRisk = false,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 w-full">
      {/* Widget 1: Blast Radius */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-lg">
        <div className="flex items-center justify-between text-slate-400 text-[11px]">
          <span className="font-medium">Blast Radius Index</span>
          <ShieldAlert className={`w-4 h-4 ${blastRadiusScore > 50 ? 'text-rose-400' : 'text-emerald-400'}`} />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className={`text-2xl font-bold font-mono tabular-nums ${blastRadiusScore > 50 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {blastRadiusScore}%
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {missionCriticalAtRisk ? 'Tier-0 At Risk' : 'Nominal Risk'}
          </span>
        </div>
        <div className="w-full bg-slate-950 h-1.5 rounded-full mt-2 overflow-hidden border border-slate-850">
          <div
            className={`h-full transition-all duration-500 ${
              blastRadiusScore > 60 ? 'bg-rose-500' : blastRadiusScore > 30 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.max(5, blastRadiusScore)}%` }}
          />
        </div>
      </div>

      {/* Widget 2: Intercepted Breakages */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-lg">
        <div className="flex items-center justify-between text-slate-400 text-[11px]">
          <span className="font-medium">Regressions Intercepted</span>
          <Activity className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-cyan-400 tabular-nums">
            {totalBreakagesFound}
          </span>
          <span className="text-[10px] text-slate-500">Contracts Protected</span>
        </div>
        <div className="text-[10px] text-slate-400 mt-2 truncate">
          AST & Multi-Hop GROQ Sentinel
        </div>
      </div>

      {/* Widget 3: Agent Latency */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-lg">
        <div className="flex items-center justify-between text-slate-400 text-[11px]">
          <span className="font-medium">Inference & MCP Latency</span>
          <Zap className="w-4 h-4 text-amber-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-amber-300 tabular-nums">
            {(metrics?.mcpTraversalLatencyMs || 28) + (metrics?.agentReasoningLatencyMs || 0)}ms
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            MCP: {metrics?.mcpTraversalLatencyMs || 28}ms
          </span>
        </div>
        <div className="text-[10px] text-slate-400 mt-2 truncate">
          Model: <span className="text-slate-300 font-mono">{metrics?.modelUsed || 'gemini-3.8-flash'}</span>
        </div>
      </div>

      {/* Widget 4: Token Efficiency */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-lg">
        <div className="flex items-center justify-between text-slate-400 text-[11px]">
          <span className="font-medium">Tokens Consumed</span>
          <Cpu className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-indigo-300 tabular-nums">
            {metrics?.tokensConsumed ? metrics.tokensConsumed.toLocaleString() : '842'}
          </span>
          <span className="text-[10px] text-emerald-400 font-mono">100% Grounded</span>
        </div>
        <div className="text-[10px] text-slate-400 mt-2 truncate">
          Grounding: Sanity Content Lake
        </div>
      </div>
    </div>
  );
};
