/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Real-Time Agent Logs & Telemetry Stream Widget
 * ChronoGraph - Autonomous Cross-System Breaking-Change Sentinel
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Terminal,
  Play,
  Pause,
  Search,
  Filter,
  Download,
  Copy,
  Check,
  RotateCw,
  Maximize2,
  Minimize2,
  X,
  ChevronRight,
  Code,
  Layers,
} from 'lucide-react';
import {
  type LogLevel,
  type StructuredLogEntry as LogEntry,
} from '../../../lib/logger.ts';

interface AgentLogsStreamWidgetProps {
  logs: LogEntry[];
  onRefresh: () => void;
  className?: string;
}

export const AgentLogsStreamWidget: React.FC<AgentLogsStreamWidgetProps> = ({
  logs,
  onRefresh,
  className = '',
}) => {
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [filterService, setFilterService] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Auto-refresh when live streaming is enabled
  useEffect(() => {
    if (!isLiveStreaming) return;
    const interval = setInterval(() => {
      onRefresh();
    }, 2500);
    return () => clearInterval(interval);
  }, [isLiveStreaming, onRefresh]);

  // Unique services list
  const servicesList = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.service) set.add(l.service);
    });
    return ['ALL', ...Array.from(set)];
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (filterLevel !== 'ALL' && l.level !== filterLevel) return false;
      if (filterService !== 'ALL' && l.service !== filterService) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inMsg = l.message?.toLowerCase().includes(q);
        const inEvent = l.event?.toLowerCase().includes(q);
        const inTrace = l.traceId?.toLowerCase().includes(q);
        const inService = l.service?.toLowerCase().includes(q);
        if (!inMsg && !inEvent && !inTrace && !inService) return false;
      }
      return true;
    });
  }, [logs, filterLevel, filterService, searchQuery]);

  // Log Frequency Sparkline (frequency distribution of recent 20 slots)
  const sparklineData = useMemo(() => {
    const slots = 20;
    const counts = new Array(slots).fill(0);
    const now = Date.now();
    const windowMs = 60 * 1000 * 30; // 30 minutes
    logs.forEach((l) => {
      const age = now - new Date(l.timestamp).getTime();
      if (age >= 0 && age < windowMs) {
        const slotIdx = Math.min(slots - 1, Math.floor((1 - age / windowMs) * slots));
        counts[slotIdx]++;
      }
    });
    const max = Math.max(1, ...counts);
    return counts.map((c) => ({ count: c, heightPct: Math.round((c / max) * 100) }));
  }, [logs]);

  const handleCopyLog = (log: LogEntry) => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sentinel_logs_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLevelBadge = (level: LogLevel) => {
    switch (level) {
      case 'AUDIT':
        return 'bg-purple-950 text-purple-300 border-purple-800';
      case 'ERROR':
        return 'bg-rose-950 text-rose-300 border-rose-800';
      case 'WARN':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      case 'INFO':
        return 'bg-cyan-950 text-cyan-300 border-cyan-800';
      case 'DEBUG':
        return 'bg-slate-900 text-slate-400 border-slate-700';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div
      className={`bg-slate-900/80 border border-slate-800 rounded-xl shadow-xl flex flex-col transition-all ${
        isExpanded ? 'fixed inset-4 z-50 overflow-hidden bg-slate-950/95 p-6 backdrop-blur-xl' : 'p-4 sm:p-5'
      } ${className}`}
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-950/90 border border-indigo-800 flex items-center justify-center text-indigo-400">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-100">Autonomous Agent Audit & Log Stream</h3>
              {isLiveStreaming ? (
                <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-1.5 py-0.5 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
                </span>
              ) : (
                <span className="text-[10px] font-mono text-slate-400 bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded">
                  PAUSED
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">Structured telemetry, MCP hops, and reasoning traces</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Live Stream Toggle */}
          <button
            onClick={() => setIsLiveStreaming(!isLiveStreaming)}
            className={`p-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition-all ${
              isLiveStreaming
                ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300 hover:bg-emerald-900'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title={isLiveStreaming ? 'Pause live streaming' : 'Resume live streaming'}
          >
            {isLiveStreaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          {/* Manual Refresh */}
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Refresh logs"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          {/* Export JSON */}
          <button
            onClick={handleExportJson}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Download logs as JSON"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Export</span>
          </button>

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

      {/* Toolbar: Search, Level filter, Service filter & Log Sparkline */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-1">
        {/* Left: Search & Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[140px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search traces, events, fields..."
              className="w-full bg-slate-950 text-slate-200 text-xs rounded-lg pl-8 pr-3 py-1.5 border border-slate-800 focus:outline-none focus:border-cyan-500 placeholder:text-slate-500 font-mono"
            />
          </div>

          {/* Level Filter Tabs */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-mono">
            {['ALL', 'AUDIT', 'WARN', 'ERROR', 'INFO'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`px-2 py-1 rounded transition-colors ${
                  filterLevel === lvl
                    ? 'bg-slate-800 text-cyan-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Service Dropdown */}
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-xs">
            <span className="text-slate-400 text-[11px]">Service:</span>
            <select
              value={filterService}
              onChange={(e) => setFilterService(e.target.value)}
              className="bg-transparent text-slate-200 font-mono text-[11px] focus:outline-none cursor-pointer"
            >
              {servicesList.map((svc) => (
                <option key={svc} value={svc} className="bg-slate-900 text-slate-200">
                  {svc}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Log Velocity Sparkline */}
        <div className="flex items-center gap-2 pl-2">
          <div className="text-[10px] font-mono text-slate-400 text-right">
            <div>Log Velocity</div>
            <div className="text-slate-200 font-bold">{filteredLogs.length} events</div>
          </div>
          <div className="flex items-end gap-0.5 h-6 w-24 bg-slate-950 p-1 rounded border border-slate-850">
            {sparklineData.map((slot, sIdx) => (
              <div
                key={sIdx}
                className="w-1 bg-cyan-500 rounded-xs transition-all"
                style={{ height: `${Math.max(15, slot.heightPct)}%` }}
                title={`${slot.count} logs`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Log Stream Console */}
      <div className="mt-3 flex-1 min-h-[220px] max-h-[360px] overflow-y-auto rounded-xl bg-slate-950/90 border border-slate-850 p-2 font-mono text-xs space-y-1 select-text">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs font-mono">
            No agent logs match the current filters.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isSelected = selectedLog?.id === log.id;
            const timeFormatted = new Date(log.timestamp).toLocaleTimeString();

            return (
              <div
                key={log.id}
                onClick={() => setSelectedLog(isSelected ? null : log)}
                className={`p-2 rounded-lg border transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 ${
                  isSelected
                    ? 'bg-slate-900 border-cyan-500/80 ring-1 ring-cyan-500/40'
                    : 'bg-slate-950/60 border-slate-850/60 hover:bg-slate-900/50 hover:border-slate-800'
                }`}
              >
                {/* Left Meta & Message */}
                <div className="flex items-baseline gap-2 flex-1 min-w-0">
                  <span className="text-[10px] text-slate-500 shrink-0 tabular-nums">{timeFormatted}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 border ${getLevelBadge(
                      log.level
                    )}`}
                  >
                    {log.level}
                  </span>
                  <span className="text-[11px] text-cyan-400 font-semibold shrink-0 truncate max-w-[120px]">
                    {log.event}
                  </span>
                  <span className="text-slate-300 truncate text-[11px]">{log.message}</span>
                </div>

                {/* Right Badges: Duration, Trace, Actions */}
                <div className="flex items-center gap-2 shrink-0 text-[10px] text-slate-400 self-end sm:self-auto">
                  {log.durationMs !== undefined && (
                    <span className="text-amber-400 font-semibold tabular-nums">{log.durationMs}ms</span>
                  )}
                  <span className="text-slate-500 truncate max-w-[80px]" title={log.traceId}>
                    {log.traceId}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyLog(log);
                    }}
                    className="p-1 hover:text-cyan-400 transition-colors"
                    title="Copy log entry JSON"
                  >
                    {copiedId === log.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Selected Log Structured Detail Drawer */}
      {selectedLog && (
        <div className="mt-3 p-3.5 rounded-xl bg-slate-950 border border-cyan-800/60 text-xs animate-fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-slate-200">Trace Inspection: {selectedLog.event}</span>
              <span className="text-[10px] font-mono text-slate-400">({selectedLog.traceId})</span>
            </div>
            <button
              onClick={() => setSelectedLog(null)}
              className="p-1 text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px] mb-2 text-slate-300">
            <div>
              <span className="text-slate-500">Service:</span> {selectedLog.service}
            </div>
            <div>
              <span className="text-slate-500">Timestamp:</span> {selectedLog.timestamp}
            </div>
            {selectedLog.durationMs !== undefined && (
              <div>
                <span className="text-slate-500">Latency:</span>{' '}
                <span className="text-amber-400">{selectedLog.durationMs}ms</span>
              </div>
            )}
          </div>

          {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
            <div className="mt-2">
              <span className="text-slate-500 text-[10px] font-mono uppercase block mb-1">Context Payload:</span>
              <pre className="bg-slate-900/90 rounded-lg p-2.5 text-[11px] font-mono text-cyan-200 overflow-x-auto border border-slate-800">
                {JSON.stringify(selectedLog.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
