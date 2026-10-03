/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Sanity Schema: User Role & Sentinel Access Control (RBAC)
 * ChronoGraph - Autonomous Cross-System Breaking-Change Sentinel
 * 
 * Defines users, security clearances, assigned roles (Admin, Developer, Viewer),
 * team associations, and Sanity dataset mutation policies.
 */

export interface UserRoleDocument {
  _id: string;
  _type: 'userRole';
  userId: string;
  email: string;
  displayName: string;
  role: 'admin' | 'developer' | 'viewer';
  assignedTeams: string[];
  serviceRestrictions?: Array<{ _ref: string; _type: 'reference' }>;
  canApproveBreakingChanges: boolean;
  canDeployMigrationPatches: boolean;
  canExportAuditDumps: boolean;
  apiKeyHash?: string;
  lastActiveAt?: string;
}

export const userRoleSchema = {
  name: 'userRole',
  title: 'Sentinel RBAC Identity',
  type: 'document',
  icon: () => '🛡️',
  fields: [
    {
      name: 'userId',
      title: 'User Canonical ID',
      type: 'string',
      description: 'Clerk / Auth0 / Sanity Studio User Subject UUID',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'email',
      title: 'Engineer Email',
      type: 'string',
      validation: (Rule: any) => Rule.required().email(),
    },
    {
      name: 'displayName',
      title: 'Display Name',
      type: 'string',
    },
    {
      name: 'role',
      title: 'Assigned RBAC Role',
      type: 'string',
      options: {
        list: [
          { title: 'Admin (Full privileges: Analyze, Patch, Override, Manage Roles)', value: 'admin' },
          { title: 'Developer (Analyze code diffs, trigger MCP queries, view graph)', value: 'developer' },
          { title: 'Viewer (Read-only dashboard, system graph, metrics & audit logs)', value: 'viewer' },
        ],
        layout: 'radio',
      },
      initialValue: 'developer',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'assignedTeams',
      title: 'Assigned Engineering Squads',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        layout: 'tags',
      },
    },
    {
      name: 'serviceRestrictions',
      title: 'Restricted Services Scope',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'service' }] }],
      description: 'Optional scope limitation. If empty, role applies globally across all services.',
    },
    {
      name: 'canApproveBreakingChanges',
      title: 'Can Override / Approve Breaking Changes',
      type: 'boolean',
      initialValue: false,
    },
    {
      name: 'canDeployMigrationPatches',
      title: 'Can Commit Automated Migration Patches to Sanity Lake',
      type: 'boolean',
      initialValue: false,
    },
    {
      name: 'canExportAuditDumps',
      title: 'Can Export CSV/PDF Sentinel Audit Reports',
      type: 'boolean',
      initialValue: true,
    },
    {
      name: 'lastActiveAt',
      title: 'Last Active Timestamp',
      type: 'datetime',
    },
  ],
  preview: {
    select: {
      title: 'displayName',
      subtitle: 'email',
      role: 'role',
    },
    prepare({ title, subtitle, role }: any) {
      return {
        title: title || subtitle || 'Unnamed User',
        subtitle: `Role: ${(role || 'viewer').toUpperCase()} | ${subtitle}`,
      };
    },
  },
};

export default userRoleSchema;
