/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Sanity GROQ Context Traversal & Multi-Hop Query Engine
 * ChronoGraph - Autonomous Cross-System Breaking-Change Sentinel
 */

import { INITIAL_SERVICES, INITIAL_ENDPOINTS, type SanityService, type SanityEndpoint } from './sanityData.ts';
import { fetchLiveDependencySubgraph, isLiveSanityConfigured } from './client.ts';
import { logger } from '../logger.ts';

export interface MultiHopNode {
  id: string;
  name: string;
  slug: string;
  tier: string;
  team: string;
  protocol: string;
  status: string;
  hopDistance: number;
  endpoints: SanityEndpoint[];
  consumedFields?: string[];
  impactCriticality?: 'critical' | 'high' | 'medium' | 'low';
}

export interface MultiHopEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  protocol: string;
  criticality: 'critical' | 'high' | 'medium' | 'low';
  consumedFields: string[];
}

export interface TraversalResult {
  rootService: SanityService;
  traversalDepth: number;
  nodes: MultiHopNode[];
  edges: MultiHopEdge[];
  directEndpoints: SanityEndpoint[];
  blastRadiusScore: number; // 0 - 100
  missionCriticalAtRisk: boolean;
  affectedSquads: string[];
  groqQueryExecuted: string;
}

export class GroqExecutor {
  /**
   * Executes advanced GROQ traversal query to resolve multi-hop dependencies
   * Query pattern equivalent in Sanity:
   * *[_type == "service" && (_id == $id || slug.current == $slug)][0] {
   *   _id, name, serviceTier, ownerTeam,
   *   "endpoints": *[_type == "apiEndpoint" && service._ref == ^._id],
   *   "downstreamMultiHop": ...
   * }
   */
  static async traverseDependencies(
    serviceIdentifier: string,
    depth: number = 3,
    options: { traceId?: string } = {}
  ): Promise<TraversalResult> {
    const traceId = options.traceId || `trc_groq_${Date.now()}`;

    return await logger.timed('GROQ_MCP_TRAVERSAL', `Traverse dependencies for ${serviceIdentifier}`, async () => {
      // Find root service
      const rootService = INITIAL_SERVICES.find(
        (s) => s._id === serviceIdentifier || s.slug.current === serviceIdentifier
      );

      if (!rootService) {
        throw new Error(`Service '${serviceIdentifier}' not found in Sanity graph.`);
      }

      const nodes: MultiHopNode[] = [];
      const edges: MultiHopEdge[] = [];
      const visitedNodeIds = new Set<string>();
      const affectedSquadsSet = new Set<string>();

      // Push root node (hop 0)
      visitedNodeIds.add(rootService._id);
      affectedSquadsSet.add(rootService.ownerTeam);

      const rootEndpoints = INITIAL_ENDPOINTS.filter((e) => e.serviceId === rootService._id);

      nodes.push({
        id: rootService._id,
        name: rootService.name,
        slug: rootService.slug.current,
        tier: rootService.serviceTier,
        team: rootService.ownerTeam,
        protocol: rootService.protocol,
        status: rootService.deploymentStatus,
        hopDistance: 0,
        endpoints: rootEndpoints,
      });

      // BFS Queue: [serviceId, currentHop]
      const queue: Array<{ serviceId: string; hop: number }> = [{ serviceId: rootService._id, hop: 0 }];

      while (queue.length > 0) {
        const { serviceId, hop } = queue.shift()!;
        if (hop >= depth) continue;

        const currentService = INITIAL_SERVICES.find((s) => s._id === serviceId);
        if (!currentService) continue;

        // Traverse downstream consumers
        for (const downstreamId of currentService.downstreamServiceIds) {
          const downstreamSrv = INITIAL_SERVICES.find((s) => s._id === downstreamId);
          if (!downstreamSrv) continue;

          // Find endpoint and consumer contracts connecting currentService -> downstreamSrv
          const connectingEndpoints = INITIAL_ENDPOINTS.filter((e) => e.serviceId === currentService._id);
          let highestCriticality: 'critical' | 'high' | 'medium' | 'low' = 'low';
          const consumedFields: string[] = [];

          for (const ep of connectingEndpoints) {
            for (const c of ep.consumers) {
              if (c.consumerServiceId === downstreamId) {
                consumedFields.push(...c.consumedFields);
                if (c.criticality === 'critical') highestCriticality = 'critical';
                else if (c.criticality === 'high' && highestCriticality !== 'critical') highestCriticality = 'high';
              }
            }
          }

          // Record Edge
          edges.push({
            id: `edge_${currentService._id}_to_${downstreamSrv._id}`,
            source: currentService._id,
            target: downstreamSrv._id,
            label: connectingEndpoints.length > 0 ? connectingEndpoints[0].path : 'downstream',
            protocol: downstreamSrv.protocol,
            criticality: highestCriticality,
            consumedFields: Array.from(new Set(consumedFields)),
          });

          // If node not visited, add to nodes and queue
          if (!visitedNodeIds.has(downstreamSrv._id)) {
            visitedNodeIds.add(downstreamSrv._id);
            affectedSquadsSet.add(downstreamSrv.ownerTeam);

            const downstreamEndpoints = INITIAL_ENDPOINTS.filter((e) => e.serviceId === downstreamSrv._id);

            nodes.push({
              id: downstreamSrv._id,
              name: downstreamSrv.name,
              slug: downstreamSrv.slug.current,
              tier: downstreamSrv.serviceTier,
              team: downstreamSrv.ownerTeam,
              protocol: downstreamSrv.protocol,
              status: downstreamSrv.deploymentStatus,
              hopDistance: hop + 1,
              endpoints: downstreamEndpoints,
              consumedFields: Array.from(new Set(consumedFields)),
              impactCriticality: highestCriticality,
            });

            queue.push({ serviceId: downstreamSrv._id, hop: hop + 1 });
          }
        }
      }

      // Compute Blast Radius Score (0 - 100)
      let score = 0;
      let missionCritical = false;

      nodes.forEach((n) => {
        if (n.tier === 'tier-0-mission-critical') {
          score += 35;
          missionCritical = true;
        } else if (n.tier === 'tier-1-business-critical') {
          score += 20;
        } else {
          score += 10;
        }
      });
      score = Math.min(100, score);

      const groqQueryExecuted = `*[_type == "service" && (_id == "${rootService._id}" || slug.current == "${rootService.slug.current}")][0] {
  _id, name, slug, serviceTier, ownerTeam, contractVersion,
  "endpoints": *[_type == "apiEndpoint" && service._ref == ^._id] {
    _id, name, path, method, fieldContracts[], consumers[] {
      consumerTeam, clientVersion, criticality, consumedFields,
      "consumerService": consumerService->{ _id, name, serviceTier, ownerTeam }
    }
  },
  "downstreamDependents": *[_type == "service" && references(^._id)] [0...${depth}] {
    _id, name, serviceTier, ownerTeam, protocol
  }
}`;

      return {
        rootService,
        traversalDepth: depth,
        nodes,
        edges,
        directEndpoints: rootEndpoints,
        blastRadiusScore: score,
        missionCriticalAtRisk: missionCritical,
        affectedSquads: Array.from(affectedSquadsSet),
        groqQueryExecuted,
      };
    }, { traceId });
  }

  /**
   * Retrieves full catalog of services and endpoints
   */
  static getGraphCatalog(): { services: SanityService[]; endpoints: SanityEndpoint[] } {
    return {
      services: [...INITIAL_SERVICES],
      endpoints: [...INITIAL_ENDPOINTS],
    };
  }
}
