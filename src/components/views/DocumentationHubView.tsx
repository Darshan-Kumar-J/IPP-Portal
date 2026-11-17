import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Download,
  Edit3,
  FileText,
  History,
  Plus,
  Presentation,
  Search,
  Trash2,
} from 'lucide-react';
import { downloadBinaryExport } from '../../lib/api';
import type { DocumentEntry, Platform, UserRole } from '../../types/ipp';
import { ConfirmDialog, EmptyState, MarkdownRenderer, Modal, StatusText } from '../ui/Primitives';

interface DocumentationHubViewProps {
  documents: DocumentEntry[];
  platforms: Platform[];
  selectedDocId: string | null;
  userRole: UserRole;
  userName: string;
  onSelectDoc: (id: string | null) => void;
  onCreateDoc: (payload: Partial<DocumentEntry> & { summary?: string }) => Promise<DocumentEntry>;
  onUpdateDoc: (id: string, payload: Partial<DocumentEntry> & { summary?: string }) => Promise<void>;
  onPublishDoc: (id: string) => Promise<void>;
  onDeleteDoc: (id: string) => Promise<void>;
  onOpenPlatform: (platformId: string) => void;
}

export function DocumentationHubView({
  documents,
  platforms,
  selectedDocId,
  userRole,
  userName,
  onSelectDoc,
  onCreateDoc,
  onUpdateDoc,
  onPublishDoc,
  onDeleteDoc,
  onOpenPlatform,
}: DocumentationHubViewProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [previewInEditor, setPreviewInEditor] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [exportingType, setExportingType] = useState<'pdf' | 'pptx' | null>(null);

  const [formState, setFormState] = useState({
    title: '',
    category: 'Payments & Settlement',
    platformId: platforms[0]?.id || '',
    owner: userName,
    status: 'Draft' as 'Draft' | 'Published',
    content: '',
    summary: '',
  });

  const canWrite = userRole !== 'Viewer';
  const canPublish = userRole === 'Administrator' || userRole === 'Platform Producer';

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(documents.map((d) => d.category)))],
    [documents]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return documents.filter((d) => {
      if (q && !d.title.toLowerCase().includes(q) && !d.content.toLowerCase().includes(q)) {
        return false;
      }
      if (categoryFilter !== 'All' && d.category !== categoryFilter) return false;
      return true;
    });
  }, [documents, search, categoryFilter]);

  const activeDoc =
    documents.find((d) => d.id === selectedDocId) || filtered[0] || documents[0] || null;

  const tocHeadings = useMemo(() => {
    if (!activeDoc) return [];
    return activeDoc.content
      .split('\n')
      .filter((line) => line.startsWith('# ') || line.startsWith('## '))
      .map((line) => {
        const level = line.startsWith('## ') ? 2 : 1;
        const text = line.replace(/^#{1,2}\s+/, '').trim();
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return { level, text, id };
      });
  }, [activeDoc]);

  const startCreate = () => {
    setCreating(true);
    setEditing(true);
    setPreviewInEditor(false);
    setFormState({
      title: '',
      category: platforms[0]?.category || 'Core Banking Data',
      platformId: platforms[0]?.id || '',
      owner: userName,
      status: 'Draft',
      content: '# New Platform Integration Guide\n\n## Overview\nDescribe service responsibilities and endpoints.\n\n## Quickstart\n```bash\ncurl -X GET https://internal-gw.ipp.example/v1/health\n```',
      summary: 'Initial draft',
    });
  };

  const startEdit = (doc: DocumentEntry) => {
    setCreating(false);
    setEditing(true);
    setPreviewInEditor(false);
    setFormState({
      title: doc.title,
      category: doc.category,
      platformId: doc.platformId,
      owner: doc.owner,
      status: doc.status,
      content: doc.content,
      summary: '',
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) {
      const created = await onCreateDoc(formState);
      onSelectDoc(created.id);
    } else if (activeDoc) {
      await onUpdateDoc(activeDoc.id, formState);
    }
    setEditing(false);
    setCreating(false);
  };

  const parentPlatform = activeDoc
    ? platforms.find((p) => p.id === activeDoc.platformId)
    : undefined;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#101B32] dark:text-slate-100">
            Documentation Hub
          </h1>
          <p className="text-sm text-[#65748B] dark:text-slate-400">
            Author, version, and publish enterprise Markdown technical guides with syntax-highlighted code snippets.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={exportingType !== null}
            onClick={async () => {
              setExportingType('pdf');
              try {
                await downloadBinaryExport(
                  '/api/exports/project-guide.pdf?download=1',
                  'IPP_Complete_Project_Study_Guide.pdf'
                );
              } finally {
                setExportingType(null);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#101B32] text-[#101B32] dark:text-slate-100 hover:border-[#2457D6] dark:hover:border-[#438BFF] transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
          >
            <FileText className="w-3.5 h-3.5 text-[#2457D6] dark:text-[#438BFF]" />
            <span>{exportingType === 'pdf' ? 'Generating...' : 'Study Guide PDF'}</span>
            <Download className="w-3 h-3 text-[#65748B]" />
          </button>
          <button
            type="button"
            disabled={exportingType !== null}
            onClick={async () => {
              setExportingType('pptx');
              try {
                await downloadBinaryExport(
                  '/api/exports/client-presentation.pptx',
                  'IPP_Client_Presentation.pptx'
                );
              } finally {
                setExportingType(null);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#101B32] text-[#101B32] dark:text-slate-100 hover:border-[#2457D6] dark:hover:border-[#438BFF] transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
          >
            <Presentation className="w-3.5 h-3.5 text-[#16A477]" />
            <span>{exportingType === 'pptx' ? 'Generating...' : 'Client Deck PPTX'}</span>
            <Download className="w-3 h-3 text-[#65748B]" />
          </button>
          {canWrite && (
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[#2457D6] text-white hover:bg-[#1d48b8] whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create Document</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Docs List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="p-3.5 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-[#65748B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documentation..."
                aria-label="Search documentation"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter docs by category"
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'All' ? 'All Categories' : c}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 divide-y divide-slate-200/70 dark:divide-slate-800 max-h-[640px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#65748B]">No documents match.</div>
            ) : (
              filtered.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => {
                    onSelectDoc(doc.id);
                    setEditing(false);
                  }}
                  className={`w-full text-left p-3.5 transition-colors ${
                    activeDoc?.id === doc.id && !creating
                      ? 'bg-[#2457D6]/10 dark:bg-[#438BFF]/10'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <p className="text-sm font-medium text-[#101B32] dark:text-slate-100 line-clamp-1">
                    {doc.title}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs text-[#65748B] dark:text-slate-400">
                    <span className="truncate">v{doc.version} · {doc.owner}</span>
                    <StatusText status={doc.status} />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Reader / Editor */}
        <div className="lg:col-span-8">
          {editing ? (
            <form
              onSubmit={handleSave}
              className="p-6 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-base font-semibold text-[#101B32] dark:text-slate-100">
                  {creating ? 'Create Technical Document' : 'Edit Document'}
                </h2>
                <button
                  type="button"
                  onClick={() => setPreviewInEditor(!previewInEditor)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-[#2457D6] dark:text-[#438BFF]"
                >
                  {previewInEditor ? 'Edit Markdown' : 'Live Preview'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1">
                    Title *
                  </label>
                  <input
                    required
                    minLength={3}
                    value={formState.title}
                    onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1">
                    Platform
                  </label>
                  <select
                    value={formState.platformId}
                    onChange={(e) => setFormState({ ...formState, platformId: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
                  >
                    {platforms.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <input
                    required
                    value={formState.category}
                    onChange={(e) => setFormState({ ...formState, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
                  />
                </div>
              </div>

              {previewInEditor ? (
                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F7F9FC] dark:bg-[#0B1221] min-h-[300px]">
                  <MarkdownRenderer content={formState.content} />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1">
                    Markdown Content *
                  </label>
                  <textarea
                    required
                    minLength={10}
                    rows={12}
                    value={formState.content}
                    onChange={(e) => setFormState({ ...formState, content: e.target.value })}
                    className="w-full p-3 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1">
                  Version Change Summary
                </label>
                <input
                  value={formState.summary}
                  onChange={(e) => setFormState({ ...formState, summary: e.target.value })}
                  placeholder="Describe what changed in this revision..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setCreating(false);
                  }}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-[#2457D6] text-white hover:bg-[#1d48b8]"
                >
                  {creating ? 'Create Document' : 'Save Revision'}
                </button>
              </div>
            </form>
          ) : !activeDoc ? (
            <EmptyState
              title="No documentation selected"
              description="Create a new technical document or select an entry from the left catalog."
              actionLabel={canWrite ? 'Create Document' : undefined}
              onAction={canWrite ? startCreate : undefined}
            />
          ) : (
            <div className="p-6 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 space-y-5">
              {/* Doc Header & Breadcrumbs */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#65748B] dark:text-slate-400">
                    <span>Docs</span>
                    <span>/</span>
                    <span>{activeDoc.category}</span>
                    {parentPlatform && (
                      <>
                        <span>/</span>
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
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#65748B] dark:text-slate-400">
                    <span className="font-mono">v{activeDoc.version}</span>
                    <span>·</span>
                    <span>Owner: {activeDoc.owner}</span>
                    <span>·</span>
                    <StatusText status={activeDoc.status} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHistoryOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>History ({activeDoc.versions.length})</span>
                  </button>
                  {canWrite && (
                    <button
                      type="button"
                      onClick={() => startEdit(activeDoc)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  )}
                  {canPublish && activeDoc.status === 'Draft' && (
                    <button
                      type="button"
                      onClick={() => onPublishDoc(activeDoc.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#16A477] text-white hover:bg-[#138f67]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Publish</span>
                    </button>
                  )}
                  {canPublish && (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(activeDoc.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-[#D94B4B] hover:bg-[#D94B4B]/10"
                      aria-label="Delete document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* TOC + Reader */}
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                <div className="xl:col-span-3">
                  <MarkdownRenderer content={activeDoc.content} />
                </div>
                <aside className="xl:col-span-1 border-t xl:border-t-0 xl:border-l border-slate-200/80 dark:border-slate-800 pt-4 xl:pt-0 xl:pl-4">
                  <p className="text-xs font-semibold text-[#101B32] dark:text-slate-100 mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#2457D6] dark:text-[#438BFF]" />
                    <span>On This Page</span>
                  </p>
                  <nav className="space-y-1.5">
                    {tocHeadings.map((h) => (
                      <a
                        key={h.id}
                        href={`#${h.id}`}
                        className={`block text-xs text-[#65748B] dark:text-slate-400 hover:text-[#2457D6] dark:hover:text-[#438BFF] truncate ${
                          h.level === 2 ? 'pl-2.5' : 'font-medium'
                        }`}
                      >
                        {h.text}
                      </a>
                    ))}
                  </nav>
                </aside>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Version History Modal */}
      <Modal
        open={historyOpen}
        title="Document Version History"
        subtitle={activeDoc?.title}
        onClose={() => setHistoryOpen(false)}
      >
        {activeDoc?.versions.length ? (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {activeDoc.versions.map((v, idx) => (
              <div key={idx} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-semibold text-[#2457D6] dark:text-[#438BFF]">
                    v{v.version}
                  </span>
                  <span className="text-[#65748B] tabular-nums">
                    {new Date(v.updatedAt).toLocaleString()} · {v.updatedBy}
                  </span>
                </div>
                <p className="text-sm text-[#334155] dark:text-slate-300 mt-1">{v.summary}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#65748B]">No prior revision snapshots recorded for this entry.</p>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmDeleteId)}
        title="Delete Documentation Entry"
        description="Are you sure you want to permanently remove this document from the Documentation Hub? This action is recorded in the audit log."
        confirmLabel="Delete Document"
        destructive
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={async () => {
          if (confirmDeleteId) {
            await onDeleteDoc(confirmDeleteId);
            setConfirmDeleteId(null);
            onSelectDoc(null);
          }
        }}
      />
    </div>
  );
}
