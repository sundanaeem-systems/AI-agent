/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Sanity Content Lake Live Explorer & Migration Mutation Console
 * ChronoGraph - Autonomous Cross-System Breaking-Change Sentinel
 */

import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  Sparkles,
  Zap,
  Code2,
  Layers,
  ArrowRight,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { type UserRole } from '../../lib/rbac/permissions.ts';

interface SanityLivePanelProps {
  selectedRole?: UserRole;
  onApplyPatchSuccess?: (result: any) => void;
  targetServiceId?: string;
}

export const SanityLivePanel: React.FC<SanityLivePanelProps> = ({
  selectedRole = 'developer',
  onApplyPatchSuccess,
  targetServiceId = 'srv_billing_core',
}) => {
  const [sanityStatus, setSanityStatus] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [groqQuery, setGroqQuery] = useState<string>(
    `*[_type == "service"] | order(serviceTier asc) {\n  _id, name, serviceTier, ownerTeam, protocol, contractVersion\n}`
  );
  const [queryResult, setQueryResult] = useState<any>(null);
  const [runningQuery, setRunningQuery] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  // Mutation form state
  const [patchField, setPatchField] = useState('paymentMethodId');
  const [patchAction, setPatchAction] = useState<'DEPRECATE_FIELD' | 'ADD_ALIAS_PROJECTION' | 'DUAL_WRITE_FALLBACK'>('DEPRECATE_FIELD');
  const [newFieldName, setNewFieldName] = useState('newPaymentMethodId');
  const [applyingMutation, setApplyingMutation] = useState(false);
  const [mutationFeedback, setMutationFeedback] = useState<any>(null);

  const fetchStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch('/api/sanity/status');
      const data = await res.json();
      setSanityStatus(data);
    } catch (err: any) {
      console.warn('Failed to load Sanity status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleExecuteGroq = async () => {
    setRunningQuery(true);
    setQueryError(null);
    try {
      const res = await fetch('/api/sanity/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: groqQuery }),
      });
      const data = await res.json();
      if (data.success) {
        setQueryResult(data.result);
      } else {
        setQueryError(data.message || data.error || 'GROQ execution failed');
      }
    } catch (err: any) {
      setQueryError(err?.message || 'Network error running GROQ query');
    } finally {
      setRunningQuery(false);
    }
  };

  const handleApplyLiveMutation = async () => {
    setApplyingMutation(true);
    setMutationFeedback(null);
    try {
      const res = await fetch('/api/sanity/patch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sentinel-role': selectedRole,
        },
        body: JSON.stringify({
          serviceId: targetServiceId,
          fieldName: patchField,
          action: patchAction,
          newFieldName,
          patchCode: `// Auto-generated backward-compatible patch for ${patchField}\nexport const with${patchField}Fallback = (data: any) => ({ ...data, ${patchField}: data.${patchField} ?? data.${newFieldName} });`,
          rollbackPlan: 'Instant git revert and Sanity patch rollback',
        }),
      });
      const data = await res.json();
      setMutationFeedback(data);
      if (data.success && onApplyPatchSuccess) {
        onApplyPatchSuccess(data);
      }
    } catch (err: any) {
      setMutationFeedback({ success: false, message: err?.message || 'Mutation failed' });
    } finally {
      setApplyingMutation(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Sanity Content Lake Connection Status */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-rose-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-100 text-sm">Sanity Content Lake Integration</h3>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  sanityStatus?.isLive
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80'
                    : 'bg-amber-950/80 text-amber-300 border-amber-700/80'
                }`}
              >
                {sanityStatus?.isLive ? 'LIVE CONTENT LAKE' : 'HYBRID SEEDED LAKE'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Project:{' '}
              <span className="font-mono text-slate-300">{sanityStatus?.projectId || 'chronograph-lake'}</span>
              {' · '}Dataset:{' '}
              <span className="font-mono text-slate-300">{sanityStatus?.dataset || 'production'}</span>
              {' · '}Write Token:{' '}
              <span className={`font-mono ${sanityStatus?.hasWriteToken ? 'text-emerald-400' : 'text-amber-400'}`}>
                {sanityStatus?.hasWriteToken ? 'CONFIGURED' : 'DEV MODE'}
              </span>
            </p>
          </div>
        </div>

        <button
          onClick={fetchStatus}
          className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 flex items-center gap-2 transition-all cursor-pointer"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh Lake</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col (7 cols): Live GROQ Query Runner */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-cyan-400" />
              <h4 className="font-semibold text-sm text-slate-200">Live GROQ Query Executor</h4>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setGroqQuery(`*[_type == "service"] | order(name asc) {\n  _id, name, serviceTier, ownerTeam\n}`)
                }
                className="text-[11px] font-mono text-slate-400 hover:text-cyan-300 transition-colors"
              >
                Services
              </button>
              <span className="text-slate-600">·</span>
              <button
                onClick={() =>
                  setGroqQuery(`*[_type == "apiEndpoint"] [0...5] {\n  _id, name, path, method, fieldContracts\n}`)
                }
                className="text-[11px] font-mono text-slate-400 hover:text-cyan-300 transition-colors"
              >
                Endpoints
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>GROQ Query Expression</span>
              <span className="text-slate-500">@sanity/client</span>
            </label>
            <textarea
              value={groqQuery}
              onChange={(e) => setGroqQuery(e.target.value)}
              rows={4}
              className="w-full bg-slate-950 font-mono text-xs text-cyan-300 p-3 rounded-xl border border-slate-800 focus:border-cyan-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={handleExecuteGroq}
              disabled={runningQuery}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-cyan-950/40 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 fill-current ${runningQuery ? 'animate-spin' : ''}`} />
              <span>{runningQuery ? 'Executing GROQ...' : 'Execute Live Query'}</span>
            </button>
            {queryResult && (
              <span className="text-[11px] font-mono text-slate-400">
                Returned {Array.isArray(queryResult) ? queryResult.length : 1} document(s)
              </span>
            )}
          </div>

          {queryError && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{queryError}</span>
            </div>
          )}

          {queryResult && (
            <div className="space-y-1.5 pt-2">
              <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Content Lake Response</label>
              <pre className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3 text-[11px] font-mono text-slate-300 max-h-56 overflow-auto">
                {JSON.stringify(queryResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Right Col (5 cols): Live Sanity Mutation & Patch Manager */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h4 className="font-semibold text-sm text-slate-200">Live Sanity Mutation Writer</h4>
              </div>
              <span className="text-[10px] font-mono text-slate-400 uppercase">Write Token</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Applies auto-synthesized backward-compatible adapter wrappers directly back into Sanity documents.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-mono text-slate-400">Target Schema Field</label>
                <input
                  type="text"
                  value={patchField}
                  onChange={(e) => setPatchField(e.target.value)}
                  className="w-full mt-1 bg-slate-950 text-xs font-mono text-slate-200 p-2 rounded-lg border border-slate-800 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400">Mutation Action</label>
                <select
                  value={patchAction}
                  onChange={(e) => setPatchAction(e.target.value as any)}
                  className="w-full mt-1 bg-slate-950 text-xs font-mono text-slate-200 p-2 rounded-lg border border-slate-800 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="DEPRECATE_FIELD">DEPRECATE_FIELD (Protected Alias)</option>
                  <option value="ADD_ALIAS_PROJECTION">ADD_ALIAS_PROJECTION (GROQ Coalesce)</option>
                  <option value="DUAL_WRITE_FALLBACK">DUAL_WRITE_FALLBACK (Zero Downtime)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400">New / Coalesce Alias Target</label>
                <input
                  type="text"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  className="w-full mt-1 bg-slate-950 text-xs font-mono text-slate-200 p-2 rounded-lg border border-slate-800 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-800">
            <button
              onClick={handleApplyLiveMutation}
              disabled={applyingMutation}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Send className={`w-3.5 h-3.5 ${applyingMutation ? 'animate-pulse' : ''}`} />
              <span>{applyingMutation ? 'Applying Mutation...' : 'Apply Live Sanity Patch'}</span>
            </button>

            {mutationFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs leading-relaxed ${
                  mutationFeedback.success
                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/80'
                    : 'bg-rose-950/40 text-rose-300 border-rose-800/80'
                }`}
              >
                <div className="font-semibold flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{mutationFeedback.operation || 'MUTATION_SUCCESS'}</span>
                </div>
                <p className="text-[11px] opacity-90">{mutationFeedback.message}</p>
                {mutationFeedback.transactionId && (
                  <div className="mt-1 font-mono text-[10px] text-slate-400 truncate">
                    TX: {mutationFeedback.transactionId}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
