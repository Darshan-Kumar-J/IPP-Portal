import React, { useCallback, useEffect, useState } from 'react';
import { Download, FileText, Presentation } from 'lucide-react';
import { AppShell } from './components/AppShell';
import { Modal, SkeletonRows, ToastContainer, type ToastMessage } from './components/ui/Primitives';
import { AdministrationView } from './components/views/AdministrationView';
import { AgentWorkflowsView } from './components/views/AgentWorkflowsView';
import { AiAssistantView } from './components/views/AiAssistantView';
import { ApiExplorerView } from './components/views/ApiExplorerView';
import { ApiMarketplaceView } from './components/views/ApiMarketplaceView';
import { CapabilityManagementView } from './components/views/CapabilityManagementView';
import { DocumentationHubView } from './components/views/DocumentationHubView';
import { IntegrationsView } from './components/views/IntegrationsView';
import { OverviewView } from './components/views/OverviewView';
import { PlatformCatalogView } from './components/views/PlatformCatalogView';
import { ProducerWorkspaceView } from './components/views/ProducerWorkspaceView';
import { ippApi, downloadBinaryExport } from './lib/api';
import type {
  ActivityEvent,
  ApiEndpoint,
  AuditLog,
  Capability,
  DocumentEntry,
  IntegrationItem,
  NavSection,
  Platform,
  ProducerJourney,
  RoleDefinition,
  SystemSettings,
  User,
  UserRole,
  WorkflowExecution,
} from './types/ipp';

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('ipp_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      // ignore
    }
    return 'light';
  });

  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Core Domain State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [apis, setApis] = useState<ApiEndpoint[]>([]);
  const [documents, setDocuments] = useState<DocumentEntry[]>([]);
  const [journeys, setJourneys] = useState<ProducerJourney[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowExecution[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [aiConfigured, setAiConfigured] = useState(false);

  // Cross-module deep-link selection state
  const [selectedPlatformId, setSelectedPlatformId] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [explorerApi, setExplorerApi] = useState<ApiEndpoint | null>(null);

  // Utility Modals
  const [helpOpen, setHelpOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [exportingType, setExportingType] = useState<'pdf' | 'pptx' | null>(null);

  const pushToast = useCallback((type: ToastMessage['type'], title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('ipp_theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const loadAll = useCallback(async () => {
    try {
      const [
        sessionRes,
        overviewRes,
        platRes,
        capRes,
        apiRes,
        docRes,
        jrnRes,
        wfRes,
        intRes,
        adminRes,
        auditRes,
        settingsRes,
      ] = await Promise.all([
        ippApi.getSession(),
        ippApi.getOverview(),
        ippApi.getPlatforms(),
        ippApi.getCapabilities(),
        ippApi.getApis(),
        ippApi.getDocuments(),
        ippApi.getJourneys(),
        ippApi.getWorkflows(),
        ippApi.getIntegrations(),
        ippApi.getAdminUsers(),
        ippApi.getAuditLogs(),
        ippApi.getSettings(),
      ]);

      setCurrentUser(sessionRes.user);
      setAvailableUsers(sessionRes.availableUsers);
      setAiConfigured(overviewRes.aiConfigured);
      setActivities(overviewRes.activities);
      setPlatforms(platRes.items);
      setCapabilities(capRes.items);
      setApis(apiRes.items);
      setDocuments(docRes.items);
      setJourneys(jrnRes.items);
      setWorkflows(wfRes.items);
      setIntegrations(intRes.items);
      setRoles(adminRes.roles);
      setAuditLogs(auditRes.items);
      setSettings(settingsRes.settings);
    } catch (err) {
      pushToast('error', 'Failed to load portal data', err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const refreshAdminAndActivity = useCallback(async () => {
    const [overviewRes, auditRes] = await Promise.all([ippApi.getOverview(), ippApi.getAuditLogs()]);
    setActivities(overviewRes.activities);
    setAuditLogs(auditRes.items);
  }, []);

  const handleSwitchUser = async (userId: string) => {
    try {
      const res = await ippApi.loginAs(userId);
      setCurrentUser(res.user);
      await refreshAdminAndActivity();
      pushToast('info', `Signed in as ${res.user.name}`, `Active RBAC role: ${res.user.role}`);
    } catch (err) {
      pushToast('error', 'Role switch failed', err instanceof Error ? err.message : undefined);
    }
  };

  if (loading || !currentUser || !settings) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] dark:bg-[#0B1221] p-8 max-w-5xl mx-auto space-y-6">
        <div className="h-10 w-64 rounded-lg bg-slate-200/80 dark:bg-slate-800 animate-pulse" />
        <SkeletonRows count={6} />
      </div>
    );
  }

  const kpis = {
    registeredPlatforms: platforms.length,
    availableApis: apis.length,
    publishedDocuments: documents.filter((d) => d.status === 'Published').length,
    totalDocuments: documents.length,
    activeProducerWorkflows: journeys.filter((j) => j.status !== 'Published').length,
  };

  return (
    <AppShell
      activeSection={activeSection}
      onNavigate={(sec) => {
        setActiveSection(sec);
        if (sec !== 'platforms') setSelectedPlatformId(null);
      }}
      theme={theme}
      onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
      currentUser={currentUser}
      availableUsers={availableUsers}
      onSwitchUser={handleSwitchUser}
      platforms={platforms}
      apis={apis}
      capabilities={capabilities}
      documents={documents}
      activities={activities}
      onSelectPlatform={(id) => {
        setSelectedPlatformId(id);
        setActiveSection('platforms');
      }}
      onSelectApi={(api) => {
        setExplorerApi(api);
        setActiveSection('explorer');
      }}
      onSelectDoc={(id) => {
        setSelectedDocId(id);
        setActiveSection('docs');
      }}
      onOpenHelp={() => setHelpOpen(true)}
      onOpenPreferences={() => setPrefsOpen(true)}
    >
      {activeSection === 'overview' && (
        <OverviewView
          kpis={kpis}
          platforms={platforms}
          apis={apis}
          capabilities={capabilities}
          journeys={journeys}
          activities={activities}
          integrations={integrations}
          aiConfigured={aiConfigured}
          onNavigate={setActiveSection}
          onSelectPlatform={(id) => {
            setSelectedPlatformId(id);
            setActiveSection('platforms');
          }}
          onSelectApi={(api) => {
            setExplorerApi(api);
            setActiveSection('explorer');
          }}
        />
      )}

      {activeSection === 'platforms' && (
        <PlatformCatalogView
          platforms={platforms}
          capabilities={capabilities}
          apis={apis}
          documents={documents}
          selectedPlatformId={selectedPlatformId}
          userRole={currentUser.role}
          onSelectPlatform={setSelectedPlatformId}
          onCreatePlatform={async (payload) => {
            try {
              const res = await ippApi.createPlatform(payload);
              setPlatforms((prev) => [res.platform, ...prev]);
              await refreshAdminAndActivity();
              pushToast('success', 'Platform registered', res.platform.name);
            } catch (err) {
              pushToast('error', 'Could not register platform', err instanceof Error ? err.message : undefined);
            }
          }}
          onUpdatePlatform={async (id, payload) => {
            try {
              const res = await ippApi.updatePlatform(id, payload);
              setPlatforms((prev) => prev.map((p) => (p.id === id ? res.platform : p)));
              await refreshAdminAndActivity();
              pushToast('success', 'Platform updated', res.platform.name);
            } catch (err) {
              pushToast('error', 'Update failed', err instanceof Error ? err.message : undefined);
            }
          }}
          onOpenApi={(api) => {
            setExplorerApi(api);
            setActiveSection('explorer');
          }}
          onOpenDoc={(docId) => {
            setSelectedDocId(docId);
            setActiveSection('docs');
          }}
          onStartIntegration={(plat) => {
            const firstApi = apis.find((a) => a.platformId === plat.id);
            if (firstApi) {
              setExplorerApi(firstApi);
              setActiveSection('explorer');
              pushToast('info', `Loaded ${firstApi.name}`, 'Ready to test in API Explorer.');
            } else {
              setActiveSection('producer');
              pushToast('info', 'No API attached yet', 'Add an API endpoint in Producer Workspace.');
            }
          }}
        />
      )}

      {activeSection === 'apis' && (
        <ApiMarketplaceView
          apis={apis}
          platforms={platforms}
          onTestInExplorer={(api) => {
            setExplorerApi(api);
            setActiveSection('explorer');
          }}
          onOpenPlatform={(id) => {
            setSelectedPlatformId(id);
            setActiveSection('platforms');
          }}
          onOpenDoc={(docId) => {
            setSelectedDocId(docId);
            setActiveSection('docs');
          }}
        />
      )}

      {activeSection === 'explorer' && <ApiExplorerView apis={apis} selectedApi={explorerApi} />}

      {activeSection === 'producer' && (
        <ProducerWorkspaceView
          journeys={journeys}
          capabilities={capabilities}
          userRole={currentUser.role}
          userName={currentUser.name}
          onSaveDraft={async (payload, existingId) => {
            if (existingId) {
              const res = await ippApi.updateJourney(existingId, payload);
              setJourneys((prev) => prev.map((j) => (j.id === existingId ? res.journey : j)));
              pushToast('success', 'Producer draft updated', res.journey.platformName);
              return res.journey;
            }
            const res = await ippApi.saveJourney(payload);
            setJourneys((prev) => [res.journey, ...prev]);
            await refreshAdminAndActivity();
            pushToast('success', 'Producer draft saved', res.journey.platformName);
            return res.journey;
          }}
          onSubmitJourney={async (id) => {
            try {
              const res = await ippApi.submitJourney(id);
              setJourneys((prev) => prev.map((j) => (j.id === id ? res.journey : j)));
              await refreshAdminAndActivity();
              pushToast('success', 'Submitted for review', `${res.journey.platformName} is now Pending Review.`);
            } catch (err) {
              pushToast('error', 'Submission failed', err instanceof Error ? err.message : undefined);
            }
          }}
          onApproveJourney={async (id) => {
            try {
              const res = await ippApi.approveJourney(id);
              setJourneys((prev) => prev.map((j) => (j.id === id ? res.journey : j)));
              await refreshAdminAndActivity();
              pushToast('success', 'Journey approved', 'Ready to publish to Enterprise Catalog.');
            } catch (err) {
              pushToast('error', 'Approval failed', err instanceof Error ? err.message : undefined);
            }
          }}
          onRejectJourney={async (id) => {
            try {
              const res = await ippApi.rejectJourney(id);
              setJourneys((prev) => prev.map((j) => (j.id === id ? res.journey : j)));
              await refreshAdminAndActivity();
              pushToast('info', 'Journey returned', 'Status set to Rejected.');
            } catch (err) {
              pushToast('error', 'Rejection failed', err instanceof Error ? err.message : undefined);
            }
          }}
          onPublishJourney={async (id) => {
            try {
              await ippApi.publishJourney(id);
              await loadAll();
              pushToast('success', 'Published to Enterprise Catalog', 'Platform, capability, API, and docs are now live.');
            } catch (err) {
              pushToast('error', 'Publish failed', err instanceof Error ? err.message : undefined);
            }
          }}
        />
      )}

      {activeSection === 'docs' && (
        <DocumentationHubView
          documents={documents}
          platforms={platforms}
          selectedDocId={selectedDocId}
          userRole={currentUser.role}
          userName={currentUser.name}
          onSelectDoc={setSelectedDocId}
          onCreateDoc={async (payload) => {
            const res = await ippApi.createDocument(payload);
            setDocuments((prev) => [res.document, ...prev]);
            await refreshAdminAndActivity();
            pushToast('success', 'Document created', res.document.title);
            return res.document;
          }}
          onUpdateDoc={async (id, payload) => {
            const res = await ippApi.updateDocument(id, payload);
            setDocuments((prev) => prev.map((d) => (d.id === id ? res.document : d)));
            await refreshAdminAndActivity();
            pushToast('success', 'Revision saved', `Updated to v${res.document.version}`);
          }}
          onPublishDoc={async (id) => {
            const res = await ippApi.publishDocument(id);
            setDocuments((prev) => prev.map((d) => (d.id === id ? res.document : d)));
            await refreshAdminAndActivity();
            pushToast('success', 'Document published', res.document.title);
          }}
          onDeleteDoc={async (id) => {
            await ippApi.deleteDocument(id);
            setDocuments((prev) => prev.filter((d) => d.id !== id));
            await refreshAdminAndActivity();
            pushToast('info', 'Document deleted');
          }}
          onOpenPlatform={(id) => {
            setSelectedPlatformId(id);
            setActiveSection('platforms');
          }}
        />
      )}

      {activeSection === 'capabilities' && (
        <CapabilityManagementView
          capabilities={capabilities}
          platforms={platforms}
          userRole={currentUser.role}
          userName={currentUser.name}
          onCreateCapability={async (payload) => {
            try {
              const res = await ippApi.createCapability(payload);
              setCapabilities((prev) => [res.capability, ...prev]);
              await refreshAdminAndActivity();
              pushToast('success', 'Capability created', res.capability.name);
            } catch (err) {
              pushToast('error', 'Failed to create capability', err instanceof Error ? err.message : undefined);
            }
          }}
          onUpdateCapability={async (id, payload) => {
            try {
              const res = await ippApi.updateCapability(id, payload);
              setCapabilities((prev) => prev.map((c) => (c.id === id ? res.capability : c)));
              await refreshAdminAndActivity();
              pushToast('success', 'Capability updated', res.capability.name);
            } catch (err) {
              pushToast('error', 'Update failed', err instanceof Error ? err.message : undefined);
            }
          }}
          onDeleteCapability={async (id) => {
            try {
              await ippApi.deleteCapability(id);
              setCapabilities((prev) => prev.filter((c) => c.id !== id));
              await refreshAdminAndActivity();
              pushToast('info', 'Capability deleted');
            } catch (err) {
              pushToast('error', 'Delete failed', err instanceof Error ? err.message : undefined);
            }
          }}
        />
      )}

      {activeSection === 'assistant' && <AiAssistantView onNavigate={setActiveSection} />}

      {activeSection === 'workflows' && (
        <AgentWorkflowsView
          workflows={workflows}
          onExecuteWorkflow={async (payload) => {
            const res = await ippApi.executeWorkflow(payload);
            setWorkflows((prev) => [res.workflow, ...prev]);
            await refreshAdminAndActivity();
            pushToast(
              res.workflow.status === 'Failed' ? 'error' : 'success',
              `Workflow ${res.workflow.status}`,
              `${res.workflow.name} (${res.workflow.totalDurationMs}ms)`
            );
            return res.workflow;
          }}
          onRetryWorkflow={async (id) => {
            const res = await ippApi.retryWorkflow(id);
            setWorkflows((prev) => prev.map((w) => (w.id === id ? res.workflow : w)));
            await refreshAdminAndActivity();
            pushToast('success', 'Workflow retried successfully', res.workflow.name);
          }}
        />
      )}

      {activeSection === 'integrations' && (
        <IntegrationsView
          integrations={integrations}
          onCheckHealth={async (id) => {
            const res = await ippApi.checkIntegration(id);
            setIntegrations((prev) => prev.map((i) => (i.id === id ? res.integration : i)));
            await refreshAdminAndActivity();
            pushToast('info', `${res.integration.name}`, `Status: ${res.integration.connectionState}`);
          }}
        />
      )}

      {activeSection === 'admin' && (
        <AdministrationView
          users={availableUsers}
          roles={roles}
          auditLogs={auditLogs}
          settings={settings}
          currentUser={currentUser}
          onUpdateUserRole={async (userId, role: UserRole) => {
            try {
              const res = await ippApi.updateUserRole(userId, role);
              setAvailableUsers((prev) => prev.map((u) => (u.id === userId ? res.user : u)));
              if (currentUser.id === userId) setCurrentUser(res.user);
              await refreshAdminAndActivity();
              pushToast('success', 'Role updated', `${res.user.name} is now ${res.user.role}`);
            } catch (err) {
              await refreshAdminAndActivity();
              pushToast('error', 'Permission denied', err instanceof Error ? err.message : undefined);
            }
          }}
          onUpdateSettings={async (next) => {
            try {
              const res = await ippApi.updateSettings(next);
              setSettings(res.settings);
              await refreshAdminAndActivity();
              pushToast('success', 'System settings updated');
            } catch (err) {
              pushToast('error', 'Settings update failed', err instanceof Error ? err.message : undefined);
            }
          }}
        />
      )}

      {/* Help & Architecture Modal */}
      <Modal
        open={helpOpen}
        title="IPP — Internal Platforms Portal Guide"
        subtitle="Discover. Connect. Build. Accelerate."
        onClose={() => setHelpOpen(false)}
      >
        <div className="space-y-4 text-sm text-[#334155] dark:text-slate-300 leading-relaxed">
          <p>
            <strong>IPP (Internal Platforms Portal)</strong> unifies internal banking technology platforms, APIs, technical documentation, capability dependencies, producer onboarding workflows, and AI-assisted developer tooling into a single self-service portal.
          </p>
          <div className="p-3.5 rounded-lg bg-[#F7F9FC] dark:bg-[#0B1221] border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
            <p className="font-semibold text-[#101B32] dark:text-slate-100">
              Demonstration Data & Context Notice
            </p>
            <p>
              All platforms, APIs, capabilities, documentation entries, and user profiles shown here are illustrative sample records created in the context of a U.S. Bancorp internal developer platform architecture.
            </p>
            <p>
              Reported project benchmark: Approximately 30% improvement in documentation-generation and AI workflow execution performance achieved through parallel processing, multithreading, and Redis caching.
            </p>
          </div>
          <div className="text-xs space-y-1">
            <p className="font-semibold text-[#101B32] dark:text-slate-100">Role Switching Tip</p>
            <p>
              Use the User Profile menu in the header to switch between <strong>Administrator</strong>, <strong>Platform Producer</strong>, <strong>Developer</strong>, and <strong>Viewer</strong> accounts to test real server-side JWT RBAC enforcement and audit logging.
            </p>
          </div>
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
            <p className="text-xs font-semibold text-[#101B32] dark:text-slate-100">
              Offline Study & Client Presentation Downloads
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                    pushToast('success', 'Study Guide PDF ready', 'IPP_Complete_Project_Study_Guide.pdf downloaded.');
                  } catch (err) {
                    pushToast('error', 'PDF download failed', err instanceof Error ? err.message : undefined);
                  } finally {
                    setExportingType(null);
                  }
                }}
                className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1221] hover:border-[#2457D6] dark:hover:border-[#438BFF] text-xs font-medium text-[#101B32] dark:text-slate-100 transition-colors disabled:opacity-60"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#2457D6] dark:text-[#438BFF] shrink-0" />
                  <span>{exportingType === 'pdf' ? 'Generating PDF...' : 'Complete Study Guide (PDF)'}</span>
                </span>
                <Download className="w-3.5 h-3.5 text-[#65748B] shrink-0" />
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
                    pushToast('success', 'Client Deck PPTX ready', 'IPP_Client_Presentation.pptx downloaded.');
                  } catch (err) {
                    pushToast('error', 'PPTX download failed', err instanceof Error ? err.message : undefined);
                  } finally {
                    setExportingType(null);
                  }
                }}
                className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg bg-[#2457D6] hover:bg-[#1d48b8] text-xs font-medium text-white transition-colors disabled:opacity-60"
              >
                <span className="flex items-center gap-2">
                  <Presentation className="w-4 h-4 shrink-0" />
                  <span>{exportingType === 'pptx' ? 'Generating PPTX...' : 'Client Presentation (PPTX)'}</span>
                </span>
                <Download className="w-3.5 h-3.5 shrink-0" />
              </button>
            </div>
            <p className="text-[11px] text-[#65748B] dark:text-slate-400">
              If your preview iframe blocks downloads, open{' '}
              <a
                href="/api/exports/project-guide.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#2457D6] dark:text-[#438BFF] underline"
              >
                Study Guide PDF
              </a>{' '}
              or{' '}
              <a
                href="/api/exports/client-presentation.pptx"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#2457D6] dark:text-[#438BFF] underline"
              >
                Client PPTX
              </a>{' '}
              in a new browser tab.
            </p>
          </div>
        </div>
      </Modal>

      {/* Workspace Preferences Modal */}
      <Modal
        open={prefsOpen}
        title="Workspace Preferences"
        subtitle="Personalize display theme and session defaults"
        onClose={() => setPrefsOpen(false)}
      >
        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-[#101B32] dark:text-slate-100">Interface Theme</p>
              <p className="text-xs text-[#65748B]">Toggle between Cloud White light and Midnight Navy dark mode</p>
            </div>
            <button
              type="button"
              onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
              className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700"
            >
              Current: {theme === 'light' ? 'Light' : 'Dark'}
            </button>
          </div>
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <p className="font-medium text-[#101B32] dark:text-slate-100">Active Session</p>
              <p className="text-xs text-[#65748B]">
                {currentUser.name} ({currentUser.role}) via HTTP-only JWT cookie
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPrefsOpen(false);
                setActiveSection('admin');
              }}
              className="text-xs font-medium text-[#2457D6] dark:text-[#438BFF] hover:underline"
            >
              Open Admin Console
            </button>
          </div>
        </div>
      </Modal>

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </AppShell>
  );
}
