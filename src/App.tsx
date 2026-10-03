/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Master Developer Dashboard: ChronoGraph Sentinel
 * Autonomous Cross-System Breaking-Change Sentinel
 */

import React, { useState, useEffect } from 'react';
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
  Sparkles,
  ExternalLink,
  Code2,
  BarChart3,
  Sliders,
  Menu,
  X,
  Bot,
  Home,
  Database,
  GitPullRequest,
} from 'lucide-react';
import { type UserRole, SYSTEM_USERS, ROLE_PERMISSIONS } from '../lib/rbac/permissions.ts';
import { GraphCanvas } from './components/GraphCanvas.tsx';
import { ExportModal } from './components/ExportModal.tsx';
import { RbacModal } from './components/RbacModal.tsx';
import { MetricsCards } from './components/MetricsCards.tsx';
import { ResponseTimeWidget } from './components/widgets/ResponseTimeWidget.tsx';
import { SuccessRateHeatmapWidget } from './components/widgets/SuccessRateHeatmapWidget.tsx';
import { AgentLogsStreamWidget } from './components/widgets/AgentLogsStreamWidget.tsx';
import { WidgetCodeModal } from './components/WidgetCodeModal.tsx';
import { CosmicBackground } from './components/CosmicBackground.tsx';
import { LandingPage } from './components/LandingPage.tsx';
import { SanityLivePanel } from './components/SanityLivePanel.tsx';
import { AgentTracePanel } from './components/AgentTracePanel.tsx';
import { ContradictionCard } from './components/ContradictionCard.tsx';
import { type Contradiction, type ContextAgentResult } from './types/widgets.ts';
import { AstWebhookPanel } from './components/AstWebhookPanel.tsx';
import { useLiveTelemetry } from './lib/useLiveTelemetry.ts';
import { type TimeRange, type TelemetryData } from './types/widgets.ts';
import { loadMcpContext, loadAgentLogs, runSentinelDiffAnalysis } from './lib/apiClient.ts';

const PRESET_SCENARIOS = [
  {
    id: 'stripe_payment_removal',
    name: 'Stripe Webhook: paymentMethodId Dropped',
    targetService: 'srv_billing_core',
    description: 'Removes paymentMethodId from billing response, breaking downstream Order Orchestrator & Mobile BFF.',
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
    name: 'Tax ID: Optional to Required Contraction',
    targetService: 'srv_billing_core',
    description: 'Changes taxId from optional nullable string to mandatory string, crashing B2C checkout flows.',
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
    name: 'Customer ID: String UUID to Int Serial Mutation',
    targetService: 'srv_billing_core',
    description: 'Mutates customerId primitive type from string to integer, breaking GraphQL and Kafka consumer schemas.',
    diff: `diff --git a/services/billing/models.ts b/services/billing/models.ts
--- a/services/billing/models.ts
+++ b/services/billing/models.ts
@@ -4,3 +4,3 @@ export interface BillingAccount {
-  customerId: string;
+  customerId: number; // Mutated to internal integer serial
   currency: string;`,
  },
  {
    id: 'sanity_schema_field_rename',
    name: 'Sanity Lake: Document Field Rename',
    targetService: 'srv_customer_profile',
    description: 'Renames contractVersion to semverTag in Sanity schema without GROQ alias migration.',
    diff: `diff --git a/sanity/schemas/customer.ts b/sanity/schemas/customer.ts
--- a/sanity/schemas/customer.ts
+++ b/sanity/schemas/customer.ts
@@ -14,2 +14,2 @@ export default {
-    { name: 'contractVersion', type: 'string' },
+    { name: 'semverTag', type: 'string' },`,
  },
];

type ActiveTab = 'landing' | 'overview' | 'widgets' | 'architecture' | 'logs' | 'sanity' | 'webhook';

export default function App() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [currentScenario, setCurrentScenario] = useState(PRESET_SCENARIOS[0]);
  const [diffInput, setDiffInput] = useState(PRESET_SCENARIOS[0].diff);
  const [targetService, setTargetService] = useState('srv_billing_core');
  const [traversalDepth, setTraversalDepth] = useState(3);
  const [activeTab, setActiveTab] = useState<ActiveTab>('landing');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Graph state
  const [graphData, setGraphData] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [loadingGraph, setLoadingGraph] = useState(false);

  // Analysis state
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [copiedPatch, setCopiedPatch] = useState(false);
  const [patchApplied, setPatchApplied] = useState(false);

  // Observability & logs
  const [logs, setLogs] = useState<any[]>([]);

  // Telemetry timeseries & live SSE observability pipe
  const [timeRange, setTimeRange] = useState<TimeRange>('1h');
  const [isLiveStream, setIsLiveStream] = useState<boolean>(true);
  const {
    telemetry,
    setTelemetry,
    isConnected: isSseConnected,
    connectedClients,
    emitTelemetryEvent,
  } = useLiveTelemetry({
    timeRange,
    activeService: targetService,
    enabled: isLiveStream,
  });

  const [patchMutationStatus, setPatchMutationStatus] = useState<string | null>(null);

  // Modals
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isRbacOpen, setIsRbacOpen] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [codeModalInitialTab, setCodeModalInitialTab] = useState<'responseTime' | 'heatmap'>('responseTime');

  // Fetch MCP Context Graph
  const fetchMcpGraph = async (svcId = targetService, depth = traversalDepth) => {
    setLoadingGraph(true);
    try {
      const { result } = await loadMcpContext(svcId, depth, selectedRole);
      if (result?.graph) {
        setGraphData(result);
        if (!selectedNode && result.graph.nodes?.length > 0) {
          setSelectedNode(result.graph.nodes[0]);
        }
      }
    } catch (e) {
      console.warn('MCP context resolution notice:', e);
    } finally {
      setLoadingGraph(false);
    }
  };

  // Run AI Reasoning Sentinel
  const runSentinelAnalysis = async () => {
    setAnalyzing(true);
    setPatchApplied(false);
    try {
      const { result } = await runSentinelDiffAnalysis(diffInput, targetService, selectedRole);
      if (result) {
        setAnalysisResult(result);
      }
      fetchLogs();
    } catch (e) {
      console.warn('Sentinel analysis notice:', e);
    } finally {
      setAnalyzing(false);
    }
  };

  // Fetch Logs
  const fetchLogs = async () => {
    try {
      const logEntries = await loadAgentLogs();
      if (logEntries && logEntries.length > 0) {
        setLogs(logEntries);
      }
    } catch (e) {
      console.warn('Logs refresh notice:', e);
    }
  };

  useEffect(() => {
    fetchMcpGraph(targetService, traversalDepth);
    fetchLogs();
  }, [targetService, traversalDepth, selectedRole]);

  // Run initial analysis automatically on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      runSentinelAnalysis();
    }, 600);
    return () => clearTimeout(timer);
  }, []);

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

  const handleApplyPatch = async () => {
    setPatchApplied(true);
    if (analysisResult?.breakages?.[0]) {
      const bField = analysisResult.breakages[0].fieldName;
      try {
        setPatchMutationStatus('Applying live patch mutation to Sanity Content Lake...');
        const res = await fetch('/api/sanity/patch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-sentinel-role': selectedRole,
          },
          body: JSON.stringify({
            serviceId: targetService,
            fieldName: bField,
            action: 'DEPRECATE_FIELD',
            newFieldName: `new${bField}`,
            patchCode: analysisResult.automatedMigrationPatch?.patchCode,
            rollbackPlan: analysisResult.automatedMigrationPatch?.rollbackPlan,
          }),
        });
        const data = await res.json();
        setPatchMutationStatus(data.message || 'Patch mutation successfully applied to Sanity Content Lake.');
        emitTelemetryEvent({
          service: targetService,
          responseTimeMs: 92,
          statusCode: 200,
          path: '/api/sanity/patch',
        });
      } catch (err: any) {
        setPatchMutationStatus(`Patch applied locally (${err?.message || 'Offline mode'})`);
      }
    }
    fetchLogs();
  };

  const openCodeModal = (tab: 'responseTime' | 'heatmap') => {
    setCodeModalInitialTab(tab);
    setIsCodeModalOpen(true);
  };

  const currentUser = SYSTEM_USERS[selectedRole];
  const canAnalyze = ROLE_PERMISSIONS[selectedRole].includes('agent:analyze');
  const canApplyPatch = ROLE_PERMISSIONS[selectedRole].includes('patch:apply');

  return (
    <div className="relative min-h-screen bg-[#020510] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-900 overflow-x-hidden">
      {/* Cinematic Cosmic & Night Cityscape AI Background */}
      <CosmicBackground initialMode="merged" showAtmosphereButton={activeTab !== 'landing'} />

      {/* Top Bar Contract: Brand mark, Navigation Tabs, Action Controls (Hidden on Landing Page) */}
      {activeTab !== 'landing' && (
        <header className="relative z-40 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl sticky top-0 px-4 sm:px-6 py-3">
          <div className="max-w-[1700px] mx-auto flex items-center justify-between gap-4">
            {/* Brand Zone (Single Wordmark with subtitle - click to go Home/Landing) */}
            <div
              onClick={() => setActiveTab('landing')}
              className="flex items-center gap-3 cursor-pointer group select-none"
              title="ChronoGraph Sentinel Home"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-rose-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/30 shrink-0 group-hover:scale-105 transition-transform">
                <Cpu className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold tracking-tight text-base text-slate-100 group-hover:text-cyan-300 transition-colors">ChronoGraph</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 hidden sm:inline">
                    Sentinel v2.4
                  </span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800 hidden md:inline">
                    Sanity MCP
                  </span>
                </div>
                <p className="text-xs text-slate-400 hidden sm:block">Autonomous Breaking-Change Sentinel</p>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 bg-slate-950/90 p-1 rounded-xl border border-slate-800 text-xs font-medium">
              <button
                onClick={() => setActiveTab('landing')}
                className="px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 text-slate-400 hover:text-slate-200"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Welcome</span>
              </button>
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Studio Overview
              </button>
              <button
                onClick={() => setActiveTab('widgets')}
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === 'widgets'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Telemetry Studio
              </button>
              <button
                onClick={() => setActiveTab('sanity')}
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'sanity'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-amber-400" />
                <span>Sanity Lake</span>
              </button>
              <button
                onClick={() => setActiveTab('webhook')}
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'webhook'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <GitPullRequest className="w-3.5 h-3.5 text-cyan-400" />
                <span>CI/CD & AST</span>
              </button>
              <button
                onClick={() => setActiveTab('architecture')}
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === 'architecture'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Architecture & Diff
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === 'logs'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Agent Audit Stream
              </button>
            </nav>

          {/* Action Zone: Widget Code Showcase, Export, RBAC */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live SSE Stream Indicator */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-mono ${
                isSseConnected
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                  : 'bg-amber-950/80 text-amber-300 border-amber-800'
              }`}
              title="Real-Time Telemetry Observability Pipe (SSE)"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isSseConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
              <span>{isSseConnected ? 'LIVE SSE' : 'RECONNECTING'}</span>
            </div>
            {/* Widget Code Showcase Button */}
            <button
              onClick={() => openCodeModal('responseTime')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/80 text-indigo-200 text-xs font-medium transition-all shadow-sm active:scale-95"
              title="View and copy example widget code"
            >
              <Code2 className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Widget Code</span>
            </button>

            {/* Export Report Button */}
            <button
              onClick={() => setIsExportOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-200 text-xs font-medium border border-slate-700 transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Export</span>
            </button>

            {/* RBAC Selector Pill */}
            <div className="hidden sm:flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800">
              <button
                onClick={() => setIsRbacOpen(true)}
                className="text-xs text-slate-400 px-2 flex items-center gap-1 hover:text-slate-200"
                title="Open RBAC Permissions Matrix"
              >
                <Key className="w-3 h-3 text-cyan-400" />
              </button>
              {(['admin', 'developer', 'viewer'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRole(r)}
                  className={`text-[11px] px-2 py-1 rounded capitalize font-medium transition-all ${
                    selectedRole === r
                      ? r === 'admin'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : r === 'developer'
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-slate-800 space-y-2 animate-fade-in">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => {
                  setActiveTab('landing');
                  setMobileMenuOpen(false);
                }}
                className="p-2 rounded-lg text-left font-medium bg-slate-950 text-slate-300 hover:text-white"
              >
                Welcome
              </button>
              <button
                onClick={() => {
                  setActiveTab('overview');
                  setMobileMenuOpen(false);
                }}
                className={`p-2 rounded-lg text-left font-medium ${
                  activeTab === 'overview' ? 'bg-cyan-600 text-white' : 'bg-slate-950 text-slate-300'
                }`}
              >
                Studio Overview
              </button>
              <button
                onClick={() => {
                  setActiveTab('widgets');
                  setMobileMenuOpen(false);
                }}
                className={`p-2 rounded-lg text-left font-medium ${
                  activeTab === 'widgets' ? 'bg-cyan-600 text-white' : 'bg-slate-950 text-slate-300'
                }`}
              >
                Telemetry Studio
              </button>
              <button
                onClick={() => {
                  setActiveTab('sanity');
                  setMobileMenuOpen(false);
                }}
                className={`p-2 rounded-lg text-left font-medium ${
                  activeTab === 'sanity' ? 'bg-cyan-600 text-white' : 'bg-slate-950 text-slate-300'
                }`}
              >
                Sanity Lake
              </button>
              <button
                onClick={() => {
                  setActiveTab('webhook');
                  setMobileMenuOpen(false);
                }}
                className={`p-2 rounded-lg text-left font-medium ${
                  activeTab === 'webhook' ? 'bg-cyan-600 text-white' : 'bg-slate-950 text-slate-300'
                }`}
              >
                CI/CD & AST
              </button>
              <button
                onClick={() => {
                  setActiveTab('architecture');
                  setMobileMenuOpen(false);
                }}
                className={`p-2 rounded-lg text-left font-medium ${
                  activeTab === 'architecture' ? 'bg-cyan-600 text-white' : 'bg-slate-950 text-slate-300'
                }`}
              >
                Architecture & Diff
              </button>
              <button
                onClick={() => {
                  setActiveTab('logs');
                  setMobileMenuOpen(false);
                }}
                className={`p-2 rounded-lg text-left font-medium col-span-2 ${
                  activeTab === 'logs' ? 'bg-cyan-600 text-white' : 'bg-slate-950 text-slate-300'
                }`}
              >
                Agent Audit Stream
              </button>
            </div>

            {/* Mobile RBAC Clearances */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <span className="text-slate-400">Clearance:</span>
              <div className="flex gap-1">
                {(['admin', 'developer', 'viewer'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setSelectedRole(r);
                      setMobileMenuOpen(false);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono capitalize ${
                      selectedRole === r ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>
      )}

      {/* Hero Metrics Row (Studio Dashboard Views) */}
      {activeTab !== 'landing' && (
        <div className="relative z-10 px-4 sm:px-6 pt-5 pb-1 max-w-[1700px] w-full mx-auto">
          <MetricsCards
            metrics={analysisResult?.metrics || null}
            blastRadiusScore={analysisResult?.blastRadiusScore ?? graphData?.traversalMetrics?.blastRadiusScore ?? 0}
            totalBreakagesFound={analysisResult?.totalBreakagesFound ?? 0}
            missionCriticalAtRisk={analysisResult?.missionCriticalAtRisk ?? false}
          />
        </div>
      )}

      {/* Main View Router */}
      <main className="relative z-10 flex-1 p-4 sm:p-6 max-w-[1700px] w-full mx-auto space-y-6">
        {/* VIEW 0: WELCOME & LANDING PAGE */}
        {activeTab === 'landing' && (
          <LandingPage
            onEnterStudio={(tab = 'overview', scenarioId) => {
              if (scenarioId) {
                const sc = PRESET_SCENARIOS.find((s) => s.id === scenarioId);
                if (sc) handleScenarioChange(sc);
              }
              setActiveTab(tab);
            }}
            presetScenarios={PRESET_SCENARIOS}
            onSelectScenario={handleScenarioChange}
            currentScenario={currentScenario}
            selectedRole={selectedRole}
            onSelectRole={(r) => setSelectedRole(r)}
            onOpenCodeModal={() => openCodeModal('responseTime')}
          />
        )}

        {/* VIEW 1: STUDIO OVERVIEW (Unified Layout) */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top Row: Two Primary Advanced Customizable Visualization Widgets */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <ResponseTimeWidget
                data={telemetry.points}
                timeRange={timeRange}
                onTimeRangeChange={(r) => setTimeRange(r)}
                isLive={isLiveStream}
                onToggleLive={() => setIsLiveStream(!isLiveStream)}
                targetSlaMs={200}
                onOpenCode={() => openCodeModal('responseTime')}
              />
              <SuccessRateHeatmapWidget
                squadHeatmap={telemetry.squadHeatmap}
                errorCategories={telemetry.errorCategories}
                timeRange={timeRange}
                onTimeRangeChange={(r) => setTimeRange(r)}
                onOpenCode={() => openCodeModal('heatmap')}
              />
            </div>

            {/* Bottom Row: System Dependency Graph (Left 5 cols) & Diff Analysis + Verdict + Patch (Right 7 cols) */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* Left Column: GROQ Graph & Node Inspector */}
              <section className="xl:col-span-5 flex flex-col gap-6">
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-xl flex flex-col">
                  <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-cyan-400" />
                      <h2 className="font-semibold text-sm text-slate-200">System Dependency Graph</h2>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400">Depth:</span>
                      {[1, 2, 3, 4].map((d) => (
                        <button
                          key={d}
                          onClick={() => setTraversalDepth(d)}
                          className={`w-6 h-6 rounded flex items-center justify-center font-mono text-xs border transition-all ${
                            traversalDepth === d
                              ? 'bg-cyan-600 text-white border-cyan-400 font-bold'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                      <button
                        onClick={() => fetchMcpGraph(targetService, traversalDepth)}
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all"
                        title="Execute GROQ Multi-Hop Traversal"
                      >
                        <RotateCw className={`w-3.5 h-3.5 ${loadingGraph ? 'animate-spin text-cyan-400' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Responsive SVG Graph Canvas */}
                  <div className="my-4">
                    <GraphCanvas
                      nodes={graphData?.graph?.nodes || []}
                      edges={graphData?.graph?.edges || []}
                      selectedNode={selectedNode}
                      onSelectNode={(node) => setSelectedNode(node)}
                      blastRadiusNodeIds={
                        analysisResult?.breakages?.flatMap((b: any) =>
                          (b.affectedConsumers || []).map((c: any) => c.serviceName)
                        ) || []
                      }
                    />
                  </div>

                  {/* Selected Node Details */}
                  {selectedNode && (
                    <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800 text-xs">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100">{selectedNode.name}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-850 text-cyan-300 border border-slate-800">
                            {selectedNode.protocol}
                          </span>
                        </div>
                        <span className="text-slate-400 font-mono text-[11px]">{selectedNode.team}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Tier:{' '}
                        <span className="font-mono text-slate-200 uppercase font-semibold">
                          {selectedNode.tier}
                        </span>{' '}
                        | Distance: <span className="font-mono text-cyan-400">{selectedNode.hopDistance} hops</span>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Right Column: Scenario Diff Analyzer & Autonomous Patch Synthesizer */}
              <section className="xl:col-span-7 flex flex-col gap-6 min-w-0 w-full overflow-hidden">
                {/* Scenario Selector & Code Diff Editor */}
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 sm:p-5 shadow-xl flex flex-col min-w-0 w-full overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3.5 border-b border-slate-800 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCode className="w-4 h-4 text-cyan-400 shrink-0" />
                      <h2 className="font-semibold text-sm text-slate-200 truncate">Contract Delta & Diff Analyzer</h2>
                    </div>
                    {/* Scenario Presets Selector */}
                    <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
                      <span className="text-xs text-slate-400 shrink-0">Scenario:</span>
                      <select
                        value={currentScenario.id}
                        onChange={(e) => {
                          const s = PRESET_SCENARIOS.find((item) => item.id === e.target.value);
                          if (s) handleScenarioChange(s);
                        }}
                        className="w-full sm:w-auto max-w-full min-w-0 truncate bg-slate-950 text-cyan-300 font-mono text-xs rounded-lg px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:border-cyan-500 cursor-pointer"
                      >
                        {PRESET_SCENARIOS.map((s) => (
                          <option key={s.id} value={s.id} className="bg-slate-900 text-slate-200">
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">{currentScenario.description}</p>

                  {/* Code Diff Editor */}
                  <div className="mt-3 relative min-w-0 w-full">
                    <textarea
                      value={diffInput}
                      onChange={(e) => setDiffInput(e.target.value)}
                      rows={6}
                      className="w-full max-w-full min-w-0 bg-slate-950 text-slate-200 font-mono text-xs rounded-xl p-3.5 border border-slate-800 focus:outline-none focus:border-cyan-500 selection:bg-cyan-500/20 resize-y leading-relaxed overflow-x-auto"
                      placeholder="Paste unified git diff, GraphQL schema mutation, or Sanity field change..."
                    />
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 min-w-0">
                    <div className="text-xs text-slate-400 truncate">
                      Targeting: <span className="font-mono text-cyan-400 font-bold">{targetService}</span>
                    </div>
                    <button
                      onClick={runSentinelAnalysis}
                      disabled={analyzing || !canAnalyze}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-lg shrink-0 ${
                        !canAnalyze
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                          : analyzing
                          ? 'bg-cyan-700 text-white cursor-wait'
                          : 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-cyan-500/25 active:scale-95'
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
                    <p className="text-[11px] text-amber-400 mt-1.5 flex items-center gap-1 font-mono">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Role '{selectedRole}' is read-only. Switch clearance to 'Developer' or 'Admin' in top-right to execute reasoning.
                    </p>
                  )}
                </div>

                {/* AI Sentinel Reasoning Output & Migration Patch */}
                {analysisResult && (
                  <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 sm:p-5 shadow-xl space-y-4 min-w-0 w-full overflow-hidden">
                    {/* Verdict Banner (Advanced, Fully Functional, Overlap-Free) */}
                    <div
                      className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3.5 shadow-xl min-w-0 w-full overflow-hidden ${
                        analysisResult.overallVerdict === 'BLOCKED_BREAKING_CHANGES'
                          ? 'bg-rose-950/70 border-rose-800 text-rose-200'
                          : analysisResult.overallVerdict === 'WARNING_DEPRECATIONS'
                          ? 'bg-amber-950/70 border-amber-800 text-amber-200'
                          : 'bg-emerald-950/70 border-emerald-800 text-emerald-200'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {analysisResult.overallVerdict === 'BLOCKED_BREAKING_CHANGES' ? (
                          <div className="w-10 h-10 rounded-xl bg-rose-900/80 border border-rose-600 flex items-center justify-center shrink-0 shadow-lg shadow-rose-950/50">
                            <ShieldAlert className="w-6 h-6 text-rose-300 animate-pulse" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-emerald-900/80 border border-emerald-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-950/50">
                            <ShieldCheck className="w-6 h-6 text-emerald-300" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-sm tracking-wide flex flex-wrap items-center gap-2">
                            <span className="text-white uppercase font-mono">
                              VERDICT: {analysisResult.overallVerdict.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-900/80 border border-rose-700 text-rose-200 font-semibold shrink-0">
                              {analysisResult.totalBreakagesFound} Breaking Regressions
                            </span>
                          </div>
                          <div className="text-xs opacity-90 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span>
                              Blast Radius: <strong>{analysisResult.blastRadiusScore}%</strong>
                            </span>
                            <span aria-hidden="true" className="text-slate-500">·</span>
                            <span className="break-words">
                              At-risk Squads: <strong>{analysisResult.affectedSquads.join(', ') || 'None'}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right-side Telemetry info */}
                      <div className="flex flex-wrap sm:flex-col items-start sm:items-end justify-between border-t md:border-t-0 pt-2.5 md:pt-0 border-rose-800/40 text-xs font-mono shrink-0 gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                          <span className="text-slate-200 font-semibold">{analysisResult.metrics?.modelUsed}</span>
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          Latency: <strong className="text-cyan-300">{analysisResult.metrics?.agentReasoningLatencyMs}ms</strong>
                        </div>
                      </div>
                    </div>

                    {/* Breakages List */}
                    {analysisResult.breakages?.length > 0 && (
                      <div className="space-y-2 min-w-0">
                        <div className="text-xs font-semibold text-slate-300">Cascading Contract Regressions:</div>
                        {analysisResult.breakages.map((b: any, idx: number) => (
                          <div key={idx} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 text-xs min-w-0 overflow-hidden">
                            <div className="flex items-center justify-between font-mono mb-1.5 flex-wrap gap-1">
                              <span className="text-rose-400 font-bold truncate">{b.fieldName}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold shrink-0">
                                {b.severity}
                              </span>
                            </div>
                            <div className="text-slate-400 text-[11px] break-words">
                              Mutation: <span className="text-slate-300 font-mono">{b.previousContract}</span> ➔{' '}
                              <span className="text-rose-300 font-mono font-bold">{b.proposedDiff}</span>
                            </div>
                            {b.affectedConsumers?.length > 0 && (
                              <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                                <strong className="text-slate-300">Downstream Impact:</strong>
                                {b.affectedConsumers.map((c: any, cIdx: number) => (
                                  <div key={cIdx} className="text-slate-400 pl-2 border-l border-slate-800 break-words">
                                    • <span className="text-slate-200 font-mono">{c.serviceName}</span> ({c.consumerTeam}) - {c.impactDescription}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Sanity Context Agent: live MCP tool trace + contradictions */}
                    {analysisResult.contextAgent && (
                      <AgentTracePanel agent={analysisResult.contextAgent as ContextAgentResult} />
                    )}
                    {analysisResult.contextAgent?.contradictions?.length > 0 && (
                      <div className="space-y-2">
                        {(analysisResult.contextAgent.contradictions as Contradiction[]).map((c) => (
                          <ContradictionCard
                            key={c.id}
                            contradiction={c}
                            serviceId={targetService}
                            role={selectedRole}
                            canDecide={ROLE_PERMISSIONS[selectedRole as UserRole]?.includes('override:approve')}
                            onDecided={(updated) =>
                              setAnalysisResult((prev: any) => ({
                                ...prev,
                                contextAgent: {
                                  ...prev.contextAgent,
                                  contradictions: prev.contextAgent.contradictions.map((x: Contradiction) =>
                                    x.id === updated.id ? updated : x
                                  ),
                                },
                              }))
                            }
                          />
                        ))}
                      </div>
                    )}

                    {/* AI Sentinel Reasoning & Root-Cause Analysis */}
                    {analysisResult.geminiReasoningExplanation && (
                      <div className="space-y-1.5 bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 text-xs min-w-0 overflow-hidden">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                            <Bot className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            Sentinel Root-Cause & Cascading Impact Analysis:
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-cyan-300 border border-slate-800 shrink-0">
                            {analysisResult.metrics?.modelUsed || 'autonomous-agent'}
                          </span>
                        </div>
                        <p className="text-slate-300 text-[11px] leading-relaxed whitespace-pre-line mt-1.5 break-words">
                          {analysisResult.geminiReasoningExplanation}
                        </p>
                      </div>
                    )}

                    {/* Automated Migration Patch */}
                    {analysisResult.automatedMigrationPatch?.patchCode && (
                      <div className="space-y-2 min-w-0">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                            <Code2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            Backward-Compatible Migration Patch:
                          </span>
                          <button
                            onClick={handleCopyPatch}
                            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                          >
                            {copiedPatch ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedPatch ? 'Copied!' : 'Copy Patch'}</span>
                          </button>
                        </div>
                        <pre className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-56 leading-relaxed w-full max-w-full">
                          {analysisResult.automatedMigrationPatch.patchCode}
                        </pre>
                        {canApplyPatch && (
                          <button
                            onClick={handleApplyPatch}
                            disabled={patchApplied}
                            className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg ${
                              patchApplied
                                ? 'bg-emerald-800 text-emerald-200 cursor-default'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25 active:scale-98'
                            }`}
                          >
                            {patchApplied
                              ? '✓ Patch Committed to Sanity Content Lake! Sentinel Status: Healthy'
                              : 'Commit Automated Migration Patch to Sanity Dataset (Admin Override)'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {/* VIEW 2: VISUALIZATION STUDIO (All Advanced Customizable Widgets) */}
        {activeTab === 'widgets' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
                  Advanced Visualization Studio
                </h2>
                <p className="text-xs text-slate-400">
                  Customizable real-time monitoring suite: conversational metrics, percentile tail latency, and error frequency heatmaps
                </p>
              </div>
              <button
                onClick={() => openCodeModal('responseTime')}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 self-start sm:self-auto"
              >
                <Code2 className="w-4 h-4" />
                <span>View & Copy Widget Code</span>
              </button>
            </div>

            {/* Widget 1: Response Times & Percentile Latencies */}
            <ResponseTimeWidget
              data={telemetry.points}
              timeRange={timeRange}
              onTimeRangeChange={(r) => setTimeRange(r)}
              isLive={isLiveStream}
              onToggleLive={() => setIsLiveStream(!isLiveStream)}
              targetSlaMs={200}
              onOpenCode={() => openCodeModal('responseTime')}
            />

            {/* Widget 2: Success Rates & Multi-Squad Error Frequency Heatmap */}
            <SuccessRateHeatmapWidget
              squadHeatmap={telemetry.squadHeatmap}
              errorCategories={telemetry.errorCategories}
              timeRange={timeRange}
              onTimeRangeChange={(r) => setTimeRange(r)}
              onOpenCode={() => openCodeModal('heatmap')}
            />

            {/* Widget 3: Real-Time Agent Logs & Telemetry Stream */}
            <AgentLogsStreamWidget logs={logs} onRefresh={fetchLogs} />
          </div>
        )}

        {/* VIEW 3: ARCHITECTURE & DIFF SENTINEL */}
        {activeTab === 'architecture' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <section className="xl:col-span-5 flex flex-col gap-6">
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col">
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-cyan-400" />
                    <h2 className="font-semibold text-sm text-slate-200">System Dependency Graph</h2>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">Depth:</span>
                    {[1, 2, 3, 4].map((d) => (
                      <button
                        key={d}
                        onClick={() => setTraversalDepth(d)}
                        className={`w-6 h-6 rounded flex items-center justify-center font-mono text-xs border transition-all ${
                          traversalDepth === d
                            ? 'bg-cyan-600 text-white border-cyan-400 font-bold'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="my-4">
                  <GraphCanvas
                    nodes={graphData?.graph?.nodes || []}
                    edges={graphData?.graph?.edges || []}
                    selectedNode={selectedNode}
                    onSelectNode={(node) => setSelectedNode(node)}
                    blastRadiusNodeIds={
                      analysisResult?.breakages?.flatMap((b: any) =>
                        (b.affectedConsumers || []).map((c: any) => c.serviceName)
                      ) || []
                    }
                  />
                </div>

                {selectedNode && (
                  <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800 text-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-100">{selectedNode.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-850 text-cyan-300">
                        {selectedNode.protocol}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Team: {selectedNode.team} | Tier: {selectedNode.tier}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="xl:col-span-7 flex flex-col gap-6 min-w-0 w-full overflow-hidden">
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 sm:p-5 shadow-xl flex flex-col min-w-0 w-full overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3.5 border-b border-slate-800 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileCode className="w-4 h-4 text-cyan-400 shrink-0" />
                    <h2 className="font-semibold text-sm text-slate-200 truncate">Unified Diff Simulator</h2>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
                    <span className="text-xs text-slate-400 shrink-0">Scenario:</span>
                    <select
                      value={currentScenario.id}
                      onChange={(e) => {
                        const s = PRESET_SCENARIOS.find((item) => item.id === e.target.value);
                        if (s) handleScenarioChange(s);
                      }}
                      className="w-full sm:w-auto max-w-full min-w-0 truncate bg-slate-950 text-cyan-300 font-mono text-xs rounded-lg px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      {PRESET_SCENARIOS.map((s) => (
                        <option key={s.id} value={s.id} className="bg-slate-900 text-slate-200">
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <textarea
                  value={diffInput}
                  onChange={(e) => setDiffInput(e.target.value)}
                  rows={8}
                  className="w-full max-w-full min-w-0 mt-3 bg-slate-950 text-slate-200 font-mono text-xs rounded-xl p-3.5 border border-slate-800 focus:outline-none focus:border-cyan-500 resize-y overflow-x-auto leading-relaxed"
                />

                <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 min-w-0">
                  <span className="text-xs text-slate-400 truncate">
                    Target: <span className="text-cyan-400 font-mono font-bold">{targetService}</span>
                  </span>
                  <button
                    onClick={runSentinelAnalysis}
                    disabled={analyzing || !canAnalyze}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-lg shadow-cyan-500/20 active:scale-95 transition-all shrink-0"
                  >
                    {analyzing ? 'Analyzing...' : 'Analyze Breaking Changes'}
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* VIEW 4: AGENT AUDIT STREAM */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            <AgentLogsStreamWidget logs={logs} onRefresh={fetchLogs} className="min-h-[500px]" />
          </div>
        )}

        {/* VIEW 5: LIVE SANITY CONTENT LAKE */}
        {activeTab === 'sanity' && (
          <SanityLivePanel
            selectedRole={selectedRole}
            targetServiceId={targetService}
            onApplyPatchSuccess={() => fetchLogs()}
          />
        )}

        {/* VIEW 6: CI/CD WEBHOOK & AST PARSER STUDIO */}
        {activeTab === 'webhook' && (
          <AstWebhookPanel />
        )}
      </main>

      {/* Widget Code Documentation Modal */}
      <WidgetCodeModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        initialTab={codeModalInitialTab}
      />

      {/* Exporter Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        analysisResult={analysisResult}
        targetService={targetService}
        userRole={selectedRole}
      />

      {/* RBAC Management Modal */}
      <RbacModal
        isOpen={isRbacOpen}
        onClose={() => setIsRbacOpen(false)}
        currentUserRole={selectedRole}
        onSelectRole={(r) => {
          setSelectedRole(r);
          setIsRbacOpen(false);
        }}
      />
    </div>
  );
}
