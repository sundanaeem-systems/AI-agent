/**
 * Unit tests for the context-agent's pure helpers: JSON report parsing,
 * contradiction-id derivation, and applying saved human decisions.
 * Run with: npm test
 */
import assert from 'node:assert';
import {
  parseAgentReport,
  contradictionId,
  applyDecisions,
  splitToolName,
} from '../lib/agent/sentinelAgent.ts';
import type { ContractDecision } from '../lib/agent/decisionStore.ts';

let passed = 0;
function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ok - ${name}`); }
  catch (e) { console.error(`  FAIL - ${name}`); console.error(e); process.exitCode = 1; }
}

test('contradictionId is stable and lowercase', () => {
  assert.strictEqual(contradictionId('srv_billing_core', 'taxId', 'required'), 'srv_billing_core.taxid.required');
});

test('splitToolName separates the graph/docs prefix', () => {
  assert.deepStrictEqual(splitToolName('graph__groq_query'), { kind: 'graph', name: 'groq_query' });
  assert.deepStrictEqual(splitToolName('docs__knowledge_base_read'), { kind: 'docs', name: 'knowledge_base_read' });
});

test('parseAgentReport extracts fenced json and contradictions', () => {
  const text = `Billing core's taxId is now required per the v3 spec.
\`\`\`json
{"summary":"taxId contradicts across sources","findings":["dataset says optional","spec says required"],
 "contradictions":[{"field":"taxId","attribute":"required","claimA":{"text":"optional","source":"srv_billing_core dataset"},"claimB":{"text":"required as of v3.0.0","source":"billing-openapi-v3.md"}}]}
\`\`\``;
  const r = parseAgentReport(text, 'srv_billing_core');
  assert.strictEqual(r.contradictions.length, 1);
  assert.strictEqual(r.contradictions[0].id, 'srv_billing_core.taxid.required');
  assert.strictEqual(r.contradictions[0].claimB.source, 'billing-openapi-v3.md');
  assert.ok(r.summary.length > 0);
});

test('parseAgentReport tolerates no json block', () => {
  const r = parseAgentReport('No contradictions found, contract is stable.', 'srv_billing_core');
  assert.strictEqual(r.contradictions.length, 0);
});

test('applyDecisions attaches a saved ruling by id', () => {
  const c = [{
    id: 'srv_billing_core.taxid.required', field: 'taxId', attribute: 'required',
    claimA: { text: 'optional', source: 'dataset' }, claimB: { text: 'required', source: 'spec' },
  }];
  const decisions: ContractDecision[] = [{
    contradictionId: 'srv_billing_core.taxid.required', field: 'taxId', attribute: 'required',
    claimA: 'optional', sourceA: 'dataset', claimB: 'required', sourceB: 'spec',
    chosen: 'B', decidedBy: 'admin@chronograph.internal', decidedAt: '2026-09-29T00:00:00.000Z',
  }];
  const out = applyDecisions(c as any, decisions);
  assert.strictEqual(out[0].decision?.chosen, 'B');
});

console.log(`\n${passed} agent test(s) passed.`);
