/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Sanity Context Model Context Protocol (MCP) Server Endpoint
 * ChronoGraph - Autonomous Cross-System Breaking-Change Sentinel
 * 
 * Executes advanced multi-hop GROQ queries to traverse live system dependencies,
 * active API contracts, and downstream consumer usage matrices.
 */

import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequestContext } from '@/lib/rbac/authMiddleware.ts';
import { GroqExecutor } from '@/lib/sanity/groqExecutor.ts';
import { logger } from '@/lib/logger.ts';

/**
 * MCP Tool Definition for Context Resolution
 */
export const MCP_TOOL_DEFINITION = {
  name: 'sanity_traverse_system_context',
  description: 'Traverses multi-hop microservice dependencies, active API contracts, and consumer matrices in the Sanity Content Lake.',
  parameters: {
    type: 'object',
    properties: {
      serviceId: {
        type: 'string',
        description: 'Target service identifier or slug (e.g. srv_billing_core or billing-invoicing-engine)',
      },
      depth: {
        type: 'number',
        description: 'Multi-hop traversal depth (1 to 5 hops). Default is 3.',
        default: 3,
      },
      includeFieldContracts: {
        type: 'boolean',
        description: 'Whether to include granular AST field contracts and nullability assertions.',
        default: true,
      },
    },
    required: ['serviceId'],
  },
};

/**
 * POST Handler: Executes GROQ context query for AI Agents / MCP clients
 */
export const POST = withAuth(
  async (req: Request, context: AuthenticatedRequestContext) => {
    const { user, traceId } = context;
    const body = await req.json().catch(() => ({}));

    // Accept both standard REST payload and MCP JSON-RPC format
    const serviceId = body.serviceId || body.params?.arguments?.serviceId || 'srv_billing_core';
    const depth = Math.min(5, Math.max(1, Number(body.depth || body.params?.arguments?.depth || 3)));

    logger.audit('MCP_CONTEXT_REQUEST', `User ${user.email} (${user.role}) initiated MCP GROQ traversal for '${serviceId}' [depth: ${depth}]`, {
      traceId,
      userId: user.id,
      userRole: user.role,
      metadata: { serviceId, depth },
    });

    try {
      const traversal = await GroqExecutor.traverseDependencies(serviceId, depth, { traceId });

      // Format in standard MCP Context protocol object
      const mcpResponse = {
        jsonrpc: '2.0',
        id: body.id || `mcp_${Date.now()}`,
        result: {
          contextType: 'sanity.graph.system-dependencies',
          timestamp: new Date().toISOString(),
          requestedBy: {
            userId: user.id,
            email: user.email,
            role: user.role,
          },
          target: {
            serviceId: traversal.rootService._id,
            serviceName: traversal.rootService.name,
            serviceTier: traversal.rootService.serviceTier,
            contractVersion: traversal.rootService.contractVersion,
            ownerTeam: traversal.rootService.ownerTeam,
            onCallSlack: traversal.rootService.onCallSlack,
          },
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
      };

      return NextResponse.json(mcpResponse, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'x-trace-id': traceId,
          'x-mcp-server': 'chronograph-sanity-sentinel/v2',
        },
      });
    } catch (err: any) {
      logger.error('MCP_TRAVERSAL_FAILED', `Failed to execute GROQ traversal for '${serviceId}': ${err?.message}`, {
        traceId,
        userId: user.id,
        metadata: { serviceId, error: err?.message },
      });

      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id: body.id || null,
          error: {
            code: -32603,
            message: `GROQ context traversal failed: ${err?.message}`,
            data: { traceId, serviceId },
          },
        },
        { status: 404 }
      );
    }
  },
  { requiredPermission: 'mcp:query' }
);

/**
 * GET Handler: Returns MCP Server Capability Manifest and registered schema tools
 */
export async function GET(req: Request) {
  return NextResponse.json({
    name: 'chronograph-sanity-mcp',
    version: '2.1.0',
    protocolVersion: '2024-11-05',
    capabilities: {
      tools: [MCP_TOOL_DEFINITION],
      resources: {
        'sanity://services': 'All indexed microservices in the Sanity Content Lake',
        'sanity://endpoints': 'All published API endpoint contracts',
        'sanity://consumers': 'Active downstream consumer telemetry bindings',
      },
    },
    systemCatalogSummary: GroqExecutor.getGraphCatalog(),
  });
}
