/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RBAC Permissions Definition & Policy Engine
 * ChronoGraph - Autonomous Cross-System Breaking-Change Sentinel
 */

export type UserRole = 'admin' | 'developer' | 'viewer';

export type Permission =
  | 'dashboard:view'
  | 'graph:traverse'
  | 'mcp:query'
  | 'agent:analyze'
  | 'patch:generate'
  | 'patch:apply'
  | 'override:approve'
  | 'export:csv'
  | 'export:pdf'
  | 'rbac:manage'
  | 'sanity:mutate';

export interface SentinelUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  teams: string[];
  serviceRestrictions?: string[]; // IDs of services allowed, or undefined for global
}

/**
 * Role-Permission Access Control Matrix
 * - Admin: Full access to all operations, patching, mutations, and user management.
 * - Developer: Can inspect dependencies, trigger MCP traversals, analyze diffs, generate patches, and export.
 * - Viewer: Read-only access to dashboard, system graphs, metrics, and audit logs.
 */
export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  admin: [
    'dashboard:view',
    'graph:traverse',
    'mcp:query',
    'agent:analyze',
    'patch:generate',
    'patch:apply',
    'override:approve',
    'export:csv',
    'export:pdf',
    'rbac:manage',
    'sanity:mutate',
  ],
  developer: [
    'dashboard:view',
    'graph:traverse',
    'mcp:query',
    'agent:analyze',
    'patch:generate',
    'export:csv',
    'export:pdf',
  ],
  viewer: [
    'dashboard:view',
    'graph:traverse',
    'export:csv',
    'export:pdf',
  ],
} as const;

/**
 * Validates whether a given user possesses the required permission.
 */
export function hasPermission(user: SentinelUser | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  const userRole = user.role || 'viewer';
  const permissions = ROLE_PERMISSIONS[userRole];
  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * Validates whether a user can operate on a specific service (scope check).
 */
export function canAccessService(user: SentinelUser, serviceId: string): boolean {
  if (user.role === 'admin') return true;
  if (!user.serviceRestrictions || user.serviceRestrictions.length === 0) return true;
  return user.serviceRestrictions.includes(serviceId);
}

/**
 * Predefined default users for authentication simulation and testing.
 */
export const SYSTEM_USERS: Record<UserRole, SentinelUser> = {
  admin: {
    id: 'usr_admin_001',
    email: 'alex.chen@sentinel.internal',
    name: 'Alex Chen (Staff Sentinel Architect)',
    role: 'admin',
    teams: ['infrastructure-core', 'sentinel-leads'],
  },
  developer: {
    id: 'usr_dev_042',
    email: 'maya.lin@sentinel.internal',
    name: 'Maya Lin (Senior Platform Engineer)',
    role: 'developer',
    teams: ['checkout-platform', 'api-guild'],
  },
  viewer: {
    id: 'usr_view_099',
    email: 'jordan.taylor@sentinel.internal',
    name: 'Jordan Taylor (SOC2 Compliance Auditor)',
    role: 'viewer',
    teams: ['compliance-and-security'],
  },
};
