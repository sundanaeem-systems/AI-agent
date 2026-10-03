/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Interactive Multi-Hop System Dependency Graph Viewer (Fully Responsive & Advanced)
 * ChronoGraph - Autonomous Cross-System Breaking-Change Sentinel
 */

import React, { useState, useMemo } from 'react';
import {
  Layers,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  MoveHorizontal,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Filter,
} from 'lucide-react';

interface Node {
  id: string;
  name: string;
  slug: string;
  tier: string;
  team: string;
  protocol: string;
  status: string;
  hopDistance: number;
  endpoints?: any[];
  impactCriticality?: string;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  label: string;
  protocol: string;
  criticality: string;
  consumedFields: string[];
}

interface GraphCanvasProps {
  nodes: Node[];
  edges: Edge[];
  selectedNode: Node | null;
  onSelectNode: (node: Node) => void;
  blastRadiusNodeIds?: string[];
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  nodes,
  edges,
  selectedNode,
  onSelectNode,
  blastRadiusNodeIds = [],
}) => {
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [hopFilter, setHopFilter] = useState<'all' | 'direct' | 'transitive'>('all');

  // Filtered nodes based on hop selection
  const filteredNodes = useMemo(() => {
    if (hopFilter === 'direct') return nodes.filter((n) => n.hopDistance <= 1);
    if (hopFilter === 'transitive') return nodes.filter((n) => n.hopDistance === 0 || n.hopDistance >= 2);
    return nodes;
  }, [nodes, hopFilter]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  const filteredEdges = useMemo(() => {
    return edges.filter((e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target));
  }, [edges, filteredNodeIds]);

  // Layout calculations: generous bounds to prevent any element clipping
  const canvasWidth = 720;
  const canvasHeight = 390;

  const hops = [0, 1, 2, 3, 4];
  const hopGroups = hops.map((h) => filteredNodes.filter((n) => n.hopDistance === h));

  // Compute node coordinates with generous margins
  const nodeCoords = useMemo(() => {
    const coords = new Map<string, { x: number; y: number }>();
    hopGroups.forEach((group, hopIndex) => {
      const totalInHop = group.length;
      const x = 85 + hopIndex * 140;

      group.forEach((node, idx) => {
        const topMargin = 55;
        const availableHeight = canvasHeight - 110;
        const stepY = totalInHop > 1 ? availableHeight / (totalInHop - 1) : availableHeight / 2;
        const y = totalInHop > 1 ? topMargin + stepY * idx : topMargin + availableHeight / 2;
        coords.set(node.id, { x, y });
      });
    });
    return coords;
  }, [filteredNodes, hopGroups, canvasHeight]);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(1.4, Number((z + 0.1).toFixed(1))));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.7, Number((z - 0.1).toFixed(1))));
  const handleZoomReset = () => setZoomLevel(1);

  return (
    <div className="relative w-full max-w-full bg-slate-950/90 rounded-xl border border-slate-800 overflow-hidden flex flex-col justify-between select-none shadow-xl">
      {/* Top Legend & Tool Bar - Fully Responsive Wrap */}
      <div className="z-10 px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-sm">
        {/* Left: Indicator Legends */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="flex items-center gap-1.5 font-mono text-cyan-400 font-semibold">
            <Layers className="w-3.5 h-3.5" /> GROQ Graph
          </span>
          <span className="hidden sm:inline text-slate-700">|</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-500/20" /> Tier 0 Critical
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500" /> Tier 1
          </span>
        </div>

        {/* Right: Hop Filter & Zoom Controls */}
        <div className="flex items-center gap-2">
          {/* Hop Filter Pill */}
          <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-[10px] font-mono">
            <button
              onClick={() => setHopFilter('all')}
              className={`px-2 py-0.5 rounded transition-all ${
                hopFilter === 'all' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setHopFilter('direct')}
              className={`px-2 py-0.5 rounded transition-all ${
                hopFilter === 'direct' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hop 1
            </button>
            <button
              onClick={() => setHopFilter('transitive')}
              className={`px-2 py-0.5 rounded transition-all ${
                hopFilter === 'transitive' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hop 2+
            </button>
          </div>

          {/* Zoom Buttons */}
          <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-slate-400">
            <button
              onClick={handleZoomIn}
              className="p-1 hover:text-cyan-400 transition-colors"
              title="Zoom In"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1 hover:text-cyan-400 transition-colors"
              title="Zoom Out"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            {zoomLevel !== 1 && (
              <button
                onClick={handleZoomReset}
                className="px-1 text-[10px] font-mono hover:text-cyan-400 transition-colors"
                title="Reset Zoom"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Container on Mobile with Touch Scrolling */}
      <div className="overflow-x-auto w-full max-w-full relative touch-pan-x">
        <div
          style={{
            minWidth: `${canvasWidth * zoomLevel}px`,
            width: `${canvasWidth * zoomLevel}px`,
            height: `${canvasHeight * zoomLevel}px`,
            transformOrigin: 'top left',
          }}
          className="relative transition-all duration-150"
        >
          {/* Background Grid Pattern */}
          <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* SVG Canvas for Edges */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <linearGradient id="edgeGradDefault" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id="edgeGradCritical" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#fb7185" stopOpacity="0.7" />
              </linearGradient>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="22"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
              </marker>
            </defs>

            {filteredEdges.map((edge) => {
              const from = nodeCoords.get(edge.source);
              const to = nodeCoords.get(edge.target);
              if (!from || !to) return null;

              const isCritical = edge.criticality === 'critical' || blastRadiusNodeIds.includes(edge.target);
              const isHighlighted = hoveredNode?.id === edge.source || hoveredNode?.id === edge.target;

              const scaleX = zoomLevel;
              const scaleY = zoomLevel;
              const fx = from.x * scaleX;
              const fy = from.y * scaleY;
              const tx = to.x * scaleX;
              const ty = to.y * scaleY;

              const midX = (fx + tx) / 2;
              const pathD = `M ${fx} ${fy} C ${midX} ${fy}, ${midX} ${ty}, ${tx} ${ty}`;

              return (
                <g key={edge.id}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isCritical ? 'url(#edgeGradCritical)' : 'url(#edgeGradDefault)'}
                    strokeWidth={isHighlighted ? 2.5 : isCritical ? 2 : 1.2}
                    strokeDasharray={isCritical ? '4,3' : 'none'}
                    markerEnd="url(#arrow)"
                    className={isCritical ? 'animate-pulse' : ''}
                  />
                </g>
              );
            })}
          </svg>

          {/* HTML Interactive Nodes */}
          <div className="absolute inset-0 pointer-events-auto">
            {filteredNodes.map((node) => {
              const rawCoords = nodeCoords.get(node.id) || { x: 50, y: 50 };
              const coords = { x: rawCoords.x * zoomLevel, y: rawCoords.y * zoomLevel };
              const isSelected = selectedNode?.id === node.id;
              const isRoot = node.hopDistance === 0;
              const isBlast = blastRadiusNodeIds.includes(node.id);
              const isTier0 = node.tier?.includes('tier-0');

              return (
                <div
                  key={node.id}
                  onClick={() => onSelectNode(node)}
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode(null)}
                  style={{
                    left: `${coords.x}px`,
                    top: `${coords.y}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className={`absolute cursor-pointer rounded-xl p-2.5 transition-all text-xs font-sans shadow-lg flex flex-col justify-center min-w-[120px] max-w-[140px] ${
                    isSelected
                      ? 'bg-cyan-950/95 border-2 border-cyan-400 ring-4 ring-cyan-500/20 z-30 scale-105'
                      : isBlast
                      ? 'bg-rose-950/90 border border-rose-500 ring-2 ring-rose-500/40 z-20 animate-pulse'
                      : isRoot
                      ? 'bg-slate-900 border-2 border-indigo-500/80 z-20'
                      : 'bg-slate-900/95 border border-slate-800 hover:border-slate-600 z-10'
                  }`}
                >
                  <div className="flex items-center justify-between text-[9px] mb-1">
                    <span
                      className={`px-1.5 py-0.2 rounded font-mono uppercase font-semibold ${
                        isTier0
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {node.tier?.split('-')[1] || 'T1'}
                    </span>
                    <span className="font-mono text-slate-400 text-[10px]">
                      {isRoot ? 'ROOT' : `Hop ${node.hopDistance}`}
                    </span>
                  </div>
                  <div className="font-bold text-slate-100 truncate text-[11px] leading-tight">
                    {node.name}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">{node.team}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Summary Bar - Fully Responsive, Ample Clearance */}
      <div className="z-10 px-3 sm:px-4 py-2.5 border-t border-slate-800/80 bg-slate-900/95 backdrop-blur-sm flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="text-slate-400 flex items-center gap-1.5 flex-wrap">
          <MoveHorizontal className="w-3 h-3 text-cyan-400 sm:hidden" />
          <span>
            Showing <strong className="text-slate-200">{filteredNodes.length}</strong> services across <strong className="text-slate-200">{filteredEdges.length}</strong> contracts
          </span>
        </div>
        {blastRadiusNodeIds.length > 0 && (
          <span className="text-rose-400 font-semibold flex items-center gap-1.5 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/80">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span>Blast Radius: <strong>{blastRadiusNodeIds.length}</strong> squads impacted</span>
          </span>
        )}
      </div>
    </div>
  );
};

