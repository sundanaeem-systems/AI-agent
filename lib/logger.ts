/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * High-Performance Observability & Audit Logger
 * ChronoGraph - Autonomous Cross-System Breaking-Change Sentinel
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'AUDIT';

export interface StructuredLogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  service: string;
  event: string;
  traceId: string;
  userId?: string;
  userRole?: string;
  message: string;
  durationMs?: number;
  metadata?: Record<string, any>;
}

// In-memory circular log buffer for live developer dashboard streaming
const MAX_LOG_BUFFER_SIZE = 250;
const logBuffer: StructuredLogEntry[] = [];

// Seed initial system logs for realistic audit trail on load
const seedLogs: StructuredLogEntry[] = [
  {
    id: 'log_seed_001',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    level: 'INFO',
    service: 'sanity-lake-sync',
    event: 'GRAPH_INDEXED',
    traceId: 'trc_init_8291',
    userId: 'usr_admin_001',
    userRole: 'admin',
    message: 'Loaded 8 microservice contracts and 14 API endpoints from Sanity Content Lake.',
    metadata: { totalNodes: 22, edgesCount: 38 },
  },
  {
    id: 'log_seed_002',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    level: 'AUDIT',
    service: 'mcp-context-server',
    event: 'MCP_TRAVERSAL_COMPLETE',
    traceId: 'trc_mcp_1024',
    userId: 'usr_dev_042',
    userRole: 'developer',
    message: 'Traversed 3-hop dependency subgraph for billing-service -> order-orchestrator -> mobile-app.',
    durationMs: 42,
    metadata: { target: 'billing-service', hops: 3 },
  },
  {
    id: 'log_seed_003',
    timestamp: new Date(Date.now() - 900000).toISOString(),
    level: 'WARN',
    service: 'sentinel-sentinel-ai',
    event: 'DEPRECATION_WARNING',
    traceId: 'trc_dep_9021',
    userId: 'usr_dev_042',
    userRole: 'developer',
    message: 'Contract field `legacyTaxCode` is slated for sunset in 14 days with 2 downstream consumers.',
    metadata: { endpoint: '/v1/customers/:id/billing', consumers: ['checkout-web', 'analytics-pipeline'] },
  },
];

logBuffer.push(...seedLogs);

export class SentinelLogger {
  private serviceName: string;

  constructor(serviceName: string = 'chronograph-sentinel') {
    this.serviceName = serviceName;
  }

  private write(level: LogLevel, event: string, message: string, options: {
    traceId?: string;
    userId?: string;
    userRole?: string;
    durationMs?: number;
    metadata?: Record<string, any>;
  } = {}) {
    const entry: StructuredLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      event,
      traceId: options.traceId || `trc_${Math.random().toString(36).substring(2, 10)}`,
      userId: options.userId,
      userRole: options.userRole,
      message,
      durationMs: options.durationMs,
      metadata: options.metadata,
    };

    // Push into circular buffer
    logBuffer.unshift(entry);
    if (logBuffer.length > MAX_LOG_BUFFER_SIZE) {
      logBuffer.pop();
    }

    // Standardized stdout output for cloud observability (Datadog / CloudWatch / GCP Logging)
    const logLine = JSON.stringify(entry);
    if (level === 'ERROR') {
      console.error(logLine);
    } else if (level === 'WARN') {
      console.warn(logLine);
    } else {
      console.log(logLine);
    }

    return entry;
  }

  info(event: string, message: string, options = {}) {
    return this.write('INFO', event, message, options);
  }

  warn(event: string, message: string, options = {}) {
    return this.write('WARN', event, message, options);
  }

  error(event: string, message: string, options = {}) {
    return this.write('ERROR', event, message, options);
  }

  audit(event: string, message: string, options = {}) {
    return this.write('AUDIT', event, message, options);
  }

  debug(event: string, message: string, options = {}) {
    return this.write('DEBUG', event, message, options);
  }

  /**
   * Helper to measure async execution time and emit structured metric
   */
  async timed<T>(
    event: string,
    operationName: string,
    fn: () => Promise<T>,
    options: { traceId?: string; userId?: string; userRole?: string; metadata?: Record<string, any> } = {}
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const durationMs = Math.round(performance.now() - start);
      this.info(event, `Operation '${operationName}' succeeded in ${durationMs}ms`, {
        ...options,
        durationMs,
      });
      return result;
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - start);
      this.error(`${event}_FAILED`, `Operation '${operationName}' failed after ${durationMs}ms: ${err?.message}`, {
        ...options,
        durationMs,
        metadata: { ...options.metadata, error: err?.message, stack: err?.stack },
      });
      throw err;
    }
  }

  /**
   * Retrieve in-memory logs for agent visualization widgets
   */
  static getRecentLogs(limit: number = 50, filterLevel?: LogLevel): StructuredLogEntry[] {
    if (!filterLevel) {
      return logBuffer.slice(0, limit);
    }
    return logBuffer.filter((l) => l.level === filterLevel).slice(0, limit);
  }

  /**
   * Push a log directly into the buffer (useful for API route hooks)
   */
  static record(entry: StructuredLogEntry) {
    logBuffer.unshift(entry);
    if (logBuffer.length > MAX_LOG_BUFFER_SIZE) {
      logBuffer.pop();
    }
  }
}

export const logger = new SentinelLogger('sentinel-core');
export default logger;
