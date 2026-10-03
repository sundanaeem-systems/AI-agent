/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RBAC Role Manager & Sanity Identity Bridge
 * ChronoGraph - Autonomous Cross-System Breaking-Change Sentinel
 */

import { type SentinelUser, type UserRole, SYSTEM_USERS } from './permissions.ts';
import { logger } from '../logger.ts';

// In-memory user role registry that synchronizes with Sanity userRole documents
const userRegistry: Map<string, SentinelUser> = new Map([
  [SYSTEM_USERS.admin.id, { ...SYSTEM_USERS.admin }],
  [SYSTEM_USERS.developer.id, { ...SYSTEM_USERS.developer }],
  [SYSTEM_USERS.viewer.id, { ...SYSTEM_USERS.viewer }],
]);

export class RoleManager {
  /**
   * Fetches user profile and assigned role from registry or Sanity userRole schema
   */
  static async getUser(userId: string): Promise<SentinelUser | null> {
    const existing = userRegistry.get(userId);
    if (existing) return existing;

    // Simulate query to Sanity Content Lake:
    // *[_type == "userRole" && userId == $userId][0]
    return null;
  }

  /**
   * Updates a user's role and logs the audit event
   */
  static async updateUserRole(
    targetUserId: string,
    newRole: UserRole,
    performedBy: SentinelUser
  ): Promise<{ success: boolean; updatedUser?: SentinelUser; error?: string }> {
    if (performedBy.role !== 'admin') {
      logger.audit('RBAC_UPDATE_DENIED', `User ${performedBy.email} attempted to elevate user ${targetUserId} to ${newRole} without admin rights`);
      return { success: false, error: 'Only administrators can update user roles.' };
    }

    const user = userRegistry.get(targetUserId);
    if (!user) {
      return { success: false, error: `User with ID '${targetUserId}' not found.` };
    }

    const previousRole = user.role;
    user.role = newRole;
    userRegistry.set(targetUserId, user);

    logger.audit('RBAC_ROLE_CHANGED', `User ${user.email} role changed from ${previousRole} to ${newRole} by ${performedBy.email}`, {
      userId: user.id,
      metadata: { targetUserId, previousRole, newRole, actor: performedBy.email },
    });

    return { success: true, updatedUser: user };
  }

  /**
   * Returns all registered users
   */
  static listUsers(): SentinelUser[] {
    return Array.from(userRegistry.values());
  }
}
