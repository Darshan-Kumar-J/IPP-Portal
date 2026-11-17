import type {
  ActivityEvent,
  ApiEndpoint,
  AuditLog,
  Capability,
  DocumentEntry,
  HttpMethod,
  IntegrationItem,
  Platform,
  ProducerJourney,
  RoleDefinition,
  SystemSettings,
  User,
  UserRole,
  WorkflowExecution,
} from '../types/ipp';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const ippApi = {
  // Auth
  getSession: () =>
    request<{ user: User; availableUsers: User[]; sessionMode: string }>('/api/auth/me'),
  loginAs: (userId: string) =>
    request<{ user: User; authenticated: boolean }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),
  logout: () =>
    request<{ loggedOut: boolean }>('/api/auth/logout', {
      method: 'POST',
    }),

  // Overview
  getOverview: () =>
    request<{
      kpis: {
        registeredPlatforms: number;
        availableApis: number;
        publishedDocuments: number;
        totalDocuments: number;
        activeProducerWorkflows: number;
      };
      platforms: Platform[];
      journeys: ProducerJourney[];
      activities: ActivityEvent[];
      aiConfigured: boolean;
    }>('/api/overview'),

  // Platforms
  getPlatforms: () => request<{ items: Platform[]; total: number }>('/api/platforms'),
  createPlatform: (payload: Partial<Platform>) =>
    request<{ platform: Platform }>('/api/platforms', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updatePlatform: (id: string, payload: Partial<Platform>) =>
    request<{ platform: Platform }>(`/api/platforms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deletePlatform: (id: string) =>
    request<{ deleted: boolean }>(`/api/platforms/${id}`, { method: 'DELETE' }),

  // Capabilities
  getCapabilities: () => request<{ items: Capability[]; total: number }>('/api/capabilities'),
  createCapability: (payload: Partial<Capability>) =>
    request<{ capability: Capability }>('/api/capabilities', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateCapability: (id: string, payload: Partial<Capability>) =>
    request<{ capability: Capability }>(`/api/capabilities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteCapability: (id: string) =>
    request<{ deleted: boolean }>(`/api/capabilities/${id}`, { method: 'DELETE' }),

  // Docs
  getDocuments: () => request<{ items: DocumentEntry[]; total: number }>('/api/documents'),
  createDocument: (payload: Partial<DocumentEntry> & { summary?: string }) =>
    request<{ document: DocumentEntry }>('/api/documents', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateDocument: (id: string, payload: Partial<DocumentEntry> & { summary?: string }) =>
    request<{ document: DocumentEntry }>(`/api/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  publishDocument: (id: string) =>
    request<{ document: DocumentEntry }>(`/api/documents/${id}/publish`, { method: 'POST' }),
  deleteDocument: (id: string) =>
    request<{ deleted: boolean }>(`/api/documents/${id}`, { method: 'DELETE' }),

  // Producer Journeys
  getJourneys: () => request<{ items: ProducerJourney[]; total: number }>('/api/producer/journeys'),
  saveJourney: (payload: Partial<ProducerJourney>) =>
    request<{ journey: ProducerJourney }>('/api/producer/journeys', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateJourney: (id: string, payload: Partial<ProducerJourney>) =>
    request<{ journey: ProducerJourney }>(`/api/producer/journeys/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  submitJourney: (id: string) =>
    request<{ journey: ProducerJourney }>(`/api/producer/journeys/${id}/submit`, { method: 'POST' }),
  approveJourney: (id: string, notes?: string) =>
    request<{ journey: ProducerJourney }>(`/api/producer/journeys/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),
  rejectJourney: (id: string, notes?: string) =>
    request<{ journey: ProducerJourney }>(`/api/producer/journeys/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),
  publishJourney: (id: string) =>
    request<{ journey: ProducerJourney; platform: Platform }>(`/api/producer/journeys/${id}/publish`, {
      method: 'POST',
    }),

  // API Catalog & Explorer
  getApis: () => request<{ items: ApiEndpoint[]; total: number }>('/api/catalog/apis'),
  proxyApiRequest: (payload: {
    method: HttpMethod;
    url: string;
    headers: Record<string, string>;
    query: Record<string, string>;
    body?: string;
  }) =>
    request<{
      status: number;
      statusText: string;
      durationMs: number;
      mode: string;
      headers: Record<string, string>;
      body: unknown;
    }>('/api/explorer/proxy', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // AI & Workflows
  getAiStatus: () => request<{ configured: boolean; model: string }>('/api/ai/status'),
  getWorkflows: () => request<{ items: WorkflowExecution[]; total: number }>('/api/ai/workflows'),
  executeWorkflow: (payload: {
    name: string;
    intent: WorkflowExecution['intent'];
    prompt: string;
    simulateError?: boolean;
  }) =>
    request<{ workflow: WorkflowExecution }>('/api/ai/workflows/execute', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  retryWorkflow: (id: string) =>
    request<{ workflow: WorkflowExecution }>(`/api/ai/workflows/${id}/retry`, { method: 'POST' }),

  // Integrations
  getIntegrations: () => request<{ items: IntegrationItem[] }>('/api/integrations'),
  checkIntegration: (id: string) =>
    request<{ integration: IntegrationItem }>(`/api/integrations/${id}/check`, { method: 'POST' }),

  // Admin
  getAdminUsers: () => request<{ items: User[]; roles: RoleDefinition[] }>('/api/admin/users'),
  updateUserRole: (id: string, role: UserRole) =>
    request<{ user: User }>(`/api/admin/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),
  getAuditLogs: () => request<{ items: AuditLog[] }>('/api/admin/audit-logs'),
  getSettings: () => request<{ settings: SystemSettings }>('/api/admin/settings'),
  updateSettings: (settings: Partial<SystemSettings>) =>
    request<{ settings: SystemSettings }>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),
};
