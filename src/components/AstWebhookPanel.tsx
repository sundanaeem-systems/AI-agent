/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * AST Parser & CI/CD Webhook Automation Studio
 * ChronoGraph - Autonomous Cross-System Breaking-Change Sentinel
 */

import React, { useState } from 'react';
import {
  GitPullRequest,
  CheckCircle2,
  AlertOctagon,
  FileCode,
  Zap,
  Play,
  RotateCw,
  Terminal,
  ShieldAlert,
  ArrowRight,
  Code,
} from 'lucide-react';

export const AstWebhookPanel: React.FC = () => {
  const [webhookPayloadType, setWebhookPayloadType] = useState<'github_pr' | 'sanity_schema'>('github_pr');
  const [sampleComponentCode, setSampleComponentCode] = useState<string>(`// Client Component consuming Sanity GROQ schema
import React from 'react';
import { client } from '../lib/sanity/client';

const invoiceQuery = groq\`*[_type == "service" && name == "Billing"] {
  _id,
  name,
  paymentMethodId,
  customerId,
  taxId,
  contractVersion
}\`;

export function CheckoutWidget(props: { paymentMethodId: string; customerId: string }) {
  const { paymentMethodId, customerId } = props;
  return (
    <div className="checkout">
      <span>Payment Token: {paymentMethodId}</span>
      <span>User ID: {customerId}</span>
    </div>
  );
}
`);

  const [schemaDiffInput, setSchemaDiffInput] = useState<string>(`diff --git a/schemas/service.ts b/schemas/service.ts
--- a/schemas/service.ts
+++ b/schemas/service.ts
@@ -14,3 +14,3 @@
- paymentMethodId: string;
+ newPaymentTokenId: string;
- taxId: string;
+ taxId: number;
`);

  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'violations' | 'github_check' | 'patch'>('violations');

  const handleTriggerWebhookCheck = async () => {
    setRunningAnalysis(true);
    try {
      const res = await fetch('/api/webhooks/schema-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-github-event': webhookPayloadType === 'github_pr' ? 'pull_request' : 'sanity.schema-mutation',
        },
        body: JSON.stringify({
          rawDiff: schemaDiffInput,
          clientFiles: [
            {
              filename: 'src/components/CheckoutWidget.tsx',
              content: sampleComponentCode,
            },
          ],
        }),
      });

      const data = await res.json();
      if (data.success && data.analysis) {
        setAnalysisResult(data.analysis);
      }
    } catch (err: any) {
      console.warn('Webhook trigger failed:', err);
    } finally {
      setRunningAnalysis(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <GitPullRequest className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-100 text-sm">AST Parser & CI/CD Webhook Listener</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-700/80">
                /api/webhooks/schema-check
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Traverses Babel AST syntax trees across frontend components to detect breaking GROQ changes before PR merge.
            </p>
          </div>
        </div>

        <button
          onClick={handleTriggerWebhookCheck}
          disabled={runningAnalysis}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-cyan-950/40 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
        >
          <Play className={`w-3.5 h-3.5 fill-current ${runningAnalysis ? 'animate-spin' : ''}`} />
          <span>{runningAnalysis ? 'Parsing AST...' : 'Simulate CI Webhook'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col (6 cols): Incoming Schema Diff & Client Code */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4.5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-rose-400" />
                <h4 className="font-semibold text-xs text-slate-200">Incoming Schema Git Diff</h4>
              </div>
              <span className="text-[10px] font-mono text-slate-500">PR #142 (Stripe migration)</span>
            </div>
            <textarea
              value={schemaDiffInput}
              onChange={(e) => setSchemaDiffInput(e.target.value)}
              rows={5}
              className="w-full bg-slate-950 font-mono text-[11px] text-rose-300 p-3 rounded-xl border border-slate-800 focus:border-rose-500 focus:outline-none"
            />
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4.5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-cyan-400" />
                <h4 className="font-semibold text-xs text-slate-200">Client Component (Target of AST Parser)</h4>
              </div>
              <span className="text-[10px] font-mono text-slate-500">CheckoutWidget.tsx</span>
            </div>
            <textarea
              value={sampleComponentCode}
              onChange={(e) => setSampleComponentCode(e.target.value)}
              rows={9}
              className="w-full bg-slate-950 font-mono text-[11px] text-cyan-300 p-3 rounded-xl border border-slate-800 focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Right Col (6 cols): AST Parser Output & GitHub Check Annotations */}
        <div className="lg:col-span-6 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <h4 className="font-semibold text-sm text-slate-200">AST Analysis & CI/CD Report</h4>
              </div>
              {analysisResult && (
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    analysisResult.verdict === 'BLOCKED_BREAKING_CHANGES'
                      ? 'bg-rose-950 text-rose-400 border border-rose-800'
                      : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  }`}
                >
                  {analysisResult.verdict}
                </span>
              )}
            </div>

            {/* Tabs for Result View */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('violations')}
                className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                  activeTab === 'violations' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Violations ({analysisResult?.breakages?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('github_check')}
                className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                  activeTab === 'github_check' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                GitHub Check Run
              </button>
              <button
                onClick={() => setActiveTab('patch')}
                className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                  activeTab === 'patch' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Patch Adapter
              </button>
            </div>

            {/* Tab 1: Violations List */}
            {activeTab === 'violations' && (
              <div className="space-y-3 max-h-72 overflow-auto pr-1">
                {analysisResult?.breakages && analysisResult.breakages.length > 0 ? (
                  analysisResult.breakages.map((b: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1.5 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-rose-400">{b.field}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                          {b.severity}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {b.file} · Line {b.line}:{b.column}
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">{b.impactDescription}</p>
                      {b.codeSnippet && (
                        <div className="bg-slate-900 p-1.5 rounded text-[10px] font-mono text-cyan-300 truncate">
                          {b.codeSnippet}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-slate-500 text-xs">
                    Click &ldquo;Simulate CI Webhook&rdquo; above to run the AST parser.
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: GitHub Check Run */}
            {activeTab === 'github_check' && (
              <div className="space-y-3 bg-slate-950/90 border border-slate-800 rounded-xl p-4 text-xs font-mono">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400">
                  <span>GitHub Check Run Status:</span>
                  <span
                    className={`font-bold uppercase ${
                      analysisResult?.githubCheckRun?.conclusion === 'failure' ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {analysisResult?.githubCheckRun?.conclusion || 'PENDING'}
                  </span>
                </div>
                <div className="text-slate-200 font-semibold">
                  {analysisResult?.githubCheckRun?.title || 'ChronoGraph Sentinel Check Run'}
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  {analysisResult?.githubCheckRun?.summary || 'Pending PR commit webhook execution.'}
                </p>
              </div>
            )}

            {/* Tab 3: Automated Patch Adapter */}
            {activeTab === 'patch' && (
              <div className="space-y-2">
                <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Synthesized Adapter</label>
                <pre className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-emerald-300 max-h-56 overflow-auto">
                  {analysisResult?.automatedPatchSuggestion ||
                    '// Auto-synthesized backward-compatible adapter will appear here\n// upon detecting breaking schema changes'}
                </pre>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Babel AST Engine v7.26</span>
            <span>Zero-Downtime Gatekeeper</span>
          </div>
        </div>
      </div>
    </div>
  );
};
