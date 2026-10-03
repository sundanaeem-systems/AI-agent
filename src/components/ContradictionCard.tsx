/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contradiction Card
 * When the dataset and the Knowledge Base (or two KB documents) disagree about
 * a field's contract, both claims are shown side by side with their sources.
 * A human can rule on it; the ruling is written back to Sanity as a
 * `contractDecision` doc so future analyses don't ask again.
 */
import { useState } from 'react';
import { Scale, Check, Loader2 } from 'lucide-react';
import type { Contradiction } from '../types/widgets.ts';
import { submitContractDecision } from '../lib/apiClient.ts';

export function ContradictionCard({
  contradiction,
  serviceId,
  role,
  canDecide,
  onDecided,
}: {
  contradiction: Contradiction;
  serviceId: string;
  role: string;
  canDecide: boolean;
  onDecided: (updated: Contradiction) => void;
}) {
  const [submitting, setSubmitting] = useState<'A' | 'B' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const decided = contradiction.decision;

  async function decide(chosen: 'A' | 'B') {
    setSubmitting(chosen);
    setError(null);
    const { ok, error: err } = await submitContractDecision(
      {
        contradictionId: contradiction.id,
        serviceId,
        field: contradiction.field,
        attribute: contradiction.attribute,
        claimA: contradiction.claimA.text,
        sourceA: contradiction.claimA.source,
        claimB: contradiction.claimB.text,
        sourceB: contradiction.claimB.source,
        chosen,
      },
      role
    );
    setSubmitting(null);
    if (!ok) { setError(err || 'Could not save the ruling.'); return; }
    onDecided({
      ...contradiction,
      decision: { chosen, decidedBy: role, decidedAt: new Date().toISOString() },
    });
  }

  const Claim = ({ label, claim, side }: { label: 'A' | 'B'; claim: Contradiction['claimA']; side: 'A' | 'B' }) => (
    <div className={`flex-1 min-w-0 rounded-lg border p-2.5 ${decided?.chosen === side ? 'border-emerald-700 bg-emerald-950/30' : 'border-slate-800 bg-slate-950/60'}`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[10px] font-mono uppercase text-slate-500">Claim {label}</span>
        {decided?.chosen === side && <Check className="w-3.5 h-3.5 text-emerald-400" />}
      </div>
      <p className="text-[11px] text-slate-200 leading-relaxed">{claim.text}</p>
      <p className="text-[10px] text-slate-500 mt-1.5 font-mono truncate">source: {claim.source}</p>
      {canDecide && !decided && (
        <button
          onClick={() => decide(side)}
          disabled={submitting !== null}
          className="mt-2 w-full flex items-center justify-center gap-1 text-[10px] font-semibold py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-50"
        >
          {submitting === side ? <Loader2 className="w-3 h-3 animate-spin" /> : <Scale className="w-3 h-3" />}
          Trust Claim {label}
        </button>
      )}
    </div>
  );

  return (
    <div className="bg-slate-900/70 border border-amber-900/40 rounded-xl p-3.5 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-1">
        <span className="text-xs font-semibold text-amber-200">
          Contradiction: <span className="font-mono">{contradiction.field}</span> · {contradiction.attribute}
        </span>
        {decided && (
          <span className="text-[10px] text-emerald-300 font-mono">
            resolved by {decided.decidedBy} · {new Date(decided.decidedAt).toLocaleString()}
          </span>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Claim label="A" claim={contradiction.claimA} side="A" />
        <Claim label="B" claim={contradiction.claimB} side="B" />
      </div>
      {error && <p className="text-[10px] text-rose-400">{error}</p>}
      {!canDecide && !decided && (
        <p className="text-[10px] text-slate-500">Your role can view this contradiction but not rule on it.</p>
      )}
    </div>
  );
}
