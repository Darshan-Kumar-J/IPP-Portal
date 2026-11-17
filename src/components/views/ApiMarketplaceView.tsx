import React, { useMemo, useState } from 'react';
import { BookOpen, Lock, Search, Terminal } from 'lucide-react';
import type { ApiEndpoint, Platform } from '../../types/ipp';
import { EmptyState, StatusText } from '../ui/Primitives';

interface ApiMarketplaceViewProps {
  apis: ApiEndpoint[];
  platforms: Platform[];
  onTestInExplorer: (api: ApiEndpoint) => void;
  onOpenPlatform: (platformId: string) => void;
  onOpenDoc: (docId: string) => void;
}

export function ApiMarketplaceView({
  apis,
  platforms,
  onTestInExplorer,
  onOpenPlatform,
  onOpenDoc,
}: ApiMarketplaceViewProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(apis.map((a) => a.category)))],
    [apis]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return apis.filter((api) => {
      if (
        q &&
        !api.name.toLowerCase().includes(q) &&
        !api.description.toLowerCase().includes(q) &&
        !api.baseUrl.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (category !== 'All' && api.category !== category) return false;
      return true;
    });
  }, [apis, search, category]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#101B32] dark:text-slate-100">API Marketplace</h1>
        <p className="text-sm text-[#65748B] dark:text-slate-400">
          Browse illustrative internal banking APIs, authentication profiles, rate limits, and launch directly in API Explorer.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#65748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search APIs by name, endpoint path, or capability..."
            aria-label="Search APIs"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221] text-[#101B32] dark:text-slate-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800/80">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                category === cat
                  ? 'bg-white dark:bg-[#101B32] text-[#101B32] dark:text-slate-100 shadow-sm'
                  : 'text-[#65748B] hover:text-[#101B32] dark:hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No APIs match your filters"
          description="Clear the search query or switch back to All categories."
          actionLabel="Show All APIs"
          onAction={() => {
            setSearch('');
            setCategory('All');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filtered.map((api) => {
            const parentPlatform = platforms.find((p) => p.id === api.platformId);
            return (
              <div
                key={api.id}
                className="p-5 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 text-xs text-[#65748B] dark:text-slate-400">
                    <span>{api.category} · {api.version}</span>
                    <StatusText status={api.lifecycleStatus} />
                  </div>
                  <h2 className="mt-2 text-base font-semibold text-[#101B32] dark:text-slate-100">
                    {api.name}
                  </h2>
                  <p className="mt-1.5 text-sm text-[#65748B] dark:text-slate-400 leading-relaxed">
                    {api.description}
                  </p>

                  <div className="mt-3 p-2.5 rounded-lg bg-[#F7F9FC] dark:bg-[#0B1221] border border-slate-200/80 dark:border-slate-800 font-mono text-xs text-[#101B32] dark:text-slate-200 truncate">
                    <span className="font-semibold text-[#2457D6] dark:text-[#438BFF] mr-2">
                      {api.methods.join(' / ')}
                    </span>
                    {api.baseUrl}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#65748B] dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" />
                      {api.authType}
                    </span>
                    <span>·</span>
                    <span className="tabular-nums">{api.rateLimit}</span>
                    {parentPlatform && (
                      <>
                        <span>·</span>
                        <button
                          type="button"
                          onClick={() => onOpenPlatform(parentPlatform.id)}
                          className="text-[#2457D6] dark:text-[#438BFF] hover:underline"
                        >
                          {parentPlatform.name}
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    {api.documentId && (
                      <button
                        type="button"
                        onClick={() => onOpenDoc(api.documentId!)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#65748B] dark:text-slate-300 hover:text-[#101B32] dark:hover:text-white whitespace-nowrap"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Docs</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onTestInExplorer(api)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#2457D6] text-white hover:bg-[#1d48b8] transition-colors whitespace-nowrap shrink-0"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      <span>Test in Explorer</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
