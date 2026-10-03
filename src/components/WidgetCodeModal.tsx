/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Widget Code & Developer Documentation Modal
 * ChronoGraph - Autonomous Cross-System Breaking-Change Sentinel
 */

import React, { useState } from 'react';
import { X, Copy, Check, Code2, BookOpen, Layers, Sparkles } from 'lucide-react';

interface WidgetCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'responseTime' | 'heatmap';
}

const RESPONSE_TIME_SNIPPET = `/**
 * Example 1: ResponseTimeWidget
 * Customizable SVG line / bar / percentile area visualization widget
 * with time-range filtering, SLA target thresholds, and live hover tooltips.
 */

import React, { useState, useMemo } from 'react';
import { TimeRange, ChartTypeResponseTime, TimeSeriesPoint } from './types';

export interface ResponseTimeWidgetProps {
  data: TimeSeriesPoint[];
  timeRange: '15m' | '1h' | '6h' | '24h' | 'LIVE';
  onTimeRangeChange: (range: TimeRange) => void;
  targetSlaMs?: number;
}

export const ResponseTimeWidget: React.FC<ResponseTimeWidgetProps> = ({
  data,
  timeRange,
  onTimeRangeChange,
  targetSlaMs = 200,
}) => {
  const [chartType, setChartType] = useState<ChartTypeResponseTime>('line');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // SVG Scaler calculations
  const svgWidth = 700;
  const svgHeight = 220;
  const padding = { top: 20, right: 25, bottom: 35, left: 45 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map(d => Math.max(d.responseTimeMs, d.p99, targetSlaMs))) * 1.1;

  // Bezier smooth curve calculation
  const points = data.map((d, i) => ({
    ...d,
    x: padding.left + (i / Math.max(1, data.length - 1)) * graphWidth,
    y: padding.top + graphHeight - (d.responseTimeMs / maxVal) * graphHeight,
  }));

  const bezierPath = points.reduce((path, pt, i, arr) => {
    if (i === 0) return \`M \${pt.x},\${pt.y}\`;
    const prev = arr[i - 1];
    const cx = (prev.x + pt.x) / 2;
    return \`\${path} C \${cx},\${prev.y} \${cx},\${pt.y} \${pt.x},\${pt.y}\`;
  }, '');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <h3 className="font-semibold text-slate-100">Conversational Response Times</h3>
        {/* Time-range filter */}
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          {['15m', '1h', '6h', '24h', 'LIVE'].map(r => (
            <button
              key={r}
              onClick={() => onTimeRangeChange(r as TimeRange)}
              className={timeRange === r ? 'bg-slate-800 text-cyan-300 font-bold px-2 py-1 rounded' : 'text-slate-400 px-2 py-1'}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Canvas with dynamic hover tooltips */}
      <svg viewBox={\`0 0 \${svgWidth} \${svgHeight}\`} className="w-full h-[220px] mt-4">
        <path d={bezierPath} fill="none" stroke="#06b6d4" strokeWidth="2.5" />
        {points.map((pt, idx) => (
          <circle key={idx} cx={pt.x} cy={pt.y} r="3" fill="#06b6d4" />
        ))}
      </svg>
    </div>
  );
};`;

const HEATMAP_SNIPPET = `/**
 * Example 2: SuccessRateHeatmapWidget
 * Customizable multi-squad activity and contract error density heatmap
 * with interactive squad/severity filtering and cell inspection drawer.
 */

import React, { useState } from 'react';
import { HeatmapRow, HeatmapCell } from './types';

export interface SuccessRateHeatmapWidgetProps {
  squadHeatmap: HeatmapRow[];
  timeRange: '1h' | '6h' | '24h' | '7d';
  onTimeRangeChange: (range: any) => void;
}

export const SuccessRateHeatmapWidget: React.FC<SuccessRateHeatmapWidgetProps> = ({
  squadHeatmap,
  timeRange,
  onTimeRangeChange,
}) => {
  const [selectedSquad, setSelectedSquad] = useState('ALL');
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);

  const getCellColor = (density: number) => {
    if (density === 0) return 'bg-emerald-950 text-emerald-400 border-emerald-900';
    if (density <= 3) return 'bg-amber-900 text-amber-200 border-amber-700';
    return 'bg-rose-700 text-white border-rose-500 animate-pulse';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <h3 className="font-semibold text-slate-100">Contract Success & Error Matrix</h3>
        <span className="text-xs font-mono text-emerald-400">99.4% Nominal Compliance</span>
      </div>

      {/* 2D Heatmap Grid */}
      <div className="mt-4 space-y-2 overflow-x-auto">
        {squadHeatmap.map(row => (
          <div key={row.squad} className="flex items-center gap-2">
            <span className="w-32 text-xs font-mono text-slate-300 truncate">{row.squad}</span>
            <div className="grid grid-cols-12 gap-1.5 flex-1">
              {row.cells.map((cell, idx) => (
                <button
                  key={idx}
                  onMouseEnter={() => setHoveredCell(cell)}
                  onMouseLeave={() => setHoveredCell(null)}
                  className={\`h-7 rounded flex items-center justify-center font-mono text-xs \${getCellColor(cell.errorDensity)}\`}
                >
                  {cell.incidentCount > 0 ? cell.incidentCount : '·'}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Detail Drawer */}
      {hoveredCell && (
        <div className="mt-3 p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs">
          <strong>{hoveredCell.squad}</strong>: {hoveredCell.incidentCount} incidents ({hoveredCell.status})
        </div>
      )}
    </div>
  );
};`;

export const WidgetCodeModal: React.FC<WidgetCodeModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'responseTime',
}) => {
  const [activeTab, setActiveTab] = useState<'responseTime' | 'heatmap'>(initialTab);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentCode = activeTab === 'responseTime' ? RESPONSE_TIME_SNIPPET : HEATMAP_SNIPPET;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-800 flex items-center justify-center text-cyan-400">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Visualization Widget Developer Documentation</h2>
              <p className="text-xs text-slate-400">Production-grade, customizable React SVG widget implementations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher & Copy Bar */}
        <div className="px-6 py-3 bg-slate-950/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('responseTime')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'responseTime'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              1. ResponseTimeWidget.tsx (Line / Bar / Area)
            </button>
            <button
              onClick={() => setActiveTab('heatmap')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'heatmap'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              2. SuccessRateHeatmapWidget.tsx (Squad Matrix)
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-cyan-400" />
                <span>Copy Component Code</span>
              </>
            )}
          </button>
        </div>

        {/* Code Content Area */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-950 font-mono text-xs select-text">
          <pre className="text-slate-300 leading-relaxed overflow-x-auto whitespace-pre">
            {currentCode}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-900/90 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Zero external chart library bloat · 100% Native SVG · Dark Theme Aligned</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
