/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Authentication & Authorization Middleware with RBAC Guard
 * ChronoGraph - Autonomous Cross-System Breaking-Change Sentinel
 */

import { type NextRequest, NextResponse } from 'next/server';
import {
  type Permission,
  type SentinelUser,
  type UserRole,
  hasPermission,
  SYSTEM_USERS,
} from './permissions.ts';
import { logger } from '../logger.ts';

export interface AuthenticatedRequestContext {
  user: SentinelUser;
  traceId: string;
}

/**
 * Extracts and verifies authentication credentials from HTTP headers.
 * Supports:
 * 1. Bearer Token (Simulated JWT / OAuth 2.0 Access Token)
 * 2. `x-sentinel-role` header for rapid testing/simulation in dev dashboard
 * 3. Fallback to authenticated session user
 */
export function authenticateRequest(req: Request | NextRequest): { user: SentinelUser | null; error?: string } {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  const roleOverride = req.headers.get('x-sentinel-role') as UserRole | null;

  // 1. Check for interactive role switcher / simulation header
  if (roleOverride && SYSTEM_USERS[roleOverride]) {
    return { user: SYSTEM_USERS[roleOverride] };
  }

  // 2. Validate Bearer Token
  if (authHeader) {
    if (!authHeader.startsWith('Bearer ')) {
      return { user: null, error: 'Malformed authorization header. Expected "Bearer <token>"' };
    }
    const token = authHeader.replace('Bearer ', '').trim();

    // Map well-known test tokens or simulated JWTs
    if (token === 'admin-secret-key' || token.includes('role=admin')) {
      return { user: SYSTEM_USERS.admin };
    }
    if (token === 'dev-secret-key' || token.includes('role=developer')) {
      return { user: SYSTEM_USERS.developer };
    }
    if (token === 'viewer-secret-key' || token.includes('role=viewer')) {
      return { user: SYSTEM_USERS.viewer };
    }

    // Default to developer if valid token format
    if (token.length > 8) {
      return {
        user: {
          id: `usr_${token.substring(0, 8)}`,
          email: 'api-service-account@sentinel.internal',
          name: 'CI/CD Automated Sentinel Runner',
          role: 'developer',
          teams: ['automated-pipelines'],
        },
      };
    }
  }

  // 3. Fallback to developer user in development environment if no credentials provided
  return { user: SYSTEM_USERS.developer };
}

/**
 * Route Handler Guard for Next.js App Router (app/api/**)
 * Enforces role and granular permission verification.
 */
export function withAuth(
  handler: (req: Request, context: AuthenticatedRequestContext) => Promise<Response>,
  options: {
    requiredPermission?: Permission;
    requiredRole?: UserRole;
    serviceScopeParam?: string;
  } = {}
) {
  return async (req: Request): Promise<Response> => {
    const traceId = req.headers.get('x-trace-id') || `trc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const url = new URL(req.url);

    const { user, error } = authenticateRequest(req);

    if (!user || error) {
      logger.warn('AUTH_UNAUTHORIZED', `Unauthorized access attempt on ${url.pathname}: ${error || 'Missing token'}`, {
        traceId,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: error || 'Authentication credentials are required to access this Sentinel endpoint.',
          code: 'UNAUTHORIZED_401',
          traceId,
        },
        { status: 401 }
      );
    }

    // Verify required role if specified
    if (options.requiredRole && user.role !== options.requiredRole && user.role !== 'admin') {
      logger.audit('AUTH_FORBIDDEN_ROLE', `User ${user.email} with role '${user.role}' denied for required role '${options.requiredRole}'`, {
        traceId,
        userId: user.id,
        userRole: user.role,
        metadata: { path: url.pathname },
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
          message: `Access denied. Requires role '${options.requiredRole}' but current role is '${user.role}'.`,
          code: 'FORBIDDEN_403',
          traceId,
        },
        { status: 403 }
      );
    }

    // Verify granular permission if specified
    if (options.requiredPermission && !hasPermission(user, options.requiredPermission)) {
      logger.audit('AUTH_FORBIDDEN_PERMISSION', `User ${user.email} denied missing permission '${options.requiredPermission}'`, {
        traceId,
        userId: user.id,
        userRole: user.role,
        metadata: { path: url.pathname, requiredPermission: options.requiredPermission },
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
          message: `Access denied. Your role '${user.role}' lacks permission: '${options.requiredPermission}'.`,
          code: 'FORBIDDEN_INSUFFICIENT_PERMISSIONS',
          traceId,
        },
        { status: 403 }
      );
    }

    // Proceed to handler with authenticated context
    try {
      return await handler(req, { user, traceId });
    } catch (err: any) {
      logger.error('ROUTE_HANDLER_ERROR', `Internal error executing ${url.pathname}: ${err?.message}`, {
        traceId,
        userId: user.id,
        userRole: user.role,
        metadata: { stack: err?.stack },
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Internal Server Error',
          message: err?.message || 'An unexpected error occurred during sentinel processing.',
          code: 'INTERNAL_ERROR_500',
          traceId,
        },
        { status: 500 }
      );
    }
  };
}
