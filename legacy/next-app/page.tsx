/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Next.js App Router Page: ChronoGraph Sentinel Developer Dashboard
 * ChronoGraph - The Autonomous Cross-System Breaking-Change Sentinel
 * 
 * Clean, dark-mode Tailwind CSS developer dashboard featuring the system dependency graph viewer,
 * live diff analyzer input, conversational metrics, and real-time agent logs.
 */

'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Cpu,
  GitBranch,
  Terminal,
  Activity,
  Download,
  Key,
  Users,
  AlertTriangle,
  Play,
  RotateCw,
  Copy,
  Check,
  Layers,
  FileCode,
  Search,
} from 'lucide-react';
import { type UserRole, SYSTEM_USERS, ROLE_PERMISSIONS } from '@/lib/rbac/permissions.ts';

// Preloaded industry-standard test scenarios
const PRESET_SCENARIOS = [
  {
    id: 'stripe_payment_removal',
    name: 'Stripe Webhook Contract: Field Removal',
    targetService: 'srv_billing_core',
    description: 'Removes paymentMethodId from customer billing response, breaking Order Orchestrator & Mobile BFF.',
    diff: `diff --git a/services/billing/contracts/customer.ts b/services/billing/contracts/customer.ts
index 8f2a1b9..4c7e3d1 100644
--- a/services/billing/contracts/customer.ts
+++ b/services/billing/contracts/customer.ts
@@ -12,7 +12,6 @@ export interface CustomerBillingProfile {
   customerId: string;
-  paymentMethodId: string; // BREAKING: Dropping legacy token
+  newPaymentVaultRef: { vaultId: string; provider: 'stripe' };
   subscriptionStatus: 'active' | 'past_due' | 'canceled';
   currency: string;
   taxId?: string;`,
  },
  {
    id: 'tax_strict_nullability',
    name: 'Tax ID: Optional to Mandatory Contraction',
    targetService: 'srv_billing_core',
    description: 'Changes taxId from optional string to required non-null string, causing validation failure for B2C checkouts.',
    diff: `diff --git a/schemas/invoicing.schema.json b/schemas/invoicing.schema.json
--- a/schemas/invoicing.schema.json
+++ b/schemas/invoicing.schema.json
@@ -8,3 +8,3 @@
-  "taxId": { "type": ["string", "null"], "required": false },
+  "taxId": { "type": "string", "required": true, "minLength": 5 },
   "billingCycleAnchor": { "type": "integer" }`,
  },
  {
    id: 'customer_type_mutation',
    name: 'Customer ID: Primitive Type Mutation',
    targetService: 'srv_billing_core',
    description: 'Mutates customerId from string (UUID) to number (BigInt), breaking all downstream GraphQL and Kafka schemas.',
    diff: `diff --git a/services/billing/models.ts b/services/billing/models.ts
--- a/services/billing/models.ts
+++ b/services/billing/models.ts
@@ -4,3 +4,3 @@ export interface BillingAccount {
-  customerId: string;
+  customerId: number; // Mutated to internal integer serial
   currency: string;`,
  },
];

export default function ChronoGraphDashboard() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [currentScenario, setCurrentScenario] = useState(PRESET_SCENARIOS[0]);
  const [diffInput, setDiffInput] = useState(PRESET_SCENARIOS[0].diff);
  const [targetService, setTargetService] = useState('srv_billing_core');
  const [traversalDepth, setTraversalDepth] = useState(3);

  // Graph state
  const [graphData, setGraphData] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [loadingGraph, setLoadingGraph] = useState(false);

  // Analysis state
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [copiedPatch, setCopiedPatch] = useState(false);

  // Observability & metrics
  const [logs, setLogs] = useState<any[]>([]);
  const [logFilter, setLogFilter] = useState('ALL');
  const [logSearch, setLogSearch] = useState('');

  // Fetch MCP Context Graph
  const fetchMcpGraph = async (svcId = targetService, depth = traversalDepth) => {
    setLoadingGraph(true);
    try {
      const res = await fetch('/api/mcp/context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sentinel-role': selectedRole,
        },
        body: JSON.stringify({ serviceId: svcId, depth }),
      });
      const data = await res.json();
      if (data.result?.graph) {
        setGraphData(data.result);
        if (!selectedNode && data.result.graph.nodes?.length > 0) {
          setSelectedNode(data.result.graph.nodes[0]);
        }
      }
    } catch (e) {
      console.error('Failed to load MCP context:', e);
    } finally {
      setLoadingGraph(false);
    }
  };

  // Run AI Reasoning Sentinel
  const runSentinelAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/agent/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sentinel-role': selectedRole,
        },
        body: JSON.stringify({
          diff: diffInput,
          targetServiceId: targetService,
        }),
      });
      const data = await res.json();
      if (data.result) {
        setAnalysisResult(data.result);
      }
      fetchLogs();
    } catch (e) {
      console.error('Sentinel analysis error:', e);
    } finally {
      setAnalyzing(false);
    }
  };

  // Fetch Logs
  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/agent/logs');
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
      }
    } catch (e) {
      console.error('Failed to fetch logs:', e);
    }
  };

  useEffect(() => {
    fetchMcpGraph(targetService, traversalDepth);
    fetchLogs();
  }, [targetService, traversalDepth, selectedRole]);

  const handleScenarioChange = (scenario: typeof PRESET_SCENARIOS[0]) => {
    setCurrentScenario(scenario);
    setDiffInput(scenario.diff);
    setTargetService(scenario.targetService);
  };

  const handleCopyPatch = () => {
    if (analysisResult?.automatedMigrationPatch?.patchCode) {
      navigator.clipboard.writeText(analysisResult.automatedMigrationPatch.patchCode);
      setCopiedPatch(true);
      setTimeout(() => setCopiedPatch(false), 2000);
    }
  };

  const currentUser = SYSTEM_USERS[selectedRole];
  const canAnalyze = ROLE_PERMISSIONS[selectedRole].includes('agent:analyze');
  const canApplyPatch = ROLE_PERMISSIONS[selectedRole].includes('patch:apply');

  const filteredLogs = logs.filter((l) => {
    if (logFilter !== 'ALL' && l.level !== logFilter) return false;
    if (logSearch && !l.message?.toLowerCase().includes(logSearch.toLowerCase()) && !l.event?.toLowerCase().includes(logSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-900">
      {/* Top Sentinel Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/30">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-base text-slate-100">ChronoGraph</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                Sentinel v2.4
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800">
                Sanity MCP
              </span>
            </div>
            <p className="text-xs text-slate-400">Autonomous Cross-System Breaking-Change Sentinel</p>
          </div>
        </div>

        {/* Center: Live Stats */}
        <div className="hidden md:flex items-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Sanity Content Lake: <strong className="text-emerald-400 font-mono">Connected</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>MCP Depth: <strong className="text-slate-200 font-mono">{traversalDepth} Hops</strong></span>
          </div>
        </div>

        {/* Right: RBAC Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-900 rounded-lg p-1 border border-slate-800">
            <span className="text-xs text-slate-400 px-2 flex items-center gap-1">
              <Key className="w-3.5 h-3.5 text-cyan-400" /> Role:
            </span>
            {(['admin', 'developer', 'viewer'] as UserRole[]).map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRole(r)}
                className={`text-xs px-2.5 py-1 rounded capitalize font-medium transition-all ${
                  selectedRole === r
                    ? r === 'admin'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : r === 'developer'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 max-w-[1700px] w-full mx-auto">
        {/* Left Column: System Dependency Graph & Node Inspector (5 cols) */}
        <section className="xl:col-span-5 flex flex-col gap-6">
          {/* Graph Container */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col flex-1">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-cyan-400" />
                <h2 className="font-semibold text-sm text-slate-200">System Dependency Graph (Multi-Hop)</h2>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Depth:</span>
                {[1, 2, 3, 4].map((d) => (
                  <button
                    key={d}
                    onClick={() => setTraversalDepth(d)}
                    className={`w-6 h-6 rounded flex items-center justify-center font-mono text-xs border ${
                      traversalDepth === d
                        ? 'bg-cyan-600 text-white border-cyan-400'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {d}
                  </button>
                ))}
                <button
                  onClick={() => fetchMcpGraph(targetService, traversalDepth)}
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                  title="Refresh Graph"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${loadingGraph ? 'animate-spin text-cyan-400' : ''}`} />
                </button>
              </div>
            </div>

            {/* Interactive Graph Canvas representation */}
            <div className="relative flex-1 min-h-[340px] bg-slate-950/60 rounded-lg my-4 border border-slate-800/80 p-4 flex flex-col justify-between overflow-hidden">
              <div className="absolute top-2 right-2 text-[10px] font-mono text-slate-500 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                GROQ: *[_type == "service" && references(^._id)]
              </div>

              {/* Visual Nodes representation */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 z-10">
                {graphData?.graph?.nodes?.map((node: any) => {
                  const isSelected = selectedNode?.id === node.id;
                  const isRoot = node.hopDistance === 0;
                  const isTier0 = node.tier?.includes('tier-0');

                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-cyan-950/70 border-cyan-400 ring-2 ring-cyan-500/30'
                          : isRoot
                          ? 'bg-slate-900/90 border-slate-700 hover:border-slate-500'
                          : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className={`px-1.5 py-0.2 rounded font-mono text-[9px] ${
                          isTier0 ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {node.tier?.split('-')[1]?.toUpperCase() || 'TIER'}
                        </span>
                        <span className="font-mono text-slate-500 text-[10px]">Hop {node.hopDistance}</span>
                      </div>
                      <div className="font-medium text-xs text-slate-100 truncate">{node.name}</div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">{node.team}</div>
                    </div>
                  );
                })}
              </div>

              {/* Edge matrix summary */}
              <div className="border-t border-slate-800/80 pt-2 text-[11px] text-slate-400 flex justify-between items-center z-10">
                <span>Total Nodes: <strong className="text-slate-200">{graphData?.graph?.nodes?.length || 0}</strong></span>
                <span>Active Blast Radius: <strong className="text-rose-400 font-mono">{graphData?.traversalMetrics?.blastRadiusScore || 0}%</strong></span>
                <span>Discovered Edges: <strong className="text-slate-200">{graphData?.graph?.edges?.length || 0}</strong></span>
              </div>
            </div>

            {/* Selected Node Details / Field Contracts */}
            {selectedNode && (
              <div className="bg-slate-950/70 rounded-lg p-3.5 border border-slate-800 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-200">{selectedNode.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400">
                    {selectedNode.protocol}
                  </span>
                </div>
                <div className="text-slate-400 text-[11px] mb-3">Owner: <span className="text-slate-300 font-mono">{selectedNode.team}</span></div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Field Contracts</div>
                  {selectedNode.endpoints?.[0]?.fieldContracts?.map((fc: any, i: number) => (
                    <div key={i} className="flex items-center justify-between bg-slate-900/60 px-2 py-1 rounded text-[11px] font-mono">
                      <span className="text-slate-300">{fc.fieldName}</span>
                      <span className="text-slate-500">{fc.dataType} {fc.required ? '(req)' : '(opt)'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Diff Analyzer & Agent Reasoning Engine (7 cols) */}
        <section className="xl:col-span-7 flex flex-col gap-6">
          {/* Diff Analyzer Input Box */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-cyan-400" />
                <h2 className="font-semibold text-sm text-slate-200">Live Diff Analyzer & Schema Mutations</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Preset Scenarios:</span>
                <select
                  value={currentScenario.id}
                  onChange={(e) => {
                    const s = PRESET_SCENARIOS.find((item) => item.id === e.target.value);
                    if (s) handleScenarioChange(s);
                  }}
                  className="bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded px-2.5 py-1 focus:outline-none focus:border-cyan-500"
                >
                  {PRESET_SCENARIOS.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-xs text-slate-400 mt-2">{currentScenario.description}</p>

            {/* Code Diff Editor */}
            <div className="mt-3 relative">
              <textarea
                value={diffInput}
                onChange={(e) => setDiffInput(e.target.value)}
                rows={7}
                className="w-full bg-slate-950 text-slate-200 font-mono text-xs rounded-lg p-3 border border-slate-800 focus:outline-none focus:border-cyan-500 selection:bg-cyan-500/20 resize-y"
                placeholder="Paste unified git diff, GraphQL schema mutation, or Sanity field change..."
              />
            </div>

            {/* Actions Bar */}
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-slate-400">
                Target: <span className="font-mono text-cyan-400">{targetService}</span>
              </div>
              <button
                onClick={runSentinelAnalysis}
                disabled={analyzing || !canAnalyze}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all shadow-lg ${
                  !canAnalyze
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : analyzing
                    ? 'bg-cyan-700 text-white cursor-wait'
                    : 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-cyan-500/20'
                }`}
              >
                {analyzing ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sentinel Reasoning...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Analyze Breaking Changes</span>
                  </>
                )}
              </button>
            </div>
            {!canAnalyze && (
              <p className="text-[11px] text-amber-400 mt-1">
                ⚠️ Role '{selectedRole}' is read-only. Switch to 'Developer' or 'Admin' above to trigger AI analysis.
              </p>
            )}
          </div>

          {/* AI Sentinel Reasoning Output & Migration Patch */}
          {analysisResult && (
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
              {/* Verdict Banner */}
              <div className={`p-4 rounded-lg border flex items-center justify-between ${
                analysisResult.overallVerdict === 'BLOCKED_BREAKING_CHANGES'
                  ? 'bg-rose-950/50 border-rose-800 text-rose-200'
                  : analysisResult.overallVerdict === 'WARNING_DEPRECATIONS'
                  ? 'bg-amber-950/50 border-amber-800 text-amber-200'
                  : 'bg-emerald-950/50 border-emerald-800 text-emerald-200'
              }`}>
                <div className="flex items-center gap-3">
                  {analysisResult.overallVerdict === 'BLOCKED_BREAKING_CHANGES' ? (
                    <ShieldAlert className="w-6 h-6 text-rose-400" />
                  ) : (
                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  )}
                  <div>
                    <div className="font-bold text-sm tracking-wide">
                      VERDICT: {analysisResult.overallVerdict.replace(/_/g, ' ')}
                    </div>
                    <div className="text-xs opacity-90">
                      Blast Radius: <strong>{analysisResult.blastRadiusScore}%</strong> | Squads at risk: {analysisResult.affectedSquads.join(', ')}
                    </div>
                  </div>
                </div>
                <div className="text-right text-xs font-mono">
                  <div>Model: {analysisResult.metrics?.modelUsed}</div>
                  <div className="opacity-75">{analysisResult.metrics?.agentReasoningLatencyMs}ms</div>
                </div>
              </div>

              {/* Breakage List */}
              {analysisResult.breakages?.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-300">Cascading Contract Regressions:</div>
                  {analysisResult.breakages.map((b: any, idx: number) => (
                    <div key={idx} className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 text-xs">
                      <div className="flex items-center justify-between font-mono mb-1">
                        <span className="text-rose-400 font-bold">{b.fieldName}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                          {b.severity}
                        </span>
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        Mutation: <span className="text-slate-300 font-mono">{b.previousContract}</span> ➔ <span className="text-rose-300 font-mono">{b.proposedDiff}</span>
                      </div>
                      {b.affectedConsumers?.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                          <strong>Downstream Blast:</strong> {b.affectedConsumers.map((c: any) => `${c.serviceName} (${c.consumerTeam})`).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Gemini Reasoning Narrative */}
              {analysisResult.geminiReasoningExplanation && (
                <div className="bg-slate-950/60 rounded-lg p-3.5 border border-slate-800/90 text-xs">
                  <div className="font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                    Autonomous Sentinel Reasoning:
                  </div>
                  <p className="text-slate-300 leading-relaxed text-xs whitespace-pre-line font-mono">
                    {analysisResult.geminiReasoningExplanation}
                  </p>
                </div>
              )}

              {/* Automated Migration Patch / Codemod */}
              {analysisResult.automatedMigrationPatch?.patchCode && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">Automated Migration Patch (Zero-Downtime Adapter):</span>
                    <button
                      onClick={handleCopyPatch}
                      className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
                    >
                      {copiedPatch ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedPatch ? 'Copied!' : 'Copy Code'}</span>
                    </button>
                  </div>
                  <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-56">
                    {analysisResult.automatedMigrationPatch.patchCode}
                  </pre>
                  {canApplyPatch && (
                    <button
                      onClick={() => alert(`Migration Patch applied to service '${targetService}'! Sentinel status updated to Healthy.`)}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all shadow-lg shadow-emerald-600/20"
                    >
                      Apply Migration Patch to Sanity Dataset (Admin Override)
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Real-Time Observability Agent Logs */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <h2 className="font-semibold text-sm text-slate-200">Real-Time Agent Execution Logs</h2>
              </div>
              <div className="flex items-center gap-2">
                {(['ALL', 'AUDIT', 'WARN', 'ERROR', 'INFO'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setLogFilter(lvl)}
                    className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                      logFilter === lvl ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div className="my-3 flex items-center bg-slate-950 rounded-lg px-2.5 py-1.5 border border-slate-800 text-xs">
              <Search className="w-3.5 h-3.5 text-slate-500 mr-2" />
              <input
                type="text"
                placeholder="Search audit trail, event names, or trace IDs..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="bg-transparent border-none text-slate-200 text-xs w-full focus:outline-none"
              />
            </div>

            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {filteredLogs.map((log) => (
                <div key={log.id} className="bg-slate-950/80 p-2 rounded border border-slate-800/80 font-mono text-[10px] flex flex-col gap-0.5">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        log.level === 'ERROR' ? 'bg-rose-500' : log.level === 'WARN' ? 'bg-amber-500' : 'bg-cyan-500'
                      }`} />
                      <strong className="text-slate-300">{log.event}</strong>
                    </span>
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-slate-300">{log.message}</div>
                  <div className="text-[9px] text-slate-500 flex gap-3">
                    <span>Role: {log.userRole || 'system'}</span>
                    <span>Trace: {log.traceId}</span>
                    {log.durationMs && <span>Latency: {log.durationMs}ms</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
