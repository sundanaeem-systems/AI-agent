/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Resilient API Client & Offline Context Fallback Engine
 * ChronoGraph - Autonomous Cross-System Breaking-Change Sentinel
 */

import { GroqExecutor, type TraversalResult } from '../../lib/sanity/groqExecutor.ts';
import { SentinelLogger, type StructuredLogEntry } from '../../lib/logger.ts';
import { INITIAL_ENDPOINTS } from '../../lib/sanity/sanityData.ts';

export interface ApiFetchResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  isFallback?: boolean;
}

/**
 * Safely executes HTTP requests with Content-Type validation and retry logic.
 * Guarantees that HTML error pages (e.g. 502 Bad Gateway during server restarts
 * or Vite SPA index.html fallbacks) are never parsed as JSON, eliminating
 * "Unexpected token '<'" exceptions.
 */
export async function safeApiFetch<T>(
  url: string,
  options: RequestInit = {},
  retries = 2,
  backoffMs = 250
): Promise<ApiFetchResult<T>> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      const contentType = res.headers.get('content-type') || '';

      // If server returned HTML (gateway error, proxy 502/503, or dev restart)
      if (!contentType.includes('application/json')) {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, backoffMs * (attempt + 1)));
          continue;
        }
        return {
          ok: false,
          error: `Server returned non-JSON response (${res.status} ${res.statusText})`,
        };
      }

      const text = await res.text();
      if (!text || text.trim().startsWith('<')) {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, backoffMs * (attempt + 1)));
          continue;
        }
        return {
          ok: false,
          error: 'Server returned HTML body instead of JSON',
        };
      }

      try {
        const data = JSON.parse(text) as T;
        return { ok: res.ok, data };
      } catch (parseErr: any) {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, backoffMs * (attempt + 1)));
          continue;
        }
        return { ok: false, error: parseErr?.message || 'Invalid JSON response' };
      }
    } catch (netErr: any) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, backoffMs * (attempt + 1)));
        continue;
      }
      return { ok: false, error: netErr?.message || 'Network connection failed' };
    }
  }

  return { ok: false, error: 'Request exceeded maximum retry attempts' };
}

/**
 * Loads MCP Context Graph with resilient automatic client-side traversal fallback.
 */
export async function loadMcpContext(
  serviceId: string,
  depth: number,
  role: string
): Promise<{ result: any; isFallback: boolean }> {
  // 1. Attempt primary backend API
  const { ok, data } = await safeApiFetch<any>('/api/mcp/context', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-sentinel-role': role,
    },
    body: JSON.stringify({ serviceId, depth }),
  });

  if (ok && data?.result?.graph) {
    return { result: data.result, isFallback: false };
  }

  // 2. High-availability client-side fallback using GroqExecutor
  try {
    const traversal: TraversalResult = await GroqExecutor.traverseDependencies(serviceId, depth);
    const fallbackResult = {
      contextType: 'sanity.graph.system-dependencies',
      timestamp: new Date().toISOString(),
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
    };
    return { result: fallbackResult, isFallback: true };
  } catch (err: any) {
    console.warn('Fallback traversal warning:', err);
    throw err;
  }
}

/**
 * Loads structured agent logs with fallback to client buffer.
 */
export async function loadAgentLogs(): Promise<StructuredLogEntry[]> {
  const { ok, data } = await safeApiFetch<{ logs: StructuredLogEntry[] }>('/api/agent/logs');
  if (ok && Array.isArray(data?.logs) && data.logs.length > 0) {
    return data.logs;
  }
  return SentinelLogger.getRecentLogs(50);
}

/**
 * Runs Sentinel analysis with offline rule-based fallback if backend is momentarily offline.
 */
export async function runSentinelDiffAnalysis(
  diff: string,
  targetServiceId: string,
  role: string
): Promise<{ result: any; isFallback: boolean }> {
  const { ok, data } = await safeApiFetch<any>('/api/agent/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-sentinel-role': role,
    },
    body: JSON.stringify({ diff, targetServiceId }),
  });

  if (ok && data?.result) {
    return { result: data.result, isFallback: false };
  }

  // Client-side rule-based fallback
  const directEndpoints = INITIAL_ENDPOINTS.filter((e) => e.serviceId === targetServiceId);
  const breakages: any[] = [];
  const impactedSquads = new Set<string>();

  for (const ep of directEndpoints) {
    for (const fc of ep.fieldContracts) {
      const removedRegex = new RegExp(`^[-–]\\s*["']?${fc.fieldName}["']?\\s*:`, 'm');
      const removedKey = new RegExp(`^[-–].*\\b${fc.fieldName}\\b`, 'm');
      const isRemoved = removedRegex.test(diff) || (removedKey.test(diff) && !diff.includes(`+   ${fc.fieldName}:`));
      const isTypeChanged = diff.includes(fc.fieldName) && /type:\\s*['"]?(?:number|object|boolean)['"]?/i.test(diff);
      const isNewRequired = !fc.required && /required:\\s*true/i.test(diff) && diff.includes(fc.fieldName);

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
              impactDescription: `Downstream service relies on '${fc.fieldName}' in production. Contract delta triggers failure.`,
            };
          });

        breakages.push({
          fieldName: fc.fieldName,
          changeType,
          previousContract: `${fc.dataType} (${fc.required ? 'required' : 'optional'})`,
          proposedDiff: isRemoved ? 'FIELD DROPPED' : isTypeChanged ? 'TYPE MUTATED' : 'BECAME REQUIRED',
          severity: affectedConsumers.some((c) => c.criticality === 'critical') ? 'CRITICAL' : 'HIGH',
          affectedConsumers,
        });
      }
    }
  }

  const overallVerdict = breakages.length === 0 ? 'HEALTHY_COMPATIBLE' : 'BREAKING_CHANGE_BLOCKED';
  const blastRadiusScore = Math.min(100, breakages.length * 35 + impactedSquads.size * 15);

  return {
    result: {
      overallVerdict,
      breakages,
      blastRadiusScore,
      affectedSquads: Array.from(impactedSquads),
      suggestedPatches: [],
      reasoningNotes: `Analysis performed via Sentinel deterministic contract delta engine. ${breakages.length} breaking changes flagged across ${impactedSquads.size} teams.`,
    },
    isFallback: true,
  };
}

// ---------------------------------------------------------------
// Contract Decisions (contradiction rulings)
// ---------------------------------------------------------------
export interface ContractDecisionPayload {
  contradictionId: string;
  serviceId?: string;
  field: string;
  attribute: string;
  claimA: string;
  sourceA: string;
  claimB: string;
  sourceB: string;
  chosen: 'A' | 'B';
  reason?: string;
}

export async function submitContractDecision(payload: ContractDecisionPayload, role: string) {
  return safeApiFetch<{ decision: unknown; store: string }>('/api/decisions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-sentinel-role': role },
    body: JSON.stringify(payload),
  });
}
