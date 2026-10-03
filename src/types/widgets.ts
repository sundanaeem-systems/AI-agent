/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Visualization Widget Interfaces & Types
 * ChronoGraph - Autonomous Cross-System Breaking-Change Sentinel
 */

export type TimeRange = '15m' | '1h' | '6h' | '24h' | '7d' | 'LIVE';

export type ChartTypeResponseTime = 'line' | 'bar' | 'area';
export type ChartTypeSuccessRate = 'heatmap' | 'bar' | 'donut';

export type MetricTypeLatency = 'overall' | 'agentReasoning' | 'mcpTraversal' | 'all';

export interface TimeSeriesPoint {
  timestamp: string; // ISO string or time label
  timeLabel: string;
  responseTimeMs: number;
  agentReasoningMs: number;
  mcpTraversalMs: number;
  p50: number;
  p90: number;
  p99: number;
  throughputRps: number;
  successRate: number; // 0-100
  errorCount: number;
  activeService: string;
}

export interface ErrorCategoryBreakdown {
  category: string;
  count: number;
  percentage: number;
  severity: 'CRITICAL_BLOCKER' | 'HIGH_RISK' | 'WARNING';
  description: string;
}

export interface HeatmapCell {
  squad: string;
  timeBucket: string;
  errorDensity: number; // 0 (nominal) to 10 (critical peak)
  incidentCount: number;
  status: 'nominal' | 'warning' | 'critical';
  details?: {
    lastErrorField?: string;
    contractDelta?: string;
    impactScore?: number;
  };
}

export interface HeatmapRow {
  squad: string;
  cells: HeatmapCell[];
}

export interface TelemetryData {
  timeRange: TimeRange;
  points: TimeSeriesPoint[];
  squadHeatmap: HeatmapRow[];
  errorCategories: ErrorCategoryBreakdown[];
  summary: {
    avgResponseTimeMs: number;
    p99ResponseTimeMs: number;
    overallSuccessRate: number;
    totalRequests: number;
    interceptedRegressions: number;
    activeAnomalies: number;
  };
}

// ---------------------------------------------------------------
// Sanity Context Agent (Path One): tool trace + contradictions
// ---------------------------------------------------------------
export interface ToolTraceEntry {
  step: number;
  tool: string;
  source: 'graph' | 'docs';
  args: unknown;
  ms: number;
  ok: boolean;
  preview: string;
}

export interface ContradictionClaim {
  text: string;
  source: string;
}

export interface ContradictionDecision {
  chosen: 'A' | 'B';
  reason?: string;
  decidedBy: string;
  decidedAt: string;
}

export interface Contradiction {
  id: string;
  field: string;
  attribute: string;
  claimA: ContradictionClaim;
  claimB: ContradictionClaim;
  decision?: ContradictionDecision;
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
  steps: number;
}
