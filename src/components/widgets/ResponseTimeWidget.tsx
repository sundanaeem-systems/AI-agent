/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Response Time & Conversational Latency Widget
 * ChronoGraph - Autonomous Cross-System Breaking-Change Sentinel
 */

import React, { useState, useMemo } from 'react';
import {
  Clock,
  TrendingUp,
  BarChart3,
  Layers,
  Play,
  Pause,
  SlidersHorizontal,
  ChevronDown,
  Maximize2,
  Minimize2,
  Zap,
  Activity,
} from 'lucide-react';
import {
  type TimeRange,
  type ChartTypeResponseTime,
  type MetricTypeLatency,
  type TimeSeriesPoint,
} from '../../types/widgets.ts';

interface ResponseTimeWidgetProps {
  data: TimeSeriesPoint[];
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  isLive: boolean;
  onToggleLive: () => void;
  targetSlaMs?: number;
  className?: string;
  onOpenCode?: () => void;
}

export const ResponseTimeWidget: React.FC<ResponseTimeWidgetProps> = ({
  data,
  timeRange,
  onTimeRangeChange,
  isLive,
  onToggleLive,
  targetSlaMs = 200,
  className = '',
  onOpenCode,
}) => {
  const [chartType, setChartType] = useState<ChartTypeResponseTime>('line');
  const [selectedMetric, setSelectedMetric] = useState<MetricTypeLatency>('overall');
  const [showSlaLine, setShowSlaLine] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // SVG Geometry Dimensions
  const svgWidth = 700;
  const svgHeight = 220;
  const padding = { top: 20, right: 25, bottom: 35, left: 45 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  // Compute Scales
  const { maxVal, minVal, pointsWithCoords } = useMemo(() => {
    if (!data || data.length === 0) {
      return { maxVal: 300, minVal: 0, pointsWithCoords: [] };
    }

    let max = 0;
    data.forEach((d) => {
      const val =
        selectedMetric === 'overall'
          ? d.responseTimeMs
          : selectedMetric === 'agentReasoning'
          ? d.agentReasoningMs
          : selectedMetric === 'mcpTraversal'
          ? d.mcpTraversalMs
          : Math.max(d.responseTimeMs, d.p99);
      if (val > max) max = val;
    });

    // Ensure SLA threshold is visible if enabled
    if (showSlaLine && targetSlaMs > max) {
      max = targetSlaMs * 1.15;
    }

    const calculatedMax = Math.ceil((max * 1.15) / 20) * 20 || 200;
    const min = 0;

    const coords = data.map((d, index) => {
      const x = padding.left + (index / Math.max(1, data.length - 1)) * graphWidth;

      const getMetricVal = (metric: MetricTypeLatency) => {
        if (metric === 'overall') return d.responseTimeMs;
        if (metric === 'agentReasoning') return d.agentReasoningMs;
        if (metric === 'mcpTraversal') return d.mcpTraversalMs;
        return d.responseTimeMs;
      };

      const yVal = getMetricVal(selectedMetric);
      const y = padding.top + graphHeight - ((yVal - min) / (calculatedMax - min)) * graphHeight;

      // Also compute secondary coordinates for percentile bands / multi-metric
      const yP50 = padding.top + graphHeight - ((d.p50 - min) / (calculatedMax - min)) * graphHeight;
      const yP99 = padding.top + graphHeight - ((d.p99 - min) / (calculatedMax - min)) * graphHeight;
      const yAgent = padding.top + graphHeight - ((d.agentReasoningMs - min) / (calculatedMax - min)) * graphHeight;
      const yMcp = padding.top + graphHeight - ((d.mcpTraversalMs - min) / (calculatedMax - min)) * graphHeight;

      return {
        ...d,
        x,
        y,
        yP50,
        yP99,
        yAgent,
        yMcp,
      };
    });

    return { maxVal: calculatedMax, minVal: min, pointsWithCoords: coords };
  }, [data, selectedMetric, graphWidth, graphHeight, padding.left, padding.top, showSlaLine, targetSlaMs]);

  // Construct SVG Bezier Paths
  const linePath = useMemo(() => {
    if (pointsWithCoords.length === 0) return '';
    return pointsWithCoords.reduce((path, pt, i, arr) => {
      if (i === 0) return `M ${pt.x},${pt.y}`;
      const prev = arr[i - 1];
      const cx1 = prev.x + (pt.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (pt.x - prev.x) / 2;
      const cy2 = pt.y;
      return `${path} C ${cx1},${cy1} ${cx2},${cy2} ${pt.x},${pt.y}`;
    }, '');
  }, [pointsWithCoords]);

  const areaPath = useMemo(() => {
    if (pointsWithCoords.length === 0) return '';
    const first = pointsWithCoords[0];
    const last = pointsWithCoords[pointsWithCoords.length - 1];
    const baselineY = padding.top + graphHeight;
    return `${linePath} L ${last.x},${baselineY} L ${first.x},${baselineY} Z`;
  }, [linePath, pointsWithCoords, padding.top, graphHeight]);

  const p99LinePath = useMemo(() => {
    if (pointsWithCoords.length === 0) return '';
    return pointsWithCoords.reduce((path, pt, i, arr) => {
      if (i === 0) return `M ${pt.x},${pt.yP99}`;
      const prev = arr[i - 1];
      const cx = (prev.x + pt.x) / 2;
      return `${path} C ${cx},${prev.yP99} ${cx},${pt.yP99} ${pt.x},${pt.yP99}`;
    }, '');
  }, [pointsWithCoords]);

  const slaY = padding.top + graphHeight - ((targetSlaMs - minVal) / (maxVal - minVal)) * graphHeight;

  // Current hovered or latest point
  const activePoint =
    hoveredIndex !== null && pointsWithCoords[hoveredIndex]
      ? pointsWithCoords[hoveredIndex]
      : pointsWithCoords[pointsWithCoords.length - 1] || null;

  const currentVal = activePoint
    ? selectedMetric === 'overall'
      ? activePoint.responseTimeMs
      : selectedMetric === 'agentReasoning'
      ? activePoint.agentReasoningMs
      : selectedMetric === 'mcpTraversal'
      ? activePoint.mcpTraversalMs
      : activePoint.responseTimeMs
    : 0;

  return (
    <div
      className={`bg-slate-900/80 border border-slate-800 rounded-xl shadow-xl transition-all w-full max-w-full min-w-0 overflow-hidden ${
        isExpanded ? 'fixed inset-4 z-50 overflow-auto bg-slate-950/95 p-4 sm:p-6 backdrop-blur-xl' : 'p-3.5 sm:p-5'
      } ${className}`}
    >
      {/* Top Header & Interactive Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/90 border border-cyan-800 flex items-center justify-center text-cyan-400 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-slate-100 truncate">Conversational Response Times</h3>
              {isLive && (
                <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-1.5 py-0.5 rounded shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE STREAM
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 truncate">P50/P90/P99 latency distribution & reasoning performance</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Chart Type Segmented Control */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setChartType('line')}
              className={`p-1.5 rounded transition-colors ${
                chartType === 'line' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Line Chart"
              aria-label="Line Chart"
            >
              <TrendingUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`p-1.5 rounded transition-colors ${
                chartType === 'bar' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Bar Chart"
              aria-label="Bar Chart"
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType('area')}
              className={`p-1.5 rounded transition-colors ${
                chartType === 'area' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Percentile Area"
              aria-label="Percentile Area"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            {(['15m', '1h', '6h', '24h', 'LIVE'] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => onTimeRangeChange(r)}
                className={`px-2 py-1 rounded transition-colors ${
                  timeRange === r
                    ? 'bg-slate-800 text-cyan-300 font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Live Stream Play/Pause Toggle */}
          <button
            onClick={onToggleLive}
            className={`p-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition-all ${
              isLive
                ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300 hover:bg-emerald-900'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title={isLive ? 'Pause Live Stream' : 'Start Live Stream'}
          >
            {isLive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          {/* Example Code Modal Trigger */}
          {onOpenCode && (
            <button
              onClick={onOpenCode}
              className="px-2.5 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-300 text-xs font-mono flex items-center gap-1 transition-all"
              title="View & Copy Component Example Code"
            >
              <span className="text-cyan-400 font-bold">&lt;/&gt;</span> Code
            </button>
          )}

          {/* Fullscreen Expand */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title={isExpanded ? 'Exit Fullscreen' : 'Expand Widget'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Metric Selector & Quick Stats Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mt-3 pt-1">
        {/* Metric Segmented Filters */}
        <div className="flex items-center gap-1 p-1 bg-slate-950/80 rounded-lg border border-slate-800/80 text-xs flex-wrap">
          <button
            onClick={() => setSelectedMetric('overall')}
            className={`px-2.5 py-1 rounded transition-colors ${
              selectedMetric === 'overall' ? 'bg-cyan-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Total Latency
          </button>
          <button
            onClick={() => setSelectedMetric('agentReasoning')}
            className={`px-2.5 py-1 rounded transition-colors ${
              selectedMetric === 'agentReasoning'
                ? 'bg-indigo-600 text-white font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Agent Reasoning
          </button>
          <button
            onClick={() => setSelectedMetric('mcpTraversal')}
            className={`px-2.5 py-1 rounded transition-colors ${
              selectedMetric === 'mcpTraversal'
                ? 'bg-amber-600 text-white font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            MCP Traversal
          </button>
        </div>

        {/* Current Active Metric Telemetry Reading */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <div className="flex items-baseline gap-1.5">
            <span className="text-slate-400">Current:</span>
            <span className="text-lg font-bold text-cyan-300 tabular-nums">{currentVal}ms</span>
          </div>
          {activePoint && (
            <div className="hidden sm:flex items-center gap-3 text-slate-400 border-l border-slate-800 pl-3">
              <span>P50: <strong className="text-slate-200 tabular-nums">{activePoint.p50}ms</strong></span>
              <span>P90: <strong className="text-slate-200 tabular-nums">{activePoint.p90}ms</strong></span>
              <span>P99: <strong className="text-amber-400 tabular-nums">{activePoint.p99}ms</strong></span>
            </div>
          )}
          <button
            onClick={() => setShowSlaLine(!showSlaLine)}
            className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
              showSlaLine
                ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            SLA: {targetSlaMs}ms
          </button>
        </div>
      </div>

      {/* Main SVG Visualization Canvas */}
      <div className="mt-3 relative w-full h-[220px] bg-slate-950/70 rounded-xl border border-slate-850 overflow-hidden">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full select-none"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="latencyAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
              <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="p99Grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines & Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding.top + graphHeight * (1 - ratio);
            const val = Math.round(minVal + ratio * (maxVal - minVal));
            return (
              <g key={ratio}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={svgWidth - padding.right}
                  y2={y}
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray={ratio === 0 ? 'none' : '3,3'}
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {val}ms
                </text>
              </g>
            );
          })}

          {/* SLA Threshold Target Line */}
          {showSlaLine && slaY >= padding.top && slaY <= padding.top + graphHeight && (
            <g>
              <line
                x1={padding.left}
                y1={slaY}
                x2={svgWidth - padding.right}
                y2={slaY}
                stroke="#f43f5e"
                strokeWidth="1.5"
                strokeDasharray="4,4"
              />
              <text
                x={svgWidth - padding.right}
                y={slaY - 5}
                textAnchor="end"
                fill="#fb7185"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                TARGET SLA ({targetSlaMs}ms)
              </text>
            </g>
          )}

          {/* Chart Geometry: Line vs Bar vs Area */}
          {chartType === 'line' && (
            <>
              <path d={areaPath} fill="url(#latencyAreaGrad)" />
              <path
                d={linePath}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Secondary P99 Line */}
              <path
                d={p99LinePath}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.2"
                strokeDasharray="3,3"
                opacity="0.8"
              />
            </>
          )}

          {chartType === 'area' && (
            <>
              {/* Stacked Percentile Bands */}
              <path d={areaPath} fill="url(#latencyAreaGrad)" />
              <path
                d={linePath}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2"
              />
              <path
                d={p99LinePath}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="3,3"
              />
            </>
          )}

          {chartType === 'bar' && (
            <>
              {pointsWithCoords.map((pt, i) => {
                const barWidth = Math.max(4, Math.min(22, (graphWidth / pointsWithCoords.length) * 0.65));
                const barHeight = Math.max(2, padding.top + graphHeight - pt.y);
                const isHovered = hoveredIndex === i;
                const isOverSla = pt.responseTimeMs > targetSlaMs;

                return (
                  <rect
                    key={i}
                    x={pt.x - barWidth / 2}
                    y={pt.y}
                    width={barWidth}
                    height={barHeight}
                    rx="2"
                    fill={isOverSla ? '#f43f5e' : isHovered ? '#38bdf8' : '#0284c7'}
                    opacity={isHovered ? 1 : 0.85}
                  />
                );
              })}
            </>
          )}

          {/* Data Points (Line & Area) */}
          {(chartType === 'line' || chartType === 'area') &&
            pointsWithCoords.map((pt, i) => {
              const isHovered = hoveredIndex === i;
              const isOverSla = pt.responseTimeMs > targetSlaMs;
              return (
                <circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 5.5 : 2.5}
                  fill={isOverSla ? '#f43f5e' : isHovered ? '#38bdf8' : '#06b6d4'}
                  stroke="#0f172a"
                  strokeWidth={isHovered ? 2 : 1}
                  className="transition-all duration-100"
                />
              );
            })}

          {/* Hover Crosshair & Vertical Guide */}
          {hoveredIndex !== null && pointsWithCoords[hoveredIndex] && (
            <g>
              <line
                x1={pointsWithCoords[hoveredIndex].x}
                y1={padding.top}
                x2={pointsWithCoords[hoveredIndex].x}
                y2={padding.top + graphHeight}
                stroke="#38bdf8"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
              <circle
                cx={pointsWithCoords[hoveredIndex].x}
                cy={pointsWithCoords[hoveredIndex].y}
                r="6"
                fill="#38bdf8"
                stroke="#ffffff"
                strokeWidth="2"
              />
            </g>
          )}

          {/* X-axis Time Labels */}
          {pointsWithCoords.map((pt, i) => {
            // Render every nth label to avoid crowding
            const step = Math.max(1, Math.floor(pointsWithCoords.length / 6));
            if (i % step !== 0 && i !== pointsWithCoords.length - 1) return null;

            return (
              <text
                key={i}
                x={pt.x}
                y={svgHeight - 10}
                textAnchor="middle"
                fill="#64748b"
                fontSize="9"
                fontFamily="monospace"
              >
                {pt.timeLabel}
              </text>
            );
          })}
        </svg>

        {/* Invisible Overlay for Mouse / Touch Event Detection */}
        <div
          className="absolute inset-0 cursor-crosshair"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = (e.clientX - rect.left) / rect.width;
            const targetX = relX * svgWidth;

            // Find closest data point
            let closestIdx = 0;
            let minDist = Infinity;
            pointsWithCoords.forEach((p, idx) => {
              const dist = Math.abs(p.x - targetX);
              if (dist < minDist) {
                minDist = dist;
                closestIdx = idx;
              }
            });
            setHoveredIndex(closestIdx);
          }}
          onMouseLeave={() => setHoveredIndex(null)}
          onTouchMove={(e) => {
            if (e.touches[0]) {
              const rect = e.currentTarget.getBoundingClientRect();
              const relX = (e.touches[0].clientX - rect.left) / rect.width;
              const targetX = relX * svgWidth;
              let closestIdx = 0;
              let minDist = Infinity;
              pointsWithCoords.forEach((p, idx) => {
                const dist = Math.abs(p.x - targetX);
                if (dist < minDist) {
                  minDist = dist;
                  closestIdx = idx;
                }
              });
              setHoveredIndex(closestIdx);
            }
          }}
        />

        {/* Floating Tooltip Card */}
        {activePoint && hoveredIndex !== null && (
          <div
            style={{
              left: `${Math.min(
                Math.max(10, (activePoint.x / svgWidth) * 100),
                78
              )}%`,
              top: '12px',
            }}
            className="pointer-events-none absolute z-30 bg-slate-900/95 border border-slate-700/80 rounded-lg p-2.5 shadow-2xl backdrop-blur-md text-[11px] font-sans min-w-[170px]"
          >
            <div className="flex items-center justify-between text-slate-400 font-mono text-[10px] pb-1 border-b border-slate-800">
              <span>{activePoint.timeLabel}</span>
              <span className="text-cyan-400">{activePoint.activeService}</span>
            </div>
            <div className="mt-1.5 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Total Latency:</span>
                <span className="font-mono font-bold text-cyan-300">{activePoint.responseTimeMs}ms</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-400">Agent Reasoning:</span>
                <span className="font-mono text-indigo-300">{activePoint.agentReasoningMs}ms</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-400">MCP Traversal:</span>
                <span className="font-mono text-amber-300">{activePoint.mcpTraversalMs}ms</span>
              </div>
              <div className="flex justify-between items-center text-[10px] pt-1 border-t border-slate-800/80">
                <span className="text-slate-400">Throughput:</span>
                <span className="font-mono text-emerald-400">{activePoint.throughputRps} rps</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Telemetry Legend & Insight Bar */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 mt-3 pt-2 border-t border-slate-800/70">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-cyan-400 rounded-full" />
            <span className="text-[11px]">Nominal (P50/Mean)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 border-t border-dashed border-amber-400" />
            <span className="text-[11px]">P99 Latency Tail</span>
          </div>
          {showSlaLine && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 border-t border-dashed border-rose-400" />
              <span className="text-[11px]">SLA Threshold</span>
            </div>
          )}
        </div>

        <div className="text-[11px] font-mono text-slate-500">
          Sampled across <strong className="text-slate-300">{data.length}</strong> time intervals
        </div>
      </div>
    </div>
  );
};
