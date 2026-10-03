/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RBAC Role Management Modal
 * ChronoGraph - Autonomous Cross-System Breaking-Change Sentinel
 */

import React, { useState } from 'react';
import { Users, Shield, Key, Check, X, ShieldAlert } from 'lucide-react';
import { type UserRole, SYSTEM_USERS, ROLE_PERMISSIONS, type Permission } from '../../lib/rbac/permissions.ts';

interface RbacModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserRole: UserRole;
  onSelectRole: (role: UserRole) => void;
}

export const RbacModal: React.FC<RbacModalProps> = ({
  isOpen,
  onClose,
  currentUserRole,
  onSelectRole,
}) => {
  const [users, setUsers] = useState([
    { ...SYSTEM_USERS.admin },
    { ...SYSTEM_USERS.developer },
    { ...SYSTEM_USERS.viewer },
  ]);
  const [notification, setNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    if (currentUserRole !== 'admin') {
      setNotification(`Permission Denied: Only users with the 'Admin' role can reassign security clearance. Your current role is '${currentUserRole}'.`);
      setTimeout(() => setNotification(null), 3500);
      return;
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
    setNotification(`Successfully updated user clearance to '${newRole.toUpperCase()}'.`);
    setTimeout(() => setNotification(null), 2500);
  };

  const allPermissions: { key: Permission; label: string }[] = [
    { key: 'dashboard:view', label: 'View Dashboard & System Graph' },
    { key: 'graph:traverse', label: 'Traverse Multi-Hop Subgraphs' },
    { key: 'mcp:query', label: 'Execute Sanity MCP Context Queries' },
    { key: 'agent:analyze', label: 'Run AI Breaking-Change Sentinel' },
    { key: 'patch:generate', label: 'Generate Backward-Compatible Patch' },
    { key: 'patch:apply', label: 'Commit Migration Patch to Sanity Dataset' },
    { key: 'rbac:manage', label: 'Manage Sentinel Roles & Clearances' },
    { key: 'export:csv', label: 'Export Security & Audit Dumps' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold text-base text-slate-100">Role-Based Access Control (RBAC) Engine</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {notification && (
          <div className="px-6 py-2.5 bg-cyan-950/80 border-b border-cyan-800 text-cyan-300 text-xs flex items-center gap-2 font-mono">
            <Key className="w-3.5 h-3.5" />
            <span>{notification}</span>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          {/* Active User Switcher */}
          <div>
            <h4 className="font-semibold text-slate-100 text-xs mb-3 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-cyan-400" />
              Simulate Active Identity & Security Clearance
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(['admin', 'developer', 'viewer'] as UserRole[]).map((r) => {
                const u = SYSTEM_USERS[r];
                const isActive = currentUserRole === r;

                return (
                  <div
                    key={r}
                    onClick={() => onSelectRole(r)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isActive
                        ? 'bg-cyan-950/60 border-cyan-400 ring-2 ring-cyan-500/20'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded ${
                        r === 'admin'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : r === 'developer'
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}>
                        {r}
                      </span>
                      {isActive && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>
                    <div className="font-semibold text-slate-100 text-xs truncate">{u.name}</div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">{u.email}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Granular Permissions Matrix */}
          <div>
            <h4 className="font-semibold text-slate-100 text-xs mb-3 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-cyan-400" />
              RBAC Permissions Matrix
            </h4>
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-950 text-slate-400 font-mono text-[10px]">
                  <tr>
                    <th className="p-3">Capability / Operation</th>
                    <th className="p-3 text-center">Admin</th>
                    <th className="p-3 text-center">Developer</th>
                    <th className="p-3 text-center">Viewer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {allPermissions.map((perm) => (
                    <tr key={perm.key} className="bg-slate-900/40">
                      <td className="p-2.5 font-mono text-slate-300">{perm.label}</td>
                      <td className="p-2.5 text-center">
                        {ROLE_PERMISSIONS.admin.includes(perm.key) ? (
                          <span className="text-emerald-400 font-bold">✓</span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        {ROLE_PERMISSIONS.developer.includes(perm.key) ? (
                          <span className="text-emerald-400 font-bold">✓</span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        {ROLE_PERMISSIONS.viewer.includes(perm.key) ? (
                          <span className="text-emerald-400 font-bold">✓</span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Current Active Clearance: <strong className="text-cyan-400 uppercase font-mono">{currentUserRole}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
