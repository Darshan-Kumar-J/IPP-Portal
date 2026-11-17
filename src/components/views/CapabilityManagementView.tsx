import React, { useMemo, useState } from 'react';
import {
  Background,
  Controls,
  Edge,
  MarkerType,
  Node,
  ReactFlow,
} from '@xyflow/react';
import { Edit3, Network, Plus, Search, Trash2 } from 'lucide-react';
import type { Capability, LifecycleStatus, Platform, UserRole } from '../../types/ipp';
import { ConfirmDialog, EmptyState, Modal, StatusText } from '../ui/Primitives';

interface CapabilityManagementViewProps {
  capabilities: Capability[];
  platforms: Platform[];
  userRole: UserRole;
  userName: string;
  onCreateCapability: (payload: Partial<Capability>) => Promise<void>;
  onUpdateCapability: (id: string, payload: Partial<Capability>) => Promise<void>;
  onDeleteCapability: (id: string) => Promise<void>;
}

export function CapabilityManagementView({
  capabilities,
  platforms,
  userRole,
  userName,
  onCreateCapability,
  onUpdateCapability,
  onDeleteCapability,
}: CapabilityManagementViewProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [viewTab, setViewTab] = useState<'graph' | 'catalog'>('graph');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCap, setEditingCap] = useState<Capability | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [formState, setFormState] = useState({
    name: '',
    description: '',
    category: 'Core Ledger',
    owner: userName,
    lifecycleStatus: 'Draft' as LifecycleStatus,
    platformIds: [] as string[],
    dependencyIds: [] as string[],
    associatedServicesText: '',
  });

  const canWrite = userRole === 'Administrator' || userRole === 'Platform Producer';

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(capabilities.map((c) => c.category)))],
    [capabilities]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return capabilities.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q) && !c.description.toLowerCase().includes(q)) {
        return false;
      }
      if (categoryFilter !== 'All' && c.category !== categoryFilter) return false;
      return true;
    });
  }, [capabilities, search, categoryFilter]);

  // Build React Flow dependency graph nodes & edges cleanly arranged by dependency depth
  const { flowNodes, flowEdges } = useMemo(() => {
    const depthMap = new Map<string, number>();
    const getDepth = (capId: string, visited = new Set<string>()): number => {
      if (depthMap.has(capId)) return depthMap.get(capId)!;
      if (visited.has(capId)) return 0;
      visited.add(capId);
      const cap = capabilities.find((c) => c.id === capId);
      if (!cap || cap.dependencyIds.length === 0) {
        depthMap.set(capId, 0);
        return 0;
      }
      const d =
        1 + Math.max(...cap.dependencyIds.map((depId) => getDepth(depId, new Set(visited))));
      depthMap.set(capId, d);
      return d;
    };

    capabilities.forEach((c) => getDepth(c.id));

    const layerCounts = new Map<number, number>();
    const nodes: Node[] = capabilities.map((cap) => {
      const layer = depthMap.get(cap.id) || 0;
      const row = layerCounts.get(layer) || 0;
      layerCounts.set(layer, row + 1);

      return {
        id: cap.id,
        position: { x: layer * 280 + 30, y: row * 115 + 30 },
        data: {
          label: (
            <div className="text-left">
              <div className="text-[10px] font-medium text-[#65748B] truncate">
                {cap.category} · {cap.lifecycleStatus}
              </div>
              <div className="text-xs font-semibold text-[#101B32] mt-0.5 leading-snug">
                {cap.name}
              </div>
            </div>
          ),
        },
        style: {
          width: 220,
          borderRadius: 10,
          padding: 10,
          background: '#FFFFFF',
          border:
            cap.lifecycleStatus === 'Published'
              ? '1.5px solid #2457D6'
              : '1.5px solid #E9A23B',
        },
      };
    });

    const edges: Edge[] = [];
    capabilities.forEach((cap) => {
      cap.dependencyIds.forEach((depId) => {
        if (capabilities.some((c) => c.id === depId)) {
          edges.push({
            id: `${depId}->${cap.id}`,
            source: depId,
            target: cap.id,
            animated: true,
            style: { stroke: '#438BFF', strokeWidth: 1.5 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#438BFF' },
          });
        }
      });
    });

    return { flowNodes: nodes, flowEdges: edges };
  }, [capabilities]);

  const openCreate = () => {
    setEditingCap(null);
    setFormState({
      name: '',
      description: '',
      category: 'Core Ledger',
      owner: userName,
      lifecycleStatus: 'Draft',
      platformIds: platforms[0] ? [platforms[0].id] : [],
      dependencyIds: [],
      associatedServicesText: '',
    });
    setModalOpen(true);
  };

  const openEdit = (cap: Capability) => {
    setEditingCap(cap);
    setFormState({
      name: cap.name,
      description: cap.description,
      category: cap.category,
      owner: cap.owner,
      lifecycleStatus: cap.lifecycleStatus,
      platformIds: cap.platformIds,
      dependencyIds: cap.dependencyIds,
      associatedServicesText: cap.associatedServices.join(', '),
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<Capability> = {
      name: formState.name,
      description: formState.description,
      category: formState.category,
      owner: formState.owner,
      lifecycleStatus: formState.lifecycleStatus,
      platformIds: formState.platformIds,
      dependencyIds: formState.dependencyIds,
      associatedServices: formState.associatedServicesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    if (editingCap) {
      await onUpdateCapability(editingCap.id, payload);
    } else {
      await onCreateCapability(payload);
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#101B32] dark:text-slate-100">
            Capability Management
          </h1>
          <p className="text-sm text-[#65748B] dark:text-slate-400">
            Define technical banking capabilities, assign platform ownership, and inspect upstream dependency chains.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800/80">
            <button
              type="button"
              onClick={() => setViewTab('graph')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                viewTab === 'graph'
                  ? 'bg-white dark:bg-[#101B32] text-[#101B32] dark:text-slate-100 shadow-sm'
                  : 'text-[#65748B]'
              }`}
            >
              Dependency Graph
            </button>
            <button
              type="button"
              onClick={() => setViewTab('catalog')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                viewTab === 'catalog'
                  ? 'bg-white dark:bg-[#101B32] text-[#101B32] dark:text-slate-100 shadow-sm'
                  : 'text-[#65748B]'
              }`}
            >
              Capability Matrix ({capabilities.length})
            </button>
          </div>
          {canWrite && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-[#2457D6] text-white hover:bg-[#1d48b8] whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>New Capability</span>
            </button>
          )}
        </div>
      </div>

      {viewTab === 'graph' && (
        <div className="p-4 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs text-[#65748B] dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Network className="w-4 h-4 text-[#2457D6] dark:text-[#438BFF]" />
              Interactive Dependency Topology (drag canvas or zoom to inspect upstream IAM & ledger links)
            </span>
            <span className="tabular-nums">
              {flowNodes.length} capabilities · {flowEdges.length} dependency edges
            </span>
          </div>
          <div className="h-[460px] w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F7F9FC] dark:bg-[#0B1221] overflow-hidden">
            <ReactFlow nodes={flowNodes} edges={flowEdges} fitView>
              <Background gap={18} size={1} color="rgba(148,163,184,0.22)" />
              <Controls />
            </ReactFlow>
          </div>
        </div>
      )}

      {/* Search & List */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-[#65748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search capabilities..."
            aria-label="Search capabilities"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filter capabilities by category"
          className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === 'All' ? 'All Categories' : c}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No matching capabilities"
          description="Adjust your search filter or register a new capability."
        />
      ) : (
        <div className="rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-[#65748B] dark:text-slate-400">
                <th className="py-3 px-4 font-medium">Capability</th>
                <th className="py-3 px-4 font-medium">Category</th>
                <th className="py-3 px-4 font-medium">Owner</th>
                <th className="py-3 px-4 font-medium">Dependencies</th>
                <th className="py-3 px-4 font-medium">Status</th>
                {canWrite && <th className="py-3 px-4 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800 text-sm">
              {filtered.map((cap) => (
                <tr key={cap.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4">
                    <p className="font-medium text-[#101B32] dark:text-slate-100">{cap.name}</p>
                    <p className="text-xs text-[#65748B] dark:text-slate-400 max-w-md truncate">
                      {cap.description}
                    </p>
                  </td>
                  <td className="py-3 px-4 text-xs text-[#65748B] dark:text-slate-400 whitespace-nowrap">
                    {cap.category}
                  </td>
                  <td className="py-3 px-4 text-xs text-[#334155] dark:text-slate-300 whitespace-nowrap">
                    {cap.owner}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-[#65748B] dark:text-slate-400">
                    {cap.dependencyIds.length ? cap.dependencyIds.join(', ') : 'None'}
                  </td>
                  <td className="py-3 px-4">
                    <StatusText status={cap.lifecycleStatus} />
                  </td>
                  {canWrite && (
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEdit(cap)}
                        className="p-1.5 text-[#65748B] hover:text-[#2457D6]"
                        aria-label={`Edit ${cap.name}`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(cap.id)}
                        className="p-1.5 text-[#65748B] hover:text-[#D94B4B]"
                        aria-label={`Delete ${cap.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editingCap ? `Edit ${editingCap.name}` : 'Create Capability'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1">Capability Name</label>
            <input
              required
              value={formState.name}
              onChange={(e) => setFormState({ ...formState, name: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Description</label>
            <textarea
              required
              rows={3}
              value={formState.description}
              onChange={(e) => setFormState({ ...formState, description: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Category</label>
              <input
                required
                value={formState.category}
                onChange={(e) => setFormState({ ...formState, category: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Owner</label>
              <input
                required
                value={formState.owner}
                onChange={(e) => setFormState({ ...formState, owner: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Upstream Dependencies</label>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]">
              {capabilities
                .filter((c) => c.id !== editingCap?.id)
                .map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={formState.dependencyIds.includes(c.id)}
                      onChange={() =>
                        setFormState((prev) => ({
                          ...prev,
                          dependencyIds: prev.dependencyIds.includes(c.id)
                            ? prev.dependencyIds.filter((x) => x !== c.id)
                            : [...prev.dependencyIds, c.id],
                        }))
                      }
                    />
                    <span className="truncate">{c.name}</span>
                  </label>
                ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium rounded-lg bg-[#2457D6] text-white hover:bg-[#1d48b8]"
            >
              {editingCap ? 'Save Changes' : 'Create Capability'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmDeleteId)}
        title="Delete Capability"
        description="Confirm removing this capability from the enterprise capability registry."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={async () => {
          if (confirmDeleteId) {
            await onDeleteCapability(confirmDeleteId);
            setConfirmDeleteId(null);
          }
        }}
      />
    </div>
  );
}
