import React, { useState } from 'react';
import { Lock, Shield, Sliders, Users } from 'lucide-react';
import type { AuditLog, RoleDefinition, SystemSettings, User, UserRole } from '../../types/ipp';
import { StatusText } from '../ui/Primitives';

interface AdministrationViewProps {
  users: User[];
  roles: RoleDefinition[];
  auditLogs: AuditLog[];
  settings: SystemSettings;
  currentUser: User;
  onUpdateUserRole: (userId: string, role: UserRole) => Promise<void>;
  onUpdateSettings: (next: Partial<SystemSettings>) => Promise<void>;
}

export function AdministrationView({
  users,
  roles,
  auditLogs,
  settings,
  currentUser,
  onUpdateUserRole,
  onUpdateSettings,
}: AdministrationViewProps) {
  const [tab, setTab] = useState<'users' | 'roles' | 'audit' | 'settings'>('users');
  const [auditSearch, setAuditSearch] = useState('');

  const isAdmin = currentUser.role === 'Administrator';

  const filteredLogs = auditLogs.filter((l) => {
    const q = auditSearch.toLowerCase();
    return (
      !q ||
      l.actorName.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.resource.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#101B32] dark:text-slate-100">
            Administration & Security
          </h1>
          <p className="text-sm text-[#65748B] dark:text-slate-400">
            Manage RBAC roles, user permissions, security audit trails, and enterprise gateway governance policies.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800/80">
          {[
            { id: 'users', label: 'Users', icon: Users },
            { id: 'roles', label: 'Roles & RBAC', icon: Shield },
            { id: 'audit', label: 'Audit Logs', icon: Lock },
            { id: 'settings', label: 'System Settings', icon: Sliders },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id as typeof tab)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  tab === t.id
                    ? 'bg-white dark:bg-[#101B32] text-[#101B32] dark:text-slate-100 shadow-sm'
                    : 'text-[#65748B]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {!isAdmin && (
        <div className="p-3.5 rounded-lg bg-[#E9A23B]/10 border border-[#E9A23B]/30 text-xs text-[#101B32] dark:text-slate-200">
          Viewing in <strong>{currentUser.role}</strong> mode. Modifying user roles or system settings requires <strong>Administrator</strong> privileges (enforced by server-side JWT RBAC middleware and logged to Audit Logs).
        </div>
      )}

      {tab === 'users' && (
        <div className="rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-[#65748B] dark:text-slate-400">
                <th className="py-3 px-4 font-medium">User</th>
                <th className="py-3 px-4 font-medium">Department</th>
                <th className="py-3 px-4 font-medium">Role</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium text-right">Last Login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800 text-sm">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={u.avatarUrl}
                        alt={u.name}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                      <div>
                        <p className="font-medium text-[#101B32] dark:text-slate-100">{u.name}</p>
                        <p className="text-xs text-[#65748B] dark:text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs text-[#65748B] dark:text-slate-400">{u.department}</td>
                  <td className="py-3 px-4">
                    <select
                      value={u.role}
                      disabled={!isAdmin}
                      aria-label={`Role for ${u.name}`}
                      onChange={(e) => onUpdateUserRole(u.id, e.target.value as UserRole)}
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221] disabled:opacity-60"
                    >
                      {(['Administrator', 'Platform Producer', 'Developer', 'Viewer'] as UserRole[]).map(
                        (r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        )
                      )}
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    <StatusText status={u.status} />
                  </td>
                  <td className="py-3 px-4 text-right text-xs tabular-nums text-[#65748B] dark:text-slate-400">
                    {new Date(u.lastLogin).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'roles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {roles.map((r) => (
            <div
              key={r.role}
              className="p-5 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#101B32] dark:text-slate-100">{r.role}</h2>
                <span className="text-xs font-mono text-[#65748B] tabular-nums">
                  {r.permissions.length} scopes
                </span>
              </div>
              <p className="text-sm text-[#65748B] dark:text-slate-400">{r.description}</p>
              <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 font-mono text-xs text-[#334155] dark:text-slate-300 leading-relaxed">
                {r.permissions.join(' · ')}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'audit' && (
        <div className="space-y-3">
          <input
            value={auditSearch}
            onChange={(e) => setAuditSearch(e.target.value)}
            placeholder="Filter audit logs by actor, action, or resource..."
            aria-label="Filter audit logs"
            className="w-full max-w-md px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#101B32]"
          />
          <div className="rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-[#65748B] dark:text-slate-400">
                  <th className="py-3 px-4 font-medium">Timestamp</th>
                  <th className="py-3 px-4 font-medium">Actor</th>
                  <th className="py-3 px-4 font-medium">Action</th>
                  <th className="py-3 px-4 font-medium">Resource</th>
                  <th className="py-3 px-4 font-medium">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800 text-xs">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 font-mono tabular-nums text-[#65748B] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-[#101B32] dark:text-slate-100 whitespace-nowrap">
                      {log.actorName} · {log.actorRole}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[#2457D6] dark:text-[#438BFF]">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[#334155] dark:text-slate-300">
                      {log.resource}
                    </td>
                    <td className="py-2.5 px-4">
                      <StatusText status={log.outcome} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="p-6 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 space-y-5 max-w-2xl">
          <h2 className="text-base font-semibold text-[#101B32] dark:text-slate-100">
            Governance & Security Controls
          </h2>

          <label className="flex items-start justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-[#101B32] dark:text-slate-100">
                Require Administrator Approval Before Publishing
              </p>
              <p className="text-xs text-[#65748B] dark:text-slate-400">
                Producer journeys must reach Approved status before platforms appear in the catalog.
              </p>
            </div>
            <input
              type="checkbox"
              disabled={!isAdmin}
              checked={settings.requireAdminApprovalForPublish}
              onChange={(e) =>
                onUpdateSettings({ requireAdminApprovalForPublish: e.target.checked })
              }
              className="mt-1"
            />
          </label>

          <label className="flex items-start justify-between gap-4 cursor-pointer pt-4 border-t border-slate-200/70 dark:border-slate-800">
            <div>
              <p className="text-sm font-medium text-[#101B32] dark:text-slate-100">
                Enforce mTLS Workload Identity on Tier 1 APIs
              </p>
              <p className="text-xs text-[#65748B] dark:text-slate-400">
                Requires X.509 certificate binding in addition to FAPI 2.0 bearer tokens.
              </p>
            </div>
            <input
              type="checkbox"
              disabled={!isAdmin}
              checked={settings.enforceMtlsOnTier1Apis}
              onChange={(e) => onUpdateSettings({ enforceMtlsOnTier1Apis: e.target.checked })}
              className="mt-1"
            />
          </label>

          <div className="pt-4 border-t border-slate-200/70 dark:border-slate-800">
            <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1">
              Redis Catalog Cache TTL (seconds)
            </label>
            <input
              type="number"
              disabled={!isAdmin}
              value={settings.redisCacheTtlSeconds}
              onChange={(e) =>
                onUpdateSettings({ redisCacheTtlSeconds: Number(e.target.value) || 300 })
              }
              className="w-40 px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
