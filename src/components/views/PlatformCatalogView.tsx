import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Compass,
  Edit3,
  LayoutGrid,
  List,
  Plus,
  Search,
  Terminal,
} from 'lucide-react';
import type { ApiEndpoint, Capability, DocumentEntry, LifecycleStatus, Platform, UserRole } from '../../types/ipp';
import { EmptyState, Modal, StatusText } from '../ui/Primitives';

interface PlatformCatalogViewProps {
  platforms: Platform[];
  capabilities: Capability[];
  apis: ApiEndpoint[];
  documents: DocumentEntry[];
  selectedPlatformId: string | null;
  userRole: UserRole;
  onSelectPlatform: (id: string | null) => void;
  onCreatePlatform: (payload: Partial<Platform>) => Promise<void>;
  onUpdatePlatform: (id: string, payload: Partial<Platform>) => Promise<void>;
  onOpenApi: (api: ApiEndpoint) => void;
  onOpenDoc: (docId: string) => void;
  onStartIntegration: (platform: Platform) => void;
}

export function PlatformCatalogView({
  platforms,
  capabilities,
  apis,
  documents,
  selectedPlatformId,
  userRole,
  onSelectPlatform,
  onCreatePlatform,
  onUpdatePlatform,
  onOpenApi,
  onOpenDoc,
  onStartIntegration,
}: PlatformCatalogViewProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [ownerFilter, setOwnerFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'updated' | 'name'>('updated');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null);
  const [formState, setFormState] = useState({
    name: '',
    description: '',
    owner: 'Elena Rostova',
    category: 'Core Banking Data',
    domain: 'Enterprise Banking',
    lifecycleStatus: 'Draft' as LifecycleStatus,
    slaTarget: '99.95%',
    tier: 'Tier 2' as Platform['tier'],
  });
  const [submitting, setSubmitting] = useState(false);

  const canWrite = userRole === 'Administrator' || userRole === 'Platform Producer';

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(platforms.map((p) => p.category)))],
    [platforms]
  );
  const owners = useMemo(
    () => ['All', ...Array.from(new Set(platforms.map((p) => p.owner)))],
    [platforms]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return platforms
      .filter((p) => {
        if (
          q &&
          !p.name.toLowerCase().includes(q) &&
          !p.description.toLowerCase().includes(q) &&
          !p.domain.toLowerCase().includes(q)
        ) {
          return false;
        }
        if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
        if (ownerFilter !== 'All' && p.owner !== ownerFilter) return false;
        if (statusFilter !== 'All' && p.lifecycleStatus !== statusFilter) return false;
        return true;
      })
      .sort((a, b) =>
        sortBy === 'updated'
          ? new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          : a.name.localeCompare(b.name)
      );
  }, [platforms, search, categoryFilter, ownerFilter, statusFilter, sortBy]);

  const selectedPlatform = platforms.find((p) => p.id === selectedPlatformId) || null;

  const openCreateModal = () => {
    setEditingPlatform(null);
    setFormState({
      name: '',
      description: '',
      owner: 'Elena Rostova',
      category: 'Core Banking Data',
      domain: 'Enterprise Banking',
      lifecycleStatus: 'Draft',
      slaTarget: '99.95%',
      tier: 'Tier 2',
    });
    setModalOpen(true);
  };

  const openEditModal = (plat: Platform) => {
    setEditingPlatform(plat);
    setFormState({
      name: plat.name,
      description: plat.description,
      owner: plat.owner,
      category: plat.category,
      domain: plat.domain,
      lifecycleStatus: plat.lifecycleStatus,
      slaTarget: plat.slaTarget,
      tier: plat.tier,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingPlatform) {
        await onUpdatePlatform(editingPlatform.id, formState);
      } else {
        await onCreatePlatform(formState);
      }
      setModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  // Detail View
  if (selectedPlatform) {
    const platCaps = capabilities.filter((c) => c.platformIds.includes(selectedPlatform.id));
    const platApis = apis.filter((a) => a.platformId === selectedPlatform.id);
    const platDocs = documents.filter((d) => d.platformId === selectedPlatform.id);

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onSelectPlatform(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-[#101B32] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Catalog</span>
            </button>
            <span className="text-xs text-[#65748B] dark:text-slate-400">
              Illustrative Demo Record · {selectedPlatform.tier} · SLA {selectedPlatform.slaTarget}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            {canWrite && (
              <button
                type="button"
                onClick={() => openEditModal(selectedPlatform)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-[#101B32] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 whitespace-nowrap shrink-0"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Platform</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onStartIntegration(selectedPlatform)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-[#2457D6] text-white hover:bg-[#1d48b8] whitespace-nowrap shrink-0"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Start Integration</span>
            </button>
          </div>
        </div>

        <div className="p-6 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs text-[#65748B] dark:text-slate-400">
                {selectedPlatform.category} · {selectedPlatform.domain} · Owner: {selectedPlatform.owner}
              </p>
              <h1 className="text-2xl font-semibold text-[#101B32] dark:text-slate-100 mt-1">
                {selectedPlatform.name}
              </h1>
            </div>
            <StatusText status={selectedPlatform.lifecycleStatus} />
          </div>
          <p className="mt-3 text-sm text-[#334155] dark:text-slate-300 leading-relaxed max-w-3xl">
            {selectedPlatform.description}
          </p>
          <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap gap-6 text-xs text-[#65748B] dark:text-slate-400">
            <span>
              Identifier: <code className="font-mono text-[#101B32] dark:text-slate-200">{selectedPlatform.id}</code>
            </span>
            <span>Contact: {selectedPlatform.ownerEmail}</span>
            <span className="tabular-nums">Created: {formatDate(selectedPlatform.createdAt)}</span>
            <span className="tabular-nums">Last Updated: {formatDate(selectedPlatform.updatedAt)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Capabilities */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-[#101B32] dark:text-slate-100 mb-3">
              Capabilities ({platCaps.length})
            </h2>
            {platCaps.length === 0 ? (
              <p className="text-xs text-[#65748B] dark:text-slate-400">No capabilities linked yet.</p>
            ) : (
              <div className="space-y-3">
                {platCaps.map((cap) => (
                  <div key={cap.id} className="pb-3 border-b border-slate-200/70 dark:border-slate-800 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-[#101B32] dark:text-slate-100">{cap.name}</p>
                      <StatusText status={cap.lifecycleStatus} />
                    </div>
                    <p className="text-xs text-[#65748B] dark:text-slate-400 mt-1">{cap.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Associated APIs */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-[#101B32] dark:text-slate-100 mb-3">
              Associated APIs ({platApis.length})
            </h2>
            {platApis.length === 0 ? (
              <p className="text-xs text-[#65748B] dark:text-slate-400">No APIs published yet.</p>
            ) : (
              <div className="space-y-3">
                {platApis.map((api) => (
                  <div key={api.id} className="pb-3 border-b border-slate-200/70 dark:border-slate-800 last:border-0 last:pb-0">
                    <p className="text-sm font-medium text-[#101B32] dark:text-slate-100">{api.name}</p>
                    <p className="text-xs font-mono text-[#65748B] dark:text-slate-400 mt-0.5 truncate">
                      {api.methods.join(', ')} · {api.version} · {api.authType}
                    </p>
                    <button
                      type="button"
                      onClick={() => onOpenApi(api)}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#2457D6] dark:text-[#438BFF] hover:underline"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      <span>Test in API Explorer</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Documentation */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-[#101B32] dark:text-slate-100 mb-3">
              Documentation ({platDocs.length})
            </h2>
            {platDocs.length === 0 ? (
              <p className="text-xs text-[#65748B] dark:text-slate-400">No documentation linked yet.</p>
            ) : (
              <div className="space-y-3">
                {platDocs.map((doc) => (
                  <div key={doc.id} className="pb-3 border-b border-slate-200/70 dark:border-slate-800 last:border-0 last:pb-0">
                    <p className="text-sm font-medium text-[#101B32] dark:text-slate-100">{doc.title}</p>
                    <p className="text-xs text-[#65748B] dark:text-slate-400 mt-0.5">
                      v{doc.version} · {doc.status}
                    </p>
                    <button
                      type="button"
                      onClick={() => onOpenDoc(doc.id)}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#2457D6] dark:text-[#438BFF] hover:underline"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Read Documentation</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#101B32] dark:text-slate-100">Platform Catalog</h1>
          <p className="text-sm text-[#65748B] dark:text-slate-400">
            Discover internal banking technology platforms, owners, capabilities, and APIs (illustrative demo records).
          </p>
        </div>
        {canWrite && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[#2457D6] text-white hover:bg-[#1d48b8] transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Register Platform</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-[#65748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search platforms, domains, descriptions..."
            aria-label="Search platforms"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221] text-[#101B32] dark:text-slate-100 placeholder:text-[#65748B]"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filter by category"
          className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221] text-[#101B32] dark:text-slate-100"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === 'All' ? 'All Categories' : c}
            </option>
          ))}
        </select>

        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          aria-label="Filter by owner"
          className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221] text-[#101B32] dark:text-slate-100"
        >
          {owners.map((o) => (
            <option key={o} value={o}>
              {o === 'All' ? 'All Owners' : o}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by lifecycle status"
          className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221] text-[#101B32] dark:text-slate-100"
        >
          {['All', 'Published', 'In Review', 'Approved', 'Draft'].map((s) => (
            <option key={s} value={s}>
              {s === 'All' ? 'All Statuses' : s}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'updated' | 'name')}
          aria-label="Sort platforms"
          className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221] text-[#101B32] dark:text-slate-100"
        >
          <option value="updated">Sort: Recently Updated</option>
          <option value="name">Sort: Name (A–Z)</option>
        </select>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800/80">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-[#101B32] text-[#101B32] dark:text-slate-100 shadow-sm'
                : 'text-[#65748B]'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            aria-label="List view"
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'list'
                ? 'bg-white dark:bg-[#101B32] text-[#101B32] dark:text-slate-100 shadow-sm'
                : 'text-[#65748B]'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No matching platforms found"
          description="Try clearing your active search terms or filters to inspect all illustrative enterprise platforms."
          actionLabel="Reset Filters"
          onAction={() => {
            setSearch('');
            setCategoryFilter('All');
            setOwnerFilter('All');
            setStatusFilter('All');
          }}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((plat) => {
            const apiCount = apis.filter((a) => a.platformId === plat.id).length;
            const capCount = capabilities.filter((c) => c.platformIds.includes(plat.id)).length;
            return (
              <div
                key={plat.id}
                className="p-5 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:border-[#2457D6]/40 dark:hover:border-[#438BFF]/40 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-[#65748B] dark:text-slate-400">
                    <span className="truncate">{plat.category} · {plat.tier}</span>
                    <StatusText status={plat.lifecycleStatus} />
                  </div>
                  <h2 className="mt-2 text-base font-semibold text-[#101B32] dark:text-slate-100">
                    {plat.name}
                  </h2>
                  <p className="mt-1.5 text-sm text-[#65748B] dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {plat.description}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs text-[#65748B] dark:text-slate-400 mb-3 tabular-nums">
                    <span>Owner: {plat.owner}</span>
                    <span>{capCount} caps · {apiCount} APIs</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectPlatform(plat.id)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#2457D6] text-white hover:bg-[#1d48b8] transition-colors whitespace-nowrap shrink-0"
                    >
                      View Details
                    </button>
                    <div className="flex items-center gap-2">
                      {plat.documentIds[0] && (
                        <button
                          type="button"
                          onClick={() => onOpenDoc(plat.documentIds[0])}
                          className="text-xs font-medium text-[#65748B] dark:text-slate-300 hover:text-[#2457D6] dark:hover:text-[#438BFF] whitespace-nowrap"
                        >
                          Docs
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onStartIntegration(plat)}
                        className="text-xs font-medium text-[#2457D6] dark:text-[#438BFF] hover:underline whitespace-nowrap"
                      >
                        Integrate
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-[#65748B] dark:text-slate-400">
                <th className="py-3 px-4 font-medium">Platform</th>
                <th className="py-3 px-4 font-medium">Category</th>
                <th className="py-3 px-4 font-medium">Owner</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium text-right">APIs</th>
                <th className="py-3 px-4 font-medium text-right">Updated</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800 text-sm">
              {filtered.map((plat) => (
                <tr key={plat.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-medium text-[#101B32] dark:text-slate-100">
                    {plat.name}
                  </td>
                  <td className="py-3 px-4 text-xs text-[#65748B] dark:text-slate-400">{plat.category}</td>
                  <td className="py-3 px-4 text-xs text-[#334155] dark:text-slate-300">{plat.owner}</td>
                  <td className="py-3 px-4">
                    <StatusText status={plat.lifecycleStatus} />
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-xs tabular-nums">
                    {apis.filter((a) => a.platformId === plat.id).length}
                  </td>
                  <td className="py-3 px-4 text-right text-xs tabular-nums text-[#65748B] dark:text-slate-400">
                    {formatDate(plat.updatedAt)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => onSelectPlatform(plat.id)}
                      className="text-xs font-medium text-[#2457D6] dark:text-[#438BFF] hover:underline whitespace-nowrap"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        title={editingPlatform ? `Edit ${editingPlatform.name}` : 'Register New Platform'}
        subtitle="Changes persist to the live demonstration registry."
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1">
              Platform Name
            </label>
            <input
              required
              minLength={2}
              value={formState.name}
              onChange={(e) => setFormState({ ...formState, name: e.target.value })}
              placeholder="e.g., Commercial Lending Origination Platform"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221] text-[#101B32] dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              required
              minLength={10}
              rows={3}
              value={formState.description}
              onChange={(e) => setFormState({ ...formState, description: e.target.value })}
              placeholder="Describe platform scope, business capabilities, and consumer boundaries..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221] text-[#101B32] dark:text-slate-100"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1">
                Category
              </label>
              <input
                required
                value={formState.category}
                onChange={(e) => setFormState({ ...formState, category: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221] text-[#101B32] dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1">
                Technical Owner
              </label>
              <input
                required
                value={formState.owner}
                onChange={(e) => setFormState({ ...formState, owner: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221] text-[#101B32] dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1">
                Lifecycle Status
              </label>
              <select
                value={formState.lifecycleStatus}
                onChange={(e) =>
                  setFormState({ ...formState, lifecycleStatus: e.target.value as LifecycleStatus })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221] text-[#101B32] dark:text-slate-100"
              >
                <option value="Draft">Draft</option>
                <option value="In Review">In Review</option>
                <option value="Approved">Approved</option>
                <option value="Published">Published</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1">
                Service Tier
              </label>
              <select
                value={formState.tier}
                onChange={(e) =>
                  setFormState({ ...formState, tier: e.target.value as Platform['tier'] })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221] text-[#101B32] dark:text-slate-100"
              >
                <option value="Tier 1">Tier 1 (99.99%)</option>
                <option value="Tier 2">Tier 2 (99.95%)</option>
                <option value="Tier 3">Tier 3 (99.5%)</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-[#101B32] dark:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-[#2457D6] text-white hover:bg-[#1d48b8] disabled:opacity-60"
            >
              {submitting ? 'Saving...' : editingPlatform ? 'Save Changes' : 'Register Platform'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
