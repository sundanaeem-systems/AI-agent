/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Success Rates & Error Frequency Heatmap Widget
 * ChronoGraph - Autonomous Cross-System Breaking-Change Sentinel
 */

import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Grid,
  BarChart3,
  PieChart,
  Filter,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Info,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  type TimeRange,
  type ChartTypeSuccessRate,
  type HeatmapRow,
  type HeatmapCell,
  type ErrorCategoryBreakdown,
} from '../../types/widgets.ts';

interface SuccessRateHeatmapWidgetProps {
  squadHeatmap: HeatmapRow[];
  errorCategories: ErrorCategoryBreakdown[];
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  className?: string;
  onOpenCode?: () => void;
}

export const SuccessRateHeatmapWidget: React.FC<SuccessRateHeatmapWidgetProps> = ({
  squadHeatmap,
  errorCategories,
  timeRange,
  onTimeRangeChange,
  className = '',
  onOpenCode,
}) => {
  const [chartType, setChartType] = useState<ChartTypeSuccessRate>('heatmap');
  const [selectedSquad, setSelectedSquad] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);
  const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Filtered heatmap rows
  const filteredRows = useMemo(() => {
    let rows = squadHeatmap;
    if (selectedSquad !== 'ALL') {
      rows = rows.filter((r) => r.squad === selectedSquad);
    }
    return rows;
  }, [squadHeatmap, selectedSquad]);

  // Overall metrics calculation
  const stats = useMemo(() => {
    let totalCells = 0;
    let nominalCells = 0;
    let warningCells = 0;
    let criticalCells = 0;
    let totalIncidents = 0;

    squadHeatmap.forEach((row) => {
      row.cells.forEach((c) => {
        totalCells++;
        totalIncidents += c.incidentCount;
        if (c.status === 'nominal') nominalCells++;
        else if (c.status === 'warning') warningCells++;
        else if (c.status === 'critical') criticalCells++;
      });
    });

    const successPct = totalCells > 0 ? Number(((nominalCells / totalCells) * 100).toFixed(1)) : 100;
    return { successPct, totalIncidents, criticalCells, warningCells };
  }, [squadHeatmap]);

  // Heatmap color mapper
  const getCellColor = (cell: HeatmapCell) => {
    if (selectedSeverity !== 'ALL') {
      if (selectedSeverity === 'critical' && cell.status !== 'critical') return 'bg-slate-900 opacity-20';
      if (selectedSeverity === 'warning' && cell.status !== 'warning') return 'bg-slate-900 opacity-20';
      if (selectedSeverity === 'nominal' && cell.status !== 'nominal') return 'bg-slate-900 opacity-20';
    }

    if (cell.errorDensity === 0) {
      return 'bg-emerald-950/70 hover:bg-emerald-900/90 text-emerald-400 border border-emerald-900/50';
    }
    if (cell.errorDensity <= 2) {
      return 'bg-emerald-800/80 hover:bg-emerald-700 text-emerald-200 border border-emerald-700';
    }
    if (cell.errorDensity <= 5) {
      return 'bg-amber-900/80 hover:bg-amber-800 text-amber-200 border border-amber-700';
    }
    if (cell.errorDensity <= 8) {
      return 'bg-rose-900/90 hover:bg-rose-800 text-rose-100 border border-rose-700';
    }
    return 'bg-rose-700 hover:bg-rose-600 text-white border border-rose-500 shadow-md shadow-rose-950/50';
  };

  const squadsList = ['ALL', ...squadHeatmap.map((r) => r.squad)];

  return (
    <div
      className={`bg-slate-900/80 border border-slate-800 rounded-xl shadow-xl transition-all w-full max-w-full min-w-0 overflow-hidden ${
        isExpanded ? 'fixed inset-4 z-50 overflow-auto bg-slate-950/95 p-4 sm:p-6 backdrop-blur-xl' : 'p-3.5 sm:p-5'
      } ${className}`}
    >
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-950/90 border border-emerald-800 flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-slate-100 truncate">Contract Success & Error Matrix</h3>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 shrink-0">
                Multi-Squad
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate">Real-time error frequency distribution & blast radius hotspots</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Chart Type Segmented Control */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setChartType('heatmap')}
              className={`p-1.5 rounded transition-colors ${
                chartType === 'heatmap' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Heatmap Matrix View"
              aria-label="Heatmap Matrix"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`p-1.5 rounded transition-colors ${
                chartType === 'bar' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Error Frequency Bar Chart"
              aria-label="Error Frequency Bar Chart"
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType('donut')}
              className={`p-1.5 rounded transition-colors ${
                chartType === 'donut' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Reliability Summary"
              aria-label="Reliability Summary"
            >
              <PieChart className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            {(['1h', '6h', '24h', '7d'] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => onTimeRangeChange(r)}
                className={`px-2 py-1 rounded transition-colors ${
                  timeRange === r
                    ? 'bg-slate-800 text-emerald-300 font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Example Code Modal Trigger */}
          {onOpenCode && (
            <button
              onClick={onOpenCode}
              className="px-2.5 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-300 text-xs font-mono flex items-center gap-1 transition-all"
              title="View & Copy Component Example Code"
            >
              <span className="text-emerald-400 font-bold">&lt;/&gt;</span> Code
            </button>
          )}

          {/* Expand Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title={isExpanded ? 'Exit Fullscreen' : 'Expand Widget'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Filter Toolbar & High-Level KPIs */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-1">
        {/* Squad & Severity Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
            <Filter className="w-3 h-3 text-slate-400" />
            <span className="text-slate-400">Squad:</span>
            <select
              value={selectedSquad}
              onChange={(e) => setSelectedSquad(e.target.value)}
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer pr-1"
            >
              {squadsList.map((sq) => (
                <option key={sq} value={sq} className="bg-slate-900 text-slate-200">
                  {sq === 'ALL' ? 'All Consumer Squads' : sq}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setSelectedSeverity('ALL')}
              className={`px-2 py-0.5 rounded transition-colors ${
                selectedSeverity === 'ALL' ? 'bg-slate-800 text-slate-200 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedSeverity('critical')}
              className={`px-2 py-0.5 rounded transition-colors ${
                selectedSeverity === 'critical' ? 'bg-rose-950 text-rose-300 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Critical
            </button>
            <button
              onClick={() => setSelectedSeverity('warning')}
              className={`px-2 py-0.5 rounded transition-colors ${
                selectedSeverity === 'warning' ? 'bg-amber-950 text-amber-300 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Warning
            </button>
          </div>
        </div>

        {/* Quick KPI pills */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-baseline gap-1.5">
            <span className="text-slate-400">Success Rate:</span>
            <span className="text-lg font-bold text-emerald-400 tabular-nums">{stats.successPct}%</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-slate-400">Blockers:</span>
            <span className="text-sm font-bold text-rose-400 tabular-nums">{stats.criticalCells}</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mt-3">
        {chartType === 'heatmap' && (
          <div className="w-full bg-slate-950/80 rounded-xl border border-slate-850 p-3 sm:p-4 overflow-x-auto">
            {/* Heatmap Grid */}
            <div className="min-w-[580px] space-y-2">
              {/* Column Time Headers */}
              {filteredRows.length > 0 && (
                <div className="grid grid-cols-12 gap-1.5 pl-36 pr-1 pb-1 border-b border-slate-850 text-[10px] font-mono text-slate-500">
                  {filteredRows[0].cells.map((cell, idx) => (
                    <div key={idx} className="text-center truncate">
                      {cell.timeBucket}
                    </div>
                  ))}
                </div>
              )}

              {/* Rows */}
              {filteredRows.map((row) => (
                <div key={row.squad} className="flex items-center gap-2">
                  {/* Squad Name Label */}
                  <div className="w-34 shrink-0 text-xs font-mono text-slate-300 truncate" title={row.squad}>
                    {row.squad}
                  </div>

                  {/* Heatmap Cells */}
                  <div className="grid grid-cols-12 gap-1.5 flex-1">
                    {row.cells.map((cell, cIdx) => {
                      const isHovered = hoveredCell === cell;
                      const isSelected = selectedCell === cell;

                      return (
                        <button
                          key={cIdx}
                          onMouseEnter={() => setHoveredCell(cell)}
                          onMouseLeave={() => setHoveredCell(null)}
                          onClick={() => setSelectedCell(isSelected ? null : cell)}
                          className={`h-7 rounded flex items-center justify-center font-mono text-[10px] font-semibold transition-all duration-150 relative ${getCellColor(
                            cell
                          )} ${isHovered || isSelected ? 'ring-2 ring-cyan-400 scale-110 z-10' : ''}`}
                        >
                          {cell.incidentCount > 0 ? cell.incidentCount : '·'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Hovered or Selected Cell Inspector Drawer / Card */}
            {(hoveredCell || selectedCell) && (
              <div className="mt-3 p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      (hoveredCell || selectedCell)?.status === 'critical'
                        ? 'bg-rose-500'
                        : (hoveredCell || selectedCell)?.status === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                  />
                  <div>
                    <span className="font-semibold text-slate-200">
                      {(hoveredCell || selectedCell)?.squad}
                    </span>{' '}
                    <span className="text-slate-400">at {(hoveredCell || selectedCell)?.timeBucket}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono">
                  <span className="text-slate-400">
                    Incidents:{' '}
                    <strong className="text-slate-200">{(hoveredCell || selectedCell)?.incidentCount}</strong>
                  </span>
                  {(hoveredCell || selectedCell)?.details?.contractDelta && (
                    <span className="text-slate-400">
                      Delta: <strong className="text-amber-300">{(hoveredCell || selectedCell)?.details?.contractDelta}</strong>
                    </span>
                  )}
                  {(hoveredCell || selectedCell)?.details?.lastErrorField && (
                    <span className="text-slate-400">
                      Field: <strong className="text-rose-300">{(hoveredCell || selectedCell)?.details?.lastErrorField}</strong>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {chartType === 'bar' && (
          <div className="w-full bg-slate-950/80 rounded-xl border border-slate-850 p-4 space-y-3">
            <div className="text-xs text-slate-400 font-medium">Error Frequency by Contract Breakage Category:</div>
            <div className="space-y-2.5">
              {errorCategories.map((cat) => (
                <div key={cat.category} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-200 flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          cat.severity === 'CRITICAL_BLOCKER'
                            ? 'bg-rose-500'
                            : cat.severity === 'HIGH_RISK'
                            ? 'bg-amber-500'
                            : 'bg-indigo-400'
                        }`}
                      />
                      {cat.category}
                    </span>
                    <span className="font-mono text-slate-400">
                      <strong className="text-slate-200">{cat.count}</strong> incidents ({cat.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all duration-500 ${
                        cat.severity === 'CRITICAL_BLOCKER'
                          ? 'bg-rose-500'
                          : cat.severity === 'HIGH_RISK'
                          ? 'bg-amber-500'
                          : 'bg-indigo-500'
                      }`}
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 pl-4">{cat.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {chartType === 'donut' && (
          <div className="w-full bg-slate-950/80 rounded-xl border border-slate-850 p-5 flex flex-col md:flex-row items-center justify-around gap-6">
            {/* Circular Gauge */}
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#1e293b" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#10b981"
                  strokeWidth="8"
                  strokeDasharray={`${(stats.successPct / 100) * 251.2} 251.2`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
                <span className="text-2xl font-bold text-emerald-400">{stats.successPct}%</span>
                <span className="text-[10px] text-slate-400">Compliance</span>
              </div>
            </div>

            {/* Breakdown Cards */}
            <div className="grid grid-cols-2 gap-3 max-w-md w-full">
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <div className="text-[11px] text-slate-400">Total Intercepted</div>
                <div className="text-xl font-bold font-mono text-cyan-300 mt-1">{stats.totalIncidents}</div>
                <div className="text-[10px] text-slate-500">Autonomous Sentinel blocks</div>
              </div>
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <div className="text-[11px] text-slate-400">Zero-Downtime Patches</div>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-1">100%</div>
                <div className="text-[10px] text-slate-500">Backward dual-write adapters</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend Bar */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 mt-3 pt-2 border-t border-slate-800/70">
        <div className="flex items-center gap-3">
          <span className="text-[11px]">Error Density:</span>
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded bg-emerald-950 border border-emerald-800" />
            <span className="text-[10px] font-mono">0 (Nominal)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded bg-amber-900 border border-amber-700" />
            <span className="text-[10px] font-mono">1-5 (Warn)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded bg-rose-700 border border-rose-500" />
            <span className="text-[10px] font-mono">&gt;5 (Blocker)</span>
          </div>
        </div>

        <div className="text-[11px] font-mono text-slate-500">
          Monitoring <strong className="text-slate-300">{squadHeatmap.length}</strong> downstream squads
        </div>
      </div>
    </div>
  );
};
