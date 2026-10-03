/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Comprehensive Unit Testing Suite
 * ChronoGraph - Autonomous Cross-System Breaking-Change Sentinel
 * 
 * Tests:
 * 1. GROQ multi-hop dependency traversal & depth bounds
 * 2. AST diff parsing and breaking change detection heuristics
 * 3. Downstream consumer blast radius calculations
 * 4. Role-Based Access Control (RBAC) permission enforcement (Admin, Developer, Viewer)
 */

import { GroqExecutor } from '../lib/sanity/groqExecutor.ts';
import { hasPermission, ROLE_PERMISSIONS, SYSTEM_USERS, type UserRole, type Permission } from '../lib/rbac/permissions.ts';

// Simple lightweight test runner for Node/TSX environment
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
  }
}

export async function runSentinelTestSuite() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING CHRONOGRAPH SENTINEL TEST SUITE');
  console.log('======================================================\n');

  // Test Suite 1: GROQ Multi-Hop Traversal
  console.log('--- Suite 1: GROQ Multi-Hop Traversal & Graph Synthesis ---');
  try {
    const traversal = await GroqExecutor.traverseDependencies('srv_billing_core', 3);
    assert(traversal.rootService._id === 'srv_billing_core', 'Resolves root service correctly');
    assert(traversal.nodes.length >= 3, `Discovers multi-hop nodes (found ${traversal.nodes.length})`);
    assert(traversal.edges.length >= 2, `Traverses connecting consumer edges (found ${traversal.edges.length})`);
    assert(traversal.blastRadiusScore > 0, `Computes positive blast radius score (${traversal.blastRadiusScore})`);
    assert(traversal.affectedSquads.includes('checkout-billing'), 'Includes root team in affected squads');
    assert(traversal.affectedSquads.includes('order-platform'), 'Discovers downstream team in affected squads');
  } catch (err: any) {
    assert(false, 'GROQ Traversal throws no unhandled errors', err.message);
  }

  // Test Suite 2: Depth Bounds
  console.log('\n--- Suite 2: Traversal Depth Boundary Checks ---');
  try {
    const depth1 = await GroqExecutor.traverseDependencies('srv_billing_core', 1);
    const depth3 = await GroqExecutor.traverseDependencies('srv_billing_core', 3);
    assert(depth1.nodes.length <= depth3.nodes.length, 'Higher traversal depth returns equal or more nodes');
  } catch (err: any) {
    assert(false, 'Depth boundary check passes without errors', err.message);
  }

  // Test Suite 3: RBAC Access Control Matrix
  console.log('\n--- Suite 3: Role-Based Access Control (RBAC) Enforcement ---');
  // Admin permissions
  assert(hasPermission(SYSTEM_USERS.admin, 'patch:apply'), 'Admin can apply migration patches');
  assert(hasPermission(SYSTEM_USERS.admin, 'rbac:manage'), 'Admin can manage RBAC roles');
  assert(hasPermission(SYSTEM_USERS.admin, 'agent:analyze'), 'Admin can run agent reasoning');
  assert(hasPermission(SYSTEM_USERS.admin, 'dashboard:view'), 'Admin can view dashboard');

  // Developer permissions
  assert(hasPermission(SYSTEM_USERS.developer, 'agent:analyze'), 'Developer can analyze diffs');
  assert(hasPermission(SYSTEM_USERS.developer, 'mcp:query'), 'Developer can query MCP context');
  assert(!hasPermission(SYSTEM_USERS.developer, 'patch:apply'), 'Developer CANNOT apply patches directly (Admin only)');
  assert(!hasPermission(SYSTEM_USERS.developer, 'rbac:manage'), 'Developer CANNOT manage RBAC roles');

  // Viewer permissions
  assert(hasPermission(SYSTEM_USERS.viewer, 'dashboard:view'), 'Viewer can view dashboard');
  assert(hasPermission(SYSTEM_USERS.viewer, 'graph:traverse'), 'Viewer can inspect graph');
  assert(!hasPermission(SYSTEM_USERS.viewer, 'agent:analyze'), 'Viewer CANNOT analyze code diffs');
  assert(!hasPermission(SYSTEM_USERS.viewer, 'patch:apply'), 'Viewer CANNOT apply migration patches');
  assert(!hasPermission(SYSTEM_USERS.viewer, 'mcp:query'), 'Viewer CANNOT trigger MCP queries');

  // Test Suite 4: Invalid Service Traversal Error Handling
  console.log('\n--- Suite 4: Resilience & Error Handling ---');
  try {
    await GroqExecutor.traverseDependencies('non_existent_service_id_9999');
    assert(false, 'Should throw error on non-existent service');
  } catch (err: any) {
    assert(err.message.includes('not found'), 'Throws clean error on non-existent service identifier');
  }

  // Test Suite 5: Sanity Client Integration & Migration Patch
  console.log('\n--- Suite 5: Sanity CMS Client Integration ---');
  const { getSanityStatus, fetchLiveServices, fetchLiveEndpoints, applyMigrationPatchToSanity } = await import('../lib/sanity/client.ts');
  const status = await getSanityStatus();
  assert(status.dataset === 'production' || Boolean(status.dataset), 'Sanity dataset is resolved');
  const servicesData = await fetchLiveServices();
  assert(servicesData.services.length >= 4, `Fetches services catalog (found ${servicesData.services.length})`);
  const endpointsData = await fetchLiveEndpoints('srv_billing_core');
  assert(endpointsData.endpoints.length >= 1, `Fetches endpoint contracts for billing service`);
  const patchResult = await applyMigrationPatchToSanity({
    serviceId: 'srv_billing_core',
    fieldName: 'paymentMethodId',
    action: 'DEPRECATE_FIELD',
    newFieldName: 'newPaymentMethodId',
  });
  assert(patchResult.success === true, 'Applies or simulates migration patch mutation successfully');

  // Test Suite 6: Live Telemetry Collector & Aggregator
  console.log('\n--- Suite 6: Live Telemetry Collector ---');
  const { telemetryCollector } = await import('../lib/telemetry/collector.ts');
  telemetryCollector.ingest({
    service: 'srv_billing_core',
    responseTimeMs: 88,
    statusCode: 200,
    squad: 'checkout-billing',
  });
  const snapshot = telemetryCollector.getSnapshot('1h', 'srv_billing_core');
  assert(snapshot.points.length > 0, `Generates rolling timeseries points (${snapshot.points.length} points)`);
  assert(snapshot.squadHeatmap.length >= 5, `Aggregates squad heatmap rows (${snapshot.squadHeatmap.length} squads)`);
  assert(snapshot.summary.avgResponseTimeMs > 0, 'Computes average latency summary');

  // Test Suite 7: Babel AST Code Parser & Webhook Cross-Referencing
  console.log('\n--- Suite 7: Babel AST Parser & Schema Cross-Referencer ---');
  const { parseComponentAst, crossReferenceSchemaDiffWithAst } = await import('../lib/ast/parser.ts');
  const sampleCode = `
import React from 'react';
const query = groq\`*[_type == "service"] { _id, paymentMethodId, customerId }\`;
export function CheckoutForm({ paymentMethodId }: { paymentMethodId: string }) {
  return <div>{paymentMethodId}</div>;
}
`;
  const parsed = parseComponentAst(sampleCode, 'CheckoutForm.tsx');
  assert(parsed.allReferencedFields.includes('paymentMethodId'), 'AST parser detects GROQ projection field paymentMethodId');
  assert(parsed.allReferencedFields.includes('customerId'), 'AST parser detects customerId in query');
  assert(parsed.groqQueries.length >= 1, 'AST parser detects groq tagged template literal');

  const diffCheck = crossReferenceSchemaDiffWithAst(
    {
      deletedFields: ['paymentMethodId'],
      typeMutations: [{ field: 'customerId', oldType: 'string', newType: 'number' }],
    },
    [{ filename: 'CheckoutForm.tsx', content: sampleCode }]
  );
  assert(diffCheck.hasBreakingChanges === true, 'AST cross-referencer flags breaking change');
  assert(diffCheck.verdict === 'BLOCKED_BREAKING_CHANGES', 'AST cross-referencer blocks merge on deleted field');
  assert(diffCheck.breakages.length >= 2, `Detects exact breakages (${diffCheck.breakages.length} violations found)`);
  assert(Boolean(diffCheck.automatedPatchSuggestion), 'Synthesizes automated backward-compatible patch');

  console.log('\n======================================================');
  console.log(`TEST SUMMARY: ${passedTests} Passed, ${failedTests} Failed`);
  console.log('======================================================\n');

  return { passed: passedTests, failed: failedTests };
}

// Execute if run directly via tsx
if (import.meta.url === `file://${process.argv[1]}`) {
  runSentinelTestSuite().then((res) => {
    process.exit(res.failed > 0 ? 1 : 0);
  });
}
