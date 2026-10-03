/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Client Hook: Real-Time SSE Telemetry Observability Pipe
 * ChronoGraph - Autonomous Cross-System Breaking-Change Sentinel
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { type TimeRange, type TelemetryData, type TimeSeriesPoint } from '../types/widgets.ts';
import { generateTelemetryData } from './telemetryData.ts';

export interface UseLiveTelemetryOptions {
  timeRange: TimeRange;
  activeService: string;
  enabled?: boolean;
}

export function useLiveTelemetry({
  timeRange,
  activeService,
  enabled = true,
}: UseLiveTelemetryOptions) {
  const [telemetry, setTelemetry] = useState<TelemetryData>(() =>
    generateTelemetryData(timeRange, activeService)
  );
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectedClients, setConnectedClients] = useState<number>(1);
  const [lastTickAt, setLastTickAt] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch full snapshot when range or service changes
  const fetchSnapshot = useCallback(async () => {
    try {
      const res = await fetch(`/api/telemetry/timeseries?range=${timeRange}&service=${activeService}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setTelemetry(json.data);
          return;
        }
      }
    } catch {
      // Fallback to local generator if API is starting
    }
    setTelemetry(generateTelemetryData(timeRange, activeService));
  }, [timeRange, activeService]);

  // Initial fetch and on parameter changes
  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  // Connect to SSE stream for live updates
  useEffect(() => {
    if (!enabled) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    try {
      const es = new EventSource('/api/telemetry/stream');
      eventSourceRef.current = es;

      es.onopen = () => {
        setIsConnected(true);
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastTickAt(new Date().toISOString());

          if (data.clientsCount) {
            setConnectedClients(data.clientsCount);
          }

          if (data.type === 'SNAPSHOT' && data.payload) {
            setTelemetry(data.payload);
          } else if (data.type === 'TICK' && data.latestPoint) {
            setTelemetry((prev) => {
              const updatedPoints: TimeSeriesPoint[] = [...prev.points.slice(1), data.latestPoint];
              return {
                ...prev,
                points: updatedPoints,
                summary: data.summary || prev.summary,
              };
            });
          }
        } catch {
          // Ignore malformed heartbeats
        }
      };

      es.onerror = () => {
        setIsConnected(false);
        // EventSource automatically handles reconnection
      };

      return () => {
        es.close();
        eventSourceRef.current = null;
        setIsConnected(false);
      };
    } catch (e) {
      console.warn('SSE stream error, continuing with snapshot:', e);
      setIsConnected(false);
    }
  }, [enabled, timeRange, activeService]);

  // Utility to send an event into the collector pipe
  const emitTelemetryEvent = useCallback(
    async (eventPayload: {
      service: string;
      responseTimeMs: number;
      statusCode?: number;
      squad?: string;
      path?: string;
      errorType?: string;
    }) => {
      try {
        await fetch('/api/telemetry/collect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventPayload),
        });
      } catch (err) {
        console.warn('Failed to emit telemetry event:', err);
      }
    },
    []
  );

  return {
    telemetry,
    setTelemetry,
    isConnected,
    connectedClients,
    lastTickAt,
    refreshSnapshot: fetchSnapshot,
    emitTelemetryEvent,
  };
}
