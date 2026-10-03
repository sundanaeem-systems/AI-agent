/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Telemetry Timeseries & Heatmap Generator
 * ChronoGraph - Autonomous Cross-System Breaking-Change Sentinel
 */

import { type TimeRange, type TelemetryData, type TimeSeriesPoint, type HeatmapRow } from '../types/widgets.ts';

const SQUADS = [
  'checkout-billing',
  'order-platform',
  'fintech-compliance',
  'mobile-guild',
  'supply-chain-eng',
  'analytics-lake',
];

const SERVICES = ['srv_billing_core', 'srv_order_orch', 'srv_compliance_audit', 'srv_customer_profile'];

export function generateTelemetryData(range: TimeRange = '1h', activeService = 'srv_billing_core'): TelemetryData {
  let count = 24;
  let intervalMinutes = 2.5;

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
    intervalMinutes = 0.1; // seconds scale
  }

  const now = Date.now();
  const points: TimeSeriesPoint[] = [];

  for (let i = count - 1; i >= 0; i--) {
    const timestampMs = now - i * intervalMinutes * 60 * 1000;
    const date = new Date(timestampMs);

    const timeLabel =
      range === '7d'
        ? `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`
        : range === 'LIVE'
        ? `${date.getMinutes()}:${date.getSeconds().toString().padStart(2, '0')}`
        : `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

    // Base latencies with realistic jitter and occasional burst
    const isBurst = i === 4 || i === 11;
    const baseMcp = 24 + Math.sin(i * 0.7) * 8 + (isBurst ? 35 : 0);
    const baseAgent = 140 + Math.cos(i * 0.5) * 35 + (isBurst ? 110 : 0);
    const totalLatency = Math.round(baseMcp + baseAgent + (Math.random() * 15 - 7));
    const p50 = Math.round(totalLatency * 0.85);
    const p90 = Math.round(totalLatency * 1.15);
    const p99 = Math.round(totalLatency * 1.45 + (isBurst ? 90 : 0));

    // Throughput and error rates
    const throughputRps = Math.round(180 + Math.sin(i * 0.4) * 50 + (Math.random() * 20));
    const errorCount = isBurst ? Math.floor(Math.random() * 4) + 2 : Math.random() > 0.75 ? 1 : 0;
    const successRate = Number((100 - (errorCount / throughputRps) * 100).toFixed(2));

    points.push({
      timestamp: date.toISOString(),
      timeLabel,
      responseTimeMs: totalLatency,
      agentReasoningMs: Math.round(baseAgent),
      mcpTraversalMs: Math.round(baseMcp),
      p50,
      p90,
      p99,
      throughputRps,
      successRate,
      errorCount,
      activeService: SERVICES[i % SERVICES.length],
    });
  }

  // Generate Squad x TimeBucket Heatmap Matrix
  const bucketCount = Math.min(12, count);
  const timeBuckets = points.slice(-bucketCount).map((p) => p.timeLabel);

  const squadHeatmap: HeatmapRow[] = SQUADS.map((squad, sqIdx) => {
    const cells = timeBuckets.map((bucket, bIdx) => {
      // Create interesting deterministic hot spots
      const isHot = (sqIdx === 0 && bIdx === bucketCount - 3) || (sqIdx === 1 && bIdx === 4) || (sqIdx === 2 && bIdx === bucketCount - 1);
      const isWarm = (sqIdx === 3 && bIdx === 6) || (sqIdx === 0 && bIdx === 2);

      const errorDensity = isHot ? Math.floor(Math.random() * 3) + 7 : isWarm ? Math.floor(Math.random() * 3) + 3 : Math.random() > 0.85 ? 1 : 0;
      const status: 'nominal' | 'warning' | 'critical' = errorDensity >= 6 ? 'critical' : errorDensity >= 3 ? 'warning' : 'nominal';

      return {
        squad,
        timeBucket: bucket,
        errorDensity,
        incidentCount: errorDensity,
        status,
        details: {
          lastErrorField: isHot ? 'paymentMethodId' : isWarm ? 'taxId' : undefined,
          contractDelta: isHot ? 'Field Dropped' : isWarm ? 'Strict Nullability' : 'No regressions',
          impactScore: errorDensity * 12,
        },
      };
    });

    return { squad, cells };
  });

  const errorCategories = [
    {
      category: 'Contract Deletion',
      count: 42,
      percentage: 48,
      severity: 'CRITICAL_BLOCKER' as const,
      description: 'Dropping published field contract required by downstream client',
    },
    {
      category: 'Type Mutation',
      count: 24,
      percentage: 28,
      severity: 'HIGH_RISK' as const,
      description: 'Changing primitive schema type (e.g., string UUID to int ID)',
    },
    {
      category: 'Strict Nullability',
      count: 15,
      percentage: 17,
      severity: 'WARNING' as const,
      description: 'Mutating optional nullable attribute to mandatory non-null',
    },
    {
      category: 'Timeout / Deserialization',
      count: 6,
      percentage: 7,
      severity: 'WARNING' as const,
      description: 'Downstream consumer parse failures during schema migration',
    },
  ];

  const avgLatency = Math.round(points.reduce((acc, p) => acc + p.responseTimeMs, 0) / points.length);
  const p99Max = Math.max(...points.map((p) => p.p99));
  const avgSuccessRate = Number(
    (points.reduce((acc, p) => acc + p.successRate, 0) / points.length).toFixed(2)
  );
  const totalReq = points.reduce((acc, p) => acc + p.throughputRps * 60, 0);

  return {
    timeRange: range,
    points,
    squadHeatmap,
    errorCategories,
    summary: {
      avgResponseTimeMs: avgLatency,
      p99ResponseTimeMs: p99Max,
      overallSuccessRate: avgSuccessRate,
      totalRequests: totalReq,
      interceptedRegressions: 87,
      activeAnomalies: 2,
    },
  };
}
