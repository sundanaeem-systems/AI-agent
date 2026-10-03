/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Express + Vite Full-Stack Server
 * ChronoGraph - Autonomous Cross-System Breaking-Change Sentinel
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { GroqExecutor } from './lib/sanity/groqExecutor.ts';
import { logger } from './lib/logger.ts';
import { SYSTEM_USERS, hasPermission, type UserRole } from './lib/rbac/permissions.ts';
import { RoleManager } from './lib/rbac/roleManager.ts';
import {
  sanityClient,
  getSanityStatus,
  fetchLiveServices,
  fetchLiveEndpoints,
  fetchLiveDependencySubgraph,
  applyMigrationPatchToSanity,
  isLiveSanityConfigured,
} from './lib/sanity/client.ts';
import { telemetryCollector } from './lib/telemetry/collector.ts';
import {
  parseComponentAst,
  crossReferenceSchemaDiffWithAst,
  type SchemaDiffPayload,
} from './lib/ast/parser.ts';
import { analyzeDiffWithSentinel } from './lib/sentinel.ts';
import { runContextAgent } from './lib/agent/sentinelAgent.ts';
import { listDecisions, saveDecision, type ContractDecision } from './lib/agent/decisionStore.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const app = express();

app.use(express.json({ limit: '10mb' }));

// Catch invalid JSON in request bodies and respond with JSON, never HTML
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'InvalidJson',
      message: 'Malformed JSON payload received.',
    });
  }
  next(err);
});

// Auth & RBAC resolver middleware
function resolveAuth(req: Request) {
  const roleHeader = (req.headers['x-sentinel-role'] as UserRole) || 'developer';
  const user = SYSTEM_USERS[roleHeader] || SYSTEM_USERS.developer;
  const traceId = (req.headers['x-trace-id'] as string) || `trc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  return { user, traceId };
}

// -------------------------------------------------------------
// 1. MCP Context Traversal Endpoint
// -------------------------------------------------------------
app.post('/api/mcp/context', async (req: Request, res: Response) => {
  const { user, traceId } = resolveAuth(req);

  if (!hasPermission(user, 'mcp:query')) {
    logger.audit('RBAC_FORBIDDEN', `User ${user.email} with role '${user.role}' denied for 'mcp:query'`);
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: `Your role '${user.role}' lacks permission to query MCP system context.`,
      traceId,
    });
  }

  const { serviceId = 'srv_billing_core', depth = 3 } = req.body || {};

  try {
    const traversal = await GroqExecutor.traverseDependencies(serviceId, Number(depth), { traceId });
    res.json({
      jsonrpc: '2.0',
      id: req.body?.id || `mcp_${Date.now()}`,
      result: {
        contextType: 'sanity.graph.system-dependencies',
        timestamp: new Date().toISOString(),
        requestedBy: user,
        target: traversal.rootService,
        traversalMetrics: {
          depth: traversal.traversalDepth,
          totalNodesDiscovered: traversal.nodes.length,
          totalEdgesTraversed: traversal.edges.length,
          blastRadiusScore: traversal.blastRadiusScore,
          missionCriticalAtRisk: traversal.missionCriticalAtRisk,
          affectedSquads: traversal.affectedSquads,
        },
        graph: {
          nodes: traversal.nodes,
          edges: traversal.edges,
        },
        directEndpoints: traversal.directEndpoints,
        groqDebugQuery: traversal.groqQueryExecuted,
      },
    });
  } catch (err: any) {
    res.status(404).json({
      jsonrpc: '2.0',
      error: { code: -32603, message: err?.message || 'Traversal failed' },
    });
  }
});

app.get('/api/mcp/context', (_req: Request, res: Response) => {
  res.json({
    name: 'chronograph-sanity-mcp',
    version: '2.1.0',
    protocolVersion: '2024-11-05',
    capabilities: {
      tools: ['sanity_traverse_system_context', 'sanity_detect_contract_deltas'],
      resources: ['sanity://services', 'sanity://endpoints', 'sanity://consumers'],
    },
    systemCatalog: GroqExecutor.getGraphCatalog(),
  });
});

// -------------------------------------------------------------
// 2. AI Reasoning Engine: Analyze Diff & Synthesize Patch
// -------------------------------------------------------------
app.post('/api/agent/analyze', async (req: Request, res: Response) => {
  const { user, traceId } = resolveAuth(req);

  if (!hasPermission(user, 'agent:analyze')) {
    logger.audit('RBAC_FORBIDDEN', `User ${user.email} with role '${user.role}' denied for 'agent:analyze'`);
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: `Your role '${user.role}' lacks permission to execute the AI Reasoning Engine.`,
      traceId,
    });
  }

  const { diff = '', targetServiceId = 'srv_billing_core' } = req.body || {};

  if (!diff.trim()) {
    return res.status(400).json({ success: false, error: 'Diff content cannot be empty.' });
  }

  const mcpStart = performance.now();
  const traversal = await GroqExecutor.traverseDependencies(targetServiceId, 3, { traceId });
  const mcpLatency = Math.round(performance.now() - mcpStart);

  // Parse diff for field deltas against registered contracts
  const breakages: any[] = [];
  const impactedSquads = new Set<string>();

  for (const ep of traversal.directEndpoints) {
    for (const fc of ep.fieldContracts) {
      const removedRegex = new RegExp(`^[-–]\\s*["']?${fc.fieldName}["']?\\s*:`, 'm');
      const removedKey = new RegExp(`^[-–].*\\b${fc.fieldName}\\b`, 'm');

      const isRemoved = removedRegex.test(diff) || (removedKey.test(diff) && !diff.includes(`+   ${fc.fieldName}:`));
      const isTypeChanged = diff.includes(fc.fieldName) && /type:\s*['"]?(?:number|object|boolean)['"]?/i.test(diff);
      const isNewRequired = !fc.required && /required:\s*true/i.test(diff) && diff.includes(fc.fieldName);

      if (isRemoved || isTypeChanged || isNewRequired) {
        const changeType = isRemoved ? 'REMOVAL' : isTypeChanged ? 'TYPE_MUTATION' : 'OPTIONAL_TO_REQUIRED';
        const affectedConsumers = ep.consumers
          .filter((c) => c.consumedFields.includes(fc.fieldName))
          .map((c) => {
            impactedSquads.add(c.consumerTeam);
            return {
              serviceName: c.consumerServiceId,
              consumerTeam: c.consumerTeam,
              clientVersion: c.clientVersion,
              criticality: c.criticality,
              impactDescription: `Downstream service relies on '${fc.fieldName}' in production (${c.clientVersion}). Contract mutation causes fatal deserialization failure.`,
            };
          });

        breakages.push({
          fieldName: fc.fieldName,
          changeType,
          previousContract: `${fc.dataType} (${fc.required ? 'required' : 'optional'})`,
          proposedDiff: isRemoved ? 'DELETED' : isTypeChanged ? 'TYPE_MUTATION' : 'REQUIRED_MANDATORY',
          severity: affectedConsumers.some((c) => c.criticality === 'critical') ? 'CRITICAL_BLOCKER' : 'HIGH_RISK',
          affectedConsumers,
        });
      }
    }
  }

  // Fallback heuristics if specific named fields didn't trigger exact regex
  if (breakages.length === 0 && (diff.includes('-') || diff.includes('delete') || diff.includes('rename'))) {
    const sampleField = diff.includes('payment') ? 'paymentMethodId' : diff.includes('tax') ? 'taxId' : 'customerId';
    const consumers = traversal.directEndpoints[0]?.consumers || [];
    consumers.forEach((c) => impactedSquads.add(c.consumerTeam));

    breakages.push({
      fieldName: sampleField,
      changeType: 'REMOVAL',
      previousContract: 'string (UUID/Token)',
      proposedDiff: 'DROPPED_OR_RENAMED',
      severity: 'CRITICAL_BLOCKER',
      affectedConsumers: consumers.map((c) => ({
        serviceName: c.consumerServiceId,
        consumerTeam: c.consumerTeam,
        clientVersion: c.clientVersion,
        criticality: c.criticality,
        impactDescription: `Consumer breaks on missing '${sampleField}'.`,
      })),
    });
  }

  // Execute Sentinel Breaking-Change Analysis with Gemini 2.5 Flash
  const result = await analyzeDiffWithSentinel({
    diff,
    traversal,
    breakages,
    impactedSquads: Array.from(impactedSquads),
    user: { id: user.id, email: user.email, role: user.role },
    traceId,
  });

  // Attach MCP latency metric
  result.metrics.mcpTraversalLatencyMs = mcpLatency;

  // -----------------------------------------------------------
  // Sanity Context Agent: Gemini calls graph + Knowledge Base MCP
  // tools itself, and surfaces contradictions between sources.
  // -----------------------------------------------------------
  const { decisions } = await listDecisions();
  const contextAgent = await runContextAgent({
    diff, targetServiceId, breakages, decisions, traceId,
  });
  (result as any).contextAgent = contextAgent;

  logger.audit('ANALYSIS_RESULT', `Analysis completed with verdict ${result.overallVerdict}`, {
    traceId,
    userId: user.id,
    userRole: user.role,
    durationMs: mcpLatency + result.metrics.agentReasoningLatencyMs,
    modelUsed: result.metrics.modelUsed,
  });

  res.json({ success: true, result });
});

// -------------------------------------------------------------
// 2b. Contradiction Decisions (rulings persisted to Sanity)
// -------------------------------------------------------------
app.get('/api/decisions', async (_req: Request, res: Response) => {
  const { decisions, store } = await listDecisions();
  res.json({ success: true, decisions, store });
});

app.post('/api/decisions', async (req: Request, res: Response) => {
  const { user, traceId } = resolveAuth(req);
  if (!hasPermission(user, 'override:approve')) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: `Your role '${user.role}' cannot rule on contract contradictions.`,
      traceId,
    });
  }
  const body = req.body || {};
  const required = ['contradictionId', 'field', 'attribute', 'claimA', 'sourceA', 'claimB', 'sourceB', 'chosen'];
  const missing = required.filter((k) => !body[k]);
  if (missing.length) {
    return res.status(400).json({ success: false, error: 'ValidationError', message: `Missing fields: ${missing.join(', ')}` });
  }
  const decision: ContractDecision = {
    contradictionId: body.contradictionId,
    serviceId: body.serviceId,
    field: body.field,
    attribute: body.attribute,
    claimA: body.claimA,
    sourceA: body.sourceA,
    claimB: body.claimB,
    sourceB: body.sourceB,
    chosen: body.chosen === 'B' ? 'B' : 'A',
    reason: body.reason || '',
    decidedBy: user.email,
    decidedAt: new Date().toISOString(),
  };
  const { store } = await saveDecision(decision);
  logger.audit('CONTRACT_DECISION_SAVED', `${user.email} ruled ${decision.chosen} on ${decision.field}/${decision.attribute}`, { traceId, store });
  res.json({ success: true, decision, store });
});

// -------------------------------------------------------------
// 3. Observability Logs & Metrics
// -------------------------------------------------------------
app.get('/api/agent/logs', (_req: Request, res: Response) => {
  const logs = (logger.constructor as any).getRecentLogs(60);
  res.json({ success: true, logs });
});

app.post('/api/agent/logs/simulate', (req: Request, res: Response) => {
  const { event = 'CONTRACT_PROBE', level = 'INFO', message = 'Simulated telemetry pulse', durationMs = 38 } = req.body || {};
  const entry = (logger as any).write(level, event, message, {
    durationMs,
    traceId: `trc_sim_${Date.now().toString(36)}`,
    metadata: { simulated: true, timestamp: new Date().toISOString() },
  });
  res.json({ success: true, entry });
});

app.get('/api/metrics/timeseries', (req: Request, res: Response) => {
  const range = (req.query.range as string) || '1h';
  const service = (req.query.service as string) || 'srv_billing_core';
  res.json({
    success: true,
    range,
    service,
    serverTimestamp: new Date().toISOString(),
  });
});

// -------------------------------------------------------------
// 4. Role-Based User Management
// -------------------------------------------------------------
app.get('/api/rbac/users', (_req: Request, res: Response) => {
  res.json({ success: true, users: RoleManager.listUsers() });
});

app.post('/api/rbac/update-role', async (req: Request, res: Response) => {
  const { user } = resolveAuth(req);
  const { targetUserId, newRole } = req.body;
  const result = await RoleManager.updateUserRole(targetUserId, newRole, user);
  if (!result.success) {
    return res.status(403).json(result);
  }
  res.json(result);
});

// -------------------------------------------------------------
// 5. Automated Data Export: CSV & Formatted Report
// -------------------------------------------------------------
app.post('/api/export/csv', (req: Request, res: Response) => {
  const { breakages = [], serviceName = 'Service', verdict = 'UNKNOWN' } = req.body;

  let csv = 'Field Name,Change Type,Previous Contract,Proposed Diff,Severity,Affected Consumers\n';
  for (const b of breakages) {
    const consumers = (b.affectedConsumers || []).map((c: any) => `${c.consumerTeam} (${c.criticality})`).join('; ');
    csv += `"${b.fieldName}","${b.changeType}","${b.previousContract}","${b.proposedDiff}","${b.severity}","${consumers}"\n`;
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="sentinel_audit_${Date.now()}.csv"`);
  res.send(csv);
});

// -------------------------------------------------------------
// 6. Live Sanity CMS Integration Endpoints
// -------------------------------------------------------------
app.get('/api/sanity/status', async (_req: Request, res: Response) => {
  const status = await getSanityStatus();
  res.json({ success: true, ...status });
});

app.post('/api/sanity/query', async (req: Request, res: Response) => {
  const { query, params = {} } = req.body || {};
  if (!query) {
    return res.status(400).json({ success: false, error: 'GROQ query string is required.' });
  }

  try {
    if (isLiveSanityConfigured()) {
      const result = await sanityClient.fetch(query, params);
      return res.json({ success: true, result, isLive: true });
    }

    // Fallback: If not configured, query against local seeded memory
    if (query.includes('service')) {
      const { services } = await fetchLiveServices();
      return res.json({ success: true, result: services, isLive: false, notice: 'Returned seeded catalog (Sanity unconfigured)' });
    }
    const { endpoints } = await fetchLiveEndpoints();
    return res.json({ success: true, result: endpoints, isLive: false });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'GroqQueryError', message: err?.message || 'GROQ execution failed' });
  }
});

app.get('/api/sanity/services', async (_req: Request, res: Response) => {
  const data = await fetchLiveServices();
  res.json({ success: true, ...data });
});

app.get('/api/sanity/endpoints', async (req: Request, res: Response) => {
  const serviceId = req.query.serviceId as string | undefined;
  const data = await fetchLiveEndpoints(serviceId);
  res.json({ success: true, ...data });
});

app.get('/api/sanity/subgraph/:serviceId', async (req: Request, res: Response) => {
  const serviceId = req.params.serviceId;
  const depth = Number(req.query.depth) || 3;
  const result = await fetchLiveDependencySubgraph(serviceId, depth);
  res.json({ success: true, result });
});

app.post('/api/sanity/patch', async (req: Request, res: Response) => {
  const { user, traceId } = resolveAuth(req);

  if (!hasPermission(user, 'patch:apply')) {
    logger.audit('RBAC_FORBIDDEN', `User ${user.email} denied for 'patch:apply'`);
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: `Role '${user.role}' does not have permission to apply patches to Sanity.`,
    });
  }

  const { serviceId, fieldName, action = 'DEPRECATE_FIELD', newFieldName, patchCode, rollbackPlan } = req.body || {};
  if (!serviceId || !fieldName) {
    return res.status(400).json({ success: false, error: 'Missing serviceId or fieldName in patch request.' });
  }

  const result = await applyMigrationPatchToSanity({
    serviceId,
    fieldName,
    action,
    newFieldName,
    patchCode,
    rollbackPlan,
    requestedBy: { email: user.email, role: user.role },
  });

  res.json(result);
});

// -------------------------------------------------------------
// 7. Live Telemetry Event Collector & SSE Stream
// -------------------------------------------------------------
app.post('/api/telemetry/collect', (req: Request, res: Response) => {
  const { service, responseTimeMs, statusCode = 200, squad, path, errorType, agentReasoningMs, mcpTraversalMs } = req.body || {};

  if (!service || responseTimeMs === undefined) {
    return res.status(400).json({ success: false, error: 'Missing required telemetry fields: service, responseTimeMs' });
  }

  telemetryCollector.ingest({
    service,
    responseTimeMs: Number(responseTimeMs),
    statusCode: Number(statusCode),
    squad,
    path,
    errorType,
    agentReasoningMs: agentReasoningMs ? Number(agentReasoningMs) : undefined,
    mcpTraversalMs: mcpTraversalMs ? Number(mcpTraversalMs) : undefined,
    timestamp: new Date().toISOString(),
  });

  res.status(202).json({ success: true, message: 'Telemetry event ingested into live observability pipe.' });
});

// SSE endpoint to push real-time metrics directly to widgets
app.get('/api/telemetry/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering
  res.flushHeaders?.();

  telemetryCollector.addSseClient(res);
});

// Aggregated historical & live snapshot endpoint
app.get('/api/telemetry/timeseries', (req: Request, res: Response) => {
  const range = (req.query.range as any) || '1h';
  const service = (req.query.service as string) || 'srv_billing_core';
  const snapshot = telemetryCollector.getSnapshot(range, service);

  res.json({
    success: true,
    data: snapshot,
    serverTimestamp: new Date().toISOString(),
  });
});

// -------------------------------------------------------------
// 8. AST Parser & CI/CD Webhook Listener
// -------------------------------------------------------------
app.post('/api/webhooks/schema-check', async (req: Request, res: Response) => {
  const payload = req.body || {};

  // Sample client component files representing frontend codebase consuming Sanity
  const defaultClientFiles = [
    {
      filename: 'src/components/CheckoutPaymentForm.tsx',
      content: `
import React from 'react';
import { client } from '../lib/sanity';
const checkoutQuery = groq\`*[_type == "service" && name == "Billing"] {
  _id, name, paymentMethodId, customerId, taxId, contractVersion
}\`;
export function CheckoutPaymentForm(props: { paymentMethodId: string; customerId: string }) {
  const { paymentMethodId, customerId } = props;
  return <div data-payment={paymentMethodId} data-customer={customerId} />;
}
`,
    },
    {
      filename: 'src/components/OrderSummaryWidget.tsx',
      content: `
import React from 'react';
export function OrderSummaryWidget({ service }: { service: any }) {
  return <div>{service.taxId} - {service.contractVersion}</div>;
}
`,
    },
  ];

  // Resolve schema diff from incoming payload (supports GitHub PR, Sanity Webhook, or Sentinel direct payload)
  let schemaDiff: SchemaDiffPayload = {};

  if (payload.schemaDiff) {
    schemaDiff = payload.schemaDiff;
  } else if (payload.pull_request) {
    // GitHub PR webhook payload
    schemaDiff = {
      serviceName: payload.repository?.name || 'Upstream Schema',
      rawDiff: payload.pull_request?.body || '',
      deletedFields: payload.deletedFields || [],
    };
  } else if (payload.rawDiff) {
    schemaDiff = { rawDiff: payload.rawDiff };
  } else {
    // Default demo diff
    schemaDiff = {
      serviceId: payload.serviceId || 'srv_billing_core',
      deletedFields: ['paymentMethodId'],
      typeMutations: [{ field: 'taxId', oldType: 'string', newType: 'number' }],
    };
  }

  const clientFiles = payload.clientFiles || defaultClientFiles;
  const analysis = crossReferenceSchemaDiffWithAst(schemaDiff, clientFiles);

  logger.audit('WEBHOOK_SCHEMA_CHECK', `Schema check webhook executed: verdict=${analysis.verdict} violations=${analysis.totalViolations}`);

  res.json({
    success: true,
    webhookReceivedAt: new Date().toISOString(),
    event: req.headers['x-github-event'] || req.headers['x-sanity-event'] || 'sentinel.schema-check',
    analysis,
  });
});

app.post('/api/ast/parse', (req: Request, res: Response) => {
  const { code = '', filename = 'Component.tsx' } = req.body || {};
  if (!code.trim()) {
    return res.status(400).json({ success: false, error: 'Code body is required.' });
  }

  const parsed = parseComponentAst(code, filename);
  res.json({ success: true, parsed });
});

// -------------------------------------------------------------
// Explicit /api Catch-All: Always Return JSON (Never HTML)
// -------------------------------------------------------------
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'NotFound',
    message: `API endpoint '${req.method} ${req.originalUrl}' not found.`,
  });
});

app.use('/api', (err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('API_UNHANDLED_ERROR', err?.message || 'Server error', { stack: err?.stack });
  res.status(err?.status || 500).json({
    success: false,
    error: err?.name || 'InternalError',
    message: err?.message || 'Internal API error occurred',
  });
});

// -------------------------------------------------------------
// Mount Vite Middleware for Dev, or Static Serve for Prod
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🛡️  ChronoGraph Sentinel Server running at http://0.0.0.0:${PORT}`);
    console.log(`⚡ MCP Context Endpoint: http://0.0.0.0:${PORT}/api/mcp/context`);
    console.log(`🤖 Agent Reasoning Engine: http://0.0.0.0:${PORT}/api/agent/analyze\n`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
