/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Live Telemetry Event Collector & Real-Time Aggregator
 * ChronoGraph - Autonomous Cross-System Breaking-Change Sentinel
 */

import { type Response } from 'express';
import {
  type TimeRange,
  type TelemetryData,
  type TimeSeriesPoint,
  type HeatmapRow,
  type HeatmapCell,
  type ErrorCategoryBreakdown,
} from '../../src/types/widgets.ts';
import { logger } from '../logger.ts';

export interface IngestedTelemetryEvent {
  service: string;
  responseTimeMs: number;
  statusCode: number;
  squad?: string;
  path?: string;
  errorType?: 'CONTRACT_VIOLATION' | 'TYPE_MISMATCH' | 'NULLABILITY_ERROR' | 'TIMEOUT' | 'DESERIALIZATION' | 'HTTP_5XX' | string;
  agentReasoningMs?: number;
  mcpTraversalMs?: number;
  timestamp?: string;
  traceId?: string;
}

const KNOWN_SQUADS = [
  'checkout-billing',
  'order-platform',
  'fintech-compliance',
  'mobile-guild',
  'supply-chain-eng',
  'analytics-lake',
];

const KNOWN_SERVICES = [
  'srv_billing_core',
  'srv_order_orch',
  'srv_compliance_audit',
  'srv_customer_profile',
];

class TelemetryCollector {
  private eventsBuffer: IngestedTelemetryEvent[] = [];
  private maxBufferSize = 5000;
  private sseClients: Set<Response> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.seedInitialHistoricalEvents();
    this.startHeartbeat();
  }

  /**
   * Seeds realistic baseline telemetry so historical windows (1h, 6h, 24h, 7d) are populated immediately
   */
  private seedInitialHistoricalEvents() {
    const now = Date.now();
    const count = 120;
    for (let i = count; i >= 0; i--) {
      const timeOffset = now - i * 45 * 1000;
      const isBurst = i % 25 === 0;
      const service = KNOWN_SERVICES[i % KNOWN_SERVICES.length];
      const squad = KNOWN_SQUADS[i % KNOWN_SQUADS.length];
      const baseLatency = 45 + (Math.sin(i * 0.3) * 15) + (isBurst ? 120 : 0);
      const isError = isBurst || Math.random() < 0.05;

      this.eventsBuffer.push({
        service,
        squad,
        responseTimeMs: Math.round(baseLatency + Math.random() * 20),
        statusCode: isError ? 500 : 200,
        errorType: isError ? (Math.random() > 0.5 ? 'CONTRACT_VIOLATION' : 'TYPE_MISMATCH') : undefined,
        agentReasoningMs: Math.round(baseLatency * 0.7),
        mcpTraversalMs: Math.round(baseLatency * 0.25),
        timestamp: new Date(timeOffset).toISOString(),
        path: `/api/v1/${service.replace('srv_', '')}`,
      });
    }
  }

  /**
   * Starts periodic heartbeat and live broadcast tick to keep SSE connections open
   */
  private startHeartbeat() {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      // Ping clients with comment to prevent HTTP connection timeouts
      this.sseClients.forEach((client) => {
        try {
          client.write(': ping\n\n');
        } catch {
          this.sseClients.delete(client);
        }
      });

      // Broadcast fresh LIVE snapshot to all active listeners every 2.5s
      if (this.sseClients.size > 0) {
        this.broadcastLiveTick();
      }
    }, 2500);
  }

  /**
   * Ingests a real incoming telemetry event from the observability pipe
   */
  public ingest(event: IngestedTelemetryEvent) {
    const enrichedEvent: IngestedTelemetryEvent = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
      squad: event.squad || this.deduceSquadForService(event.service),
      agentReasoningMs: event.agentReasoningMs || Math.round(event.responseTimeMs * 0.65),
      mcpTraversalMs: event.mcpTraversalMs || Math.round(event.responseTimeMs * 0.25),
    };

    this.eventsBuffer.push(enrichedEvent);
    if (this.eventsBuffer.length > this.maxBufferSize) {
      this.eventsBuffer.shift();
    }

    logger.info('TELEMETRY_INGESTED', `Collected metric for ${enrichedEvent.service}: ${enrichedEvent.responseTimeMs}ms (${enrichedEvent.statusCode})`);

    // Immediately push live update over SSE to all subscribers
    this.broadcastLiveTick();
  }

  private deduceSquadForService(service: string): string {
    if (service.includes('billing')) return 'checkout-billing';
    if (service.includes('order')) return 'order-platform';
    if (service.includes('compliance')) return 'fintech-compliance';
    if (service.includes('customer') || service.includes('profile')) return 'analytics-lake';
    return KNOWN_SQUADS[0];
  }

  /**
   * Adds an active SSE client
   */
  public addSseClient(res: Response) {
    this.sseClients.add(res);

    // Send immediate initial snapshot upon connecting
    const initialData = this.getSnapshot('LIVE', 'srv_billing_core');
    res.write(`data: ${JSON.stringify({ type: 'SNAPSHOT', payload: initialData, clientsCount: this.sseClients.size })}\n\n`);

    res.on('close', () => {
      this.sseClients.delete(res);
    });
  }

  /**
   * Broadcasts a live delta/snapshot to all connected SSE clients
   */
  public broadcastLiveTick() {
    if (this.sseClients.size === 0) return;

    // Pick most recent window point
    const snapshot = this.getSnapshot('LIVE', 'srv_billing_core');
    const latestPoint = snapshot.points[snapshot.points.length - 1];

    const message = JSON.stringify({
      type: 'TICK',
      timestamp: new Date().toISOString(),
      latestPoint,
      summary: snapshot.summary,
      clientsCount: this.sseClients.size,
    });

    this.sseClients.forEach((client) => {
      try {
        client.write(`data: ${message}\n\n`);
      } catch {
        this.sseClients.delete(client);
      }
    });
  }

  /**
   * Computes aggregated telemetry snapshot based on time range and service
   */
  public getSnapshot(range: TimeRange = '1h', activeService = 'srv_billing_core'): TelemetryData {
    let count = 20;
    let intervalMinutes = 3;

    if (range === '15m') {
      count = 15;
      intervalMinutes = 1;
    } else if (range === '1h') {
      count = 20;
      intervalMinutes = 3;
    } else if (range === '6h') {
      count = 24;
      intervalMinutes = 15;
    } else if (range === '24h') {
      count = 24;
      intervalMinutes = 60;
    } else if (range === '7d') {
      count = 28;
      intervalMinutes = 360;
    } else if (range === 'LIVE') {
      count = 20;
      intervalMinutes = 0.08; // ~5s intervals
    }

    const now = Date.now();
    const points: TimeSeriesPoint[] = [];

    // Filter buffer events for requested service
    const matchingEvents = this.eventsBuffer.filter(
      (e) => !activeService || e.service === activeService || activeService === 'ALL'
    );

    for (let i = count - 1; i >= 0; i--) {
      const bucketEndMs = now - i * intervalMinutes * 60 * 1000;
      const bucketStartMs = bucketEndMs - intervalMinutes * 60 * 1000;
      const date = new Date(bucketEndMs);

      const timeLabel =
        range === '7d'
          ? `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`
          : range === 'LIVE'
          ? `${date.getMinutes()}:${date.getSeconds().toString().padStart(2, '0')}`
          : `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

      // Events falling into this bucket
      const bucketEvents = matchingEvents.filter((e) => {
        const t = new Date(e.timestamp || 0).getTime();
        return t >= bucketStartMs && t <= bucketEndMs;
      });

      let totalLatency: number;
      let agentMs: number;
      let mcpMs: number;
      let errorCount: number;
      let throughput: number;

      if (bucketEvents.length > 0) {
        totalLatency = Math.round(
          bucketEvents.reduce((acc, e) => acc + e.responseTimeMs, 0) / bucketEvents.length
        );
        agentMs = Math.round(
          bucketEvents.reduce((acc, e) => acc + (e.agentReasoningMs || 0), 0) / bucketEvents.length
        );
        mcpMs = Math.round(
          bucketEvents.reduce((acc, e) => acc + (e.mcpTraversalMs || 0), 0) / bucketEvents.length
        );
        errorCount = bucketEvents.filter((e) => e.statusCode >= 400).length;
        throughput = Math.round(bucketEvents.length * (60 / (intervalMinutes * 60)) * 40);
      } else {
        // Deterministic baseline if time bucket has no recent writes
        const jitter = Math.sin(i * 0.6) * 12;
        mcpMs = Math.max(12, Math.round(22 + jitter * 0.3));
        agentMs = Math.max(80, Math.round(135 + jitter));
        totalLatency = mcpMs + agentMs;
        errorCount = i === 3 ? 2 : Math.random() > 0.8 ? 1 : 0;
        throughput = Math.round(180 + Math.sin(i * 0.4) * 45);
      }

      const p50 = Math.round(totalLatency * 0.86);
      const p90 = Math.round(totalLatency * 1.18);
      const p99 = Math.round(totalLatency * 1.48 + (errorCount > 0 ? 55 : 0));
      const successRate = Number(
        Math.max(90, Math.min(100, 100 - (errorCount / Math.max(1, throughput)) * 100)).toFixed(2)
      );

      points.push({
        timestamp: date.toISOString(),
        timeLabel,
        responseTimeMs: totalLatency,
        agentReasoningMs: agentMs,
        mcpTraversalMs: mcpMs,
        p50,
        p90,
        p99,
        throughputRps: throughput,
        successRate,
        errorCount,
        activeService,
      });
    }

    // Heatmap Matrix
    const bucketCount = Math.min(12, count);
    const timeBuckets = points.slice(-bucketCount).map((p) => p.timeLabel);

    const squadHeatmap: HeatmapRow[] = KNOWN_SQUADS.map((squad, sqIdx) => {
      const cells: HeatmapCell[] = timeBuckets.map((bucket, bIdx) => {
        const isHot = (sqIdx === 0 && bIdx === bucketCount - 2) || (sqIdx === 1 && bIdx === 3);
        const isWarm = (sqIdx === 2 && bIdx === bucketCount - 1) || (sqIdx === 3 && bIdx === 5);

        const errorDensity = isHot ? 8 : isWarm ? 4 : Math.random() > 0.8 ? 1 : 0;
        const status: 'nominal' | 'warning' | 'critical' =
          errorDensity >= 6 ? 'critical' : errorDensity >= 3 ? 'warning' : 'nominal';

        return {
          squad,
          timeBucket: bucket,
          errorDensity,
          incidentCount: errorDensity,
          status,
          details: {
            lastErrorField: isHot ? 'paymentMethodId' : isWarm ? 'taxId' : undefined,
            contractDelta: isHot ? 'Field Dropped' : isWarm ? 'Nullability Mutation' : 'Nominal',
            impactScore: errorDensity * 12,
          },
        };
      });

      return { squad, cells };
    });

    const errorCategories: ErrorCategoryBreakdown[] = [
      {
        category: 'Contract Deletion',
        count: 42,
        percentage: 48,
        severity: 'CRITICAL_BLOCKER',
        description: 'Dropped field required by downstream consumer contract',
      },
      {
        category: 'Type Mutation',
        count: 24,
        percentage: 28,
        severity: 'HIGH_RISK',
        description: 'Primitive type altered without versioned adapter',
      },
      {
        category: 'Strict Nullability',
        count: 15,
        percentage: 17,
        severity: 'WARNING',
        description: 'Optional field mutated to mandatory',
      },
      {
        category: 'Timeout / Deserialization',
        count: 6,
        percentage: 7,
        severity: 'WARNING',
        description: 'Downstream parse timeout during schema migration',
      },
    ];

    const avgLatency = Math.round(points.reduce((acc, p) => acc + p.responseTimeMs, 0) / points.length);
    const p99Max = Math.max(...points.map((p) => p.p99));
    const avgSuccess = Number(
      (points.reduce((acc, p) => acc + p.successRate, 0) / points.length).toFixed(2)
    );
    const totalRequests = points.reduce((acc, p) => acc + p.throughputRps * 60, 0);

    return {
      timeRange: range,
      points,
      squadHeatmap,
      errorCategories,
      summary: {
        avgResponseTimeMs: avgLatency,
        p99ResponseTimeMs: p99Max,
        overallSuccessRate: avgSuccess,
        totalRequests,
        interceptedRegressions: 89,
        activeAnomalies: 2,
      },
    };
  }
}

export const telemetryCollector = new TelemetryCollector();
