/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Minimalist Welcome & AI Agent Introduction Landing Page
 * ChronoGraph Sentinel: Autonomous Cross-System Breaking-Change Sentinel
 */

import React from 'react';
import {
  Cpu,
  GitBranch,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Layers,
  Activity,
  Zap,
  Lock,
} from 'lucide-react';
import { type UserRole } from '../../lib/rbac/permissions.ts';

interface LandingPageProps {
  onEnterStudio: (tab?: 'overview' | 'widgets' | 'architecture' | 'logs', scenarioId?: string) => void;
  presetScenarios?: Array<{
    id: string;
    name: string;
    targetService: string;
    description: string;
    diff: string;
  }>;
  onSelectScenario?: (scenario: any) => void;
  currentScenario?: any;
  selectedRole?: UserRole;
  onSelectRole?: (role: UserRole) => void;
  onOpenCodeModal?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterStudio,
  selectedRole = 'admin',
  onSelectRole,
}) => {
  return (
    <div className="relative w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-24 space-y-16 sm:space-y-24">
      {/* 1. HERO AI AGENT INTRODUCTION */}
      <section className="text-center space-y-6 sm:space-y-8 relative z-10 p-6 sm:p-10 rounded-3xl bg-slate-950/45 backdrop-blur-[6px] border border-slate-800/50 shadow-2xl shadow-black/60">
        {/* Unboxed editorial kicker */}
        <div className="flex items-center justify-center gap-2 text-xs font-mono tracking-widest uppercase text-cyan-400">
          <Sparkles className="w-3.5 h-3.5 animate-pulse text-cyan-300" />
          <span>Autonomous AI Contract Guardian</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="text-slate-400">Sanity MCP + Multi-Hop AST Reasoning</span>
        </div>

        {/* Minimalist Dominant Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12] max-w-4xl mx-auto drop-shadow-md">
          Meet ChronoGraph Sentinel.{' '}
          <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-purple-400 bg-clip-text text-transparent">
            Autonomous Resilience
          </span>{' '}
          for Distributed Systems.
        </h1>

        {/* AI Agent Narrative & Purpose */}
        <p className="text-base sm:text-lg text-slate-200/95 max-w-2xl mx-auto leading-relaxed font-normal drop-shadow-sm">
          An autonomous AI agent engineered to safeguard distributed microservices, Sanity CMS schemas, 
          and GraphQL APIs. Operating silently before production releases, Sentinel traverses multi-hop dependency 
          graphs, pinpoints breaking contract drift, and synthesizes zero-downtime migration patches.
        </p>

        {/* Action Directives */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
          <button
            onClick={() => onEnterStudio('overview')}
            className="group px-7 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-semibold text-sm shadow-xl shadow-cyan-500/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>Enter Sentinel Studio</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => onEnterStudio('architecture')}
            className="px-6 py-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-700/80 text-slate-200 font-medium text-sm transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer hover:border-slate-500"
          >
            <GitBranch className="w-4 h-4 text-cyan-400" />
            <span>Inspect Dependency Graph</span>
          </button>
        </div>

        {/* Minimalist Live Agent Status Strip */}
        <div className="pt-6 border-t border-slate-800/50 max-w-2xl mx-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-slate-200">Agent Status:</span>
            <span className="text-cyan-300">Active & Observing</span>
          </div>
          <span aria-hidden="true" className="text-slate-700 hidden sm:inline">·</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-200">Reasoning Core:</span>
            <span className="text-purple-300">Gemini Multi-Hop AST</span>
          </div>
          <span aria-hidden="true" className="text-slate-700 hidden sm:inline">·</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-200">Integrity SLA:</span>
            <span className="text-emerald-400 font-bold">99.98%</span>
          </div>
        </div>
      </section>

      {/* 2. THE THREE COGNITIVE PILLARS OF THE AGENT */}
      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-1.5">
          <div className="text-xs font-mono uppercase tracking-wider text-cyan-400">
            Agent Intelligence Architecture
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            How ChronoGraph Sentinel Reasons
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Pillar 1: Autonomous Perception */}
          <div className="bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/50 rounded-2xl p-6 backdrop-blur-xl transition-all group hover:bg-slate-900/80">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-700/60 flex items-center justify-center mb-4 text-cyan-400 group-hover:scale-105 transition-transform">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base text-slate-100 mb-2">
              01. Continuous Perception
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Monitors schema pull requests, Sanity document field renames, and API contract modifications. 
              Isolates breaking mutations before they reach downstream consumers.
            </p>
          </div>

          {/* Pillar 2: Multi-Hop Graph Traversal */}
          <div className="bg-slate-900/60 border border-slate-800/80 hover:border-purple-500/50 rounded-2xl p-6 backdrop-blur-xl transition-all group hover:bg-slate-900/80">
            <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-700/60 flex items-center justify-center mb-4 text-purple-400 group-hover:scale-105 transition-transform">
              <GitBranch className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base text-slate-100 mb-2">
              02. Multi-Hop Graph Traversal
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Traverses up to 4 degrees of dependent services, GROQ projections, and mobile BFFs using 
              the Model Context Protocol (MCP) to compute blast radius scores.
            </p>
          </div>

          {/* Pillar 3: Zero-Downtime Safe Patches */}
          <div className="bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/50 rounded-2xl p-6 backdrop-blur-xl transition-all group hover:bg-slate-900/80">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center mb-4 text-emerald-400 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base text-slate-100 mb-2">
              03. Autonomous Safe Patches
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automatically creates backward-compatible adapter wrappers and safe fallback transformers, 
              preventing incidents and enabling zero-downtime schema evolution.
            </p>
          </div>
        </div>
      </section>

      {/* 3. AGENT MISSION STATEMENT & LAUNCH PROMPT */}
      <section className="bg-gradient-to-r from-slate-900/80 via-purple-950/30 to-slate-900/80 border border-slate-800/90 rounded-2xl p-6 sm:p-10 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-left max-w-xl">
          <div className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            <span>Resilience Manifesto</span>
          </div>
          <p className="text-sm sm:text-base text-slate-200 font-light italic leading-relaxed">
            &ldquo;Distributed systems rarely fail from complex algorithms &mdash; they fail from silent schema drift between decoupled services. ChronoGraph Sentinel exists to guarantee contract certainty.&rdquo;
          </p>
        </div>

        <button
          onClick={() => onEnterStudio('overview')}
          className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-semibold text-xs tracking-wide shadow-lg shadow-cyan-500/20 active:scale-95 transition-all shrink-0 cursor-pointer text-center"
        >
          Enter Full Studio Console &rarr;
        </button>
      </section>

      {/* 4. QUIET FOOTER */}
      <footer className="pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-cyan-600/30 border border-cyan-500/40 flex items-center justify-center">
            <Cpu className="w-3 h-3 text-cyan-300" />
          </div>
          <span className="font-semibold text-slate-300">ChronoGraph Sentinel</span>
          <span className="text-slate-400">· Autonomous Contract Intelligence</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <button onClick={() => onEnterStudio('overview')} className="hover:text-slate-300 cursor-pointer">
            Studio Overview
          </button>
          <button onClick={() => onEnterStudio('architecture')} className="hover:text-slate-300 cursor-pointer">
            Dependency Graph
          </button>
          <button onClick={() => onEnterStudio('widgets')} className="hover:text-slate-300 cursor-pointer">
            Telemetry
          </button>
        </div>
      </footer>
    </div>
  );
};
