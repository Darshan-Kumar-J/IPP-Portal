export type UserRole = 'Administrator' | 'Platform Producer' | 'Developer' | 'Viewer';

export type LifecycleStatus = 'Published' | 'In Review' | 'Approved' | 'Draft' | 'Deprecated';

export type WorkflowStatus =
  | 'Draft'
  | 'In Progress'
  | 'Pending Review'
  | 'Approved'
  | 'Published'
  | 'Rejected';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type NavSection =
  | 'overview'
  | 'platforms'
  | 'apis'
  | 'producer'
  | 'docs'
  | 'capabilities'
  | 'assistant'
  | 'workflows'
  | 'explorer'
  | 'integrations'
  | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  department: string;
  avatarUrl: string;
  status: 'Active' | 'Suspended';
  lastLogin: string;
  isDemoRecord: true;
}

export interface RoleDefinition {
  role: UserRole;
  description: string;
  permissions: string[];
}

export interface Platform {
  id: string;
  name: string;
  slug: string;
  description: string;
  owner: string;
  ownerEmail: string;
  category: string;
  domain: string;
  lifecycleStatus: LifecycleStatus;
  capabilityIds: string[];
  apiIds: string[];
  documentIds: string[];
  slaTarget: string;
  tier: 'Tier 1' | 'Tier 2' | 'Tier 3';
  createdAt: string;
  updatedAt: string;
  isDemoRecord: true;
}

export interface Capability {
  id: string;
  name: string;
  description: string;
  category: string;
  owner: string;
  lifecycleStatus: LifecycleStatus;
  platformIds: string[];
  dependencyIds: string[];
  associatedServices: string[];
  createdAt: string;
  updatedAt: string;
  isDemoRecord: true;
}

export interface ApiEndpoint {
  id: string;
  name: string;
  version: string;
  description: string;
  category: string;
  platformId: string;
  owner: string;
  baseUrl: string;
  sandboxPath: string;
  methods: HttpMethod[];
  defaultMethod: HttpMethod;
  authType: 'OAuth 2.0 + mTLS' | 'JWT Bearer' | 'Internal Service Token' | 'API Key + HMAC';
  rateLimit: string;
  sampleHeaders: Record<string, string>;
  sampleQuery: Record<string, string>;
  sampleBody: string;
  documentId?: string;
  lifecycleStatus: LifecycleStatus;
  updatedAt: string;
  isDemoRecord: true;
}

export interface DocumentVersion {
  version: string;
  updatedAt: string;
  updatedBy: string;
  summary: string;
  content: string;
}

export interface DocumentEntry {
  id: string;
  title: string;
  category: string;
  platformId: string;
  apiId?: string;
  owner: string;
  status: 'Draft' | 'Published';
  version: string;
  content: string;
  versions: DocumentVersion[];
  createdAt: string;
  updatedAt: string;
  isDemoRecord: true;
}

export interface ProducerJourney {
  id: string;
  platformName: string;
  description: string;
  businessDomain: string;
  technicalOwner: string;
  contactEmail: string;
  capabilityName: string;
  capabilityDescription: string;
  capabilityCategory: string;
  capabilityDependencies: string[];
  associatedServices: string[];
  apiName: string;
  apiBaseUrl: string;
  apiMethods: HttpMethod[];
  apiAuthType: ApiEndpoint['authType'];
  apiSpecification: string;
  docTitle: string;
  docContent: string;
  docUsageInstructions: string;
  docExamples: string;
  currentStep: number;
  status: WorkflowStatus;
  reviewNotes?: string;
  durationSeconds: number;
  createdAt: string;
  updatedAt: string;
  isDemoRecord: true;
}

export interface ActivityEvent {
  id: string;
  actor: string;
  action: string;
  target: string;
  targetType: 'Platform' | 'API' | 'Documentation' | 'Capability' | 'Workflow' | 'Security';
  timestamp: string;
  isDemoRecord: true;
}

export interface WorkflowNodeExecution {
  id: string;
  label: string;
  agentType: 'Router' | 'Validator' | 'LangGraph' | 'DeepAgent' | 'A2A' | 'Gate' | 'Output';
  status: 'idle' | 'running' | 'completed' | 'skipped' | 'error';
  durationMs: number;
  outputSummary: string;
  a2aPayload?: Record<string, unknown>;
}

export interface WorkflowExecution {
  id: string;
  name: string;
  intent: 'platform_discovery' | 'doc_generation' | 'capability_audit' | 'producer_onboarding';
  prompt: string;
  status: 'Running' | 'Completed' | 'Failed';
  startedAt: string;
  completedAt?: string;
  totalDurationMs: number;
  selectedBranch: string;
  nodes: WorkflowNodeExecution[];
  logs: Array<{ timestamp: string; level: 'INFO' | 'WARN' | 'ERROR'; node: string; message: string }>;
  isSimulated: true;
}

export interface IntegrationItem {
  id: string;
  name: string;
  category: 'Backend' | 'Database' | 'Caching' | 'AI Orchestration' | 'Gateway & Infra';
  description: string;
  connectionState: 'Connected' | 'Demo Sandbox' | 'Not Configured';
  configurationStatus: string;
  lastCheckedAt: string;
  endpointHint: string;
  envVarName: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  resource: string;
  outcome: 'Allowed' | 'Denied';
  ipAddress: string;
}

export interface SystemSettings {
  portalName: string;
  environmentLabel: string;
  requireAdminApprovalForPublish: boolean;
  enforceMtlsOnTier1Apis: boolean;
  redisCacheTtlSeconds: number;
  aiModeLabel: string;
}
