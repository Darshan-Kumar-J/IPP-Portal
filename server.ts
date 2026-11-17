import 'dotenv/config';
import cookieParser from 'cookie-parser';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import {
  buildPortalContextSummary,
  createGeminiClient,
  generateDemoAssistantResponse,
  isGeminiConfigured,
} from './server/ai.js';
import {
  AuthenticatedRequest,
  clearAuthCookies,
  extractAuthUser,
  requireAuth,
  requireRole,
  setAuthCookies,
  verifyToken,
} from './server/auth.js';
import {
  ROLE_DEFINITIONS,
  SEED_ACTIVITIES,
  SEED_APIS,
  SEED_AUDIT_LOGS,
  SEED_CAPABILITIES,
  SEED_DOCUMENTS,
  SEED_INTEGRATIONS,
  SEED_JOURNEYS,
  SEED_PLATFORMS,
  SEED_SETTINGS,
  SEED_USERS,
  SEED_WORKFLOWS,
} from './server/seedData.js';
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
  SystemSettings,
  User,
  UserRole,
  WorkflowExecution,
  WorkflowNodeExecution,
} from './src/types/ipp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory store initialized with illustrative enterprise seed data
const store = {
  users: structuredClone(SEED_USERS) as User[],
  platforms: structuredClone(SEED_PLATFORMS) as Platform[],
  capabilities: structuredClone(SEED_CAPABILITIES) as Capability[],
  apis: structuredClone(SEED_APIS) as ApiEndpoint[],
  documents: structuredClone(SEED_DOCUMENTS) as DocumentEntry[],
  journeys: structuredClone(SEED_JOURNEYS) as ProducerJourney[],
  activities: structuredClone(SEED_ACTIVITIES) as ActivityEvent[],
  workflows: structuredClone(SEED_WORKFLOWS) as WorkflowExecution[],
  integrations: structuredClone(SEED_INTEGRATIONS) as IntegrationItem[],
  auditLogs: structuredClone(SEED_AUDIT_LOGS) as AuditLog[],
  settings: structuredClone(SEED_SETTINGS) as SystemSettings,
};

function recordAudit(
  req: AuthenticatedRequest,
  action: string,
  resource: string,
  outcome: 'Allowed' | 'Denied' = 'Allowed'
): void {
  const actor = req.authUser;
  store.auditLogs.unshift({
    id: `aud-${Date.now().toString(36)}`,
    timestamp: new Date().toISOString(),
    actorName: actor?.name || 'System Session',
    actorRole: actor?.role || 'Viewer',
    action,
    resource,
    outcome,
    ipAddress: req.ip || '127.0.0.1',
  });
  if (store.auditLogs.length > 200) store.auditLogs.pop();
}

function recordActivity(
  actor: string,
  action: string,
  target: string,
  targetType: ActivityEvent['targetType']
): void {
  store.activities.unshift({
    id: `act-${Date.now().toString(36)}`,
    actor,
    action,
    target,
    targetType,
    timestamp: new Date().toISOString(),
    isDemoRecord: true,
  });
  if (store.activities.length > 50) store.activities.pop();
}

function getDemoSessionUser(req: AuthenticatedRequest): User {
  const tokenUser = extractAuthUser(req);
  if (tokenUser) {
    const found = store.users.find((u) => u.id === tokenUser.sub);
    if (found) return found;
  }
  return store.users[0];
}

// Validation schemas
const platformSchema = z.object({
  name: z.string().min(2, 'Platform name must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  owner: z.string().min(2, 'Owner is required'),
  ownerEmail: z.string().email('Valid owner email is required').optional(),
  category: z.string().min(2, 'Category is required'),
  domain: z.string().min(2, 'Domain is required').optional(),
  lifecycleStatus: z.enum(['Published', 'In Review', 'Approved', 'Draft', 'Deprecated']).default('Draft'),
  slaTarget: z.string().default('99.95%'),
  tier: z.enum(['Tier 1', 'Tier 2', 'Tier 3']).default('Tier 2'),
});

const capabilitySchema = z.object({
  name: z.string().min(2),
  description: z.string().min(8),
  category: z.string().min(2),
  owner: z.string().min(2),
  lifecycleStatus: z.enum(['Published', 'In Review', 'Approved', 'Draft', 'Deprecated']).default('Draft'),
  platformIds: z.array(z.string()).default([]),
  dependencyIds: z.array(z.string()).default([]),
  associatedServices: z.array(z.string()).default([]),
});

const documentSchema = z.object({
  title: z.string().min(3),
  category: z.string().min(2),
  platformId: z.string().min(1),
  apiId: z.string().optional(),
  owner: z.string().min(2),
  status: z.enum(['Draft', 'Published']).default('Draft'),
  content: z.string().min(10),
  summary: z.string().optional(),
});

const journeySchema = z.object({
  platformName: z.string().min(2),
  description: z.string().min(5),
  businessDomain: z.string().min(2),
  technicalOwner: z.string().min(2),
  contactEmail: z.string().email(),
  capabilityName: z.string().optional().default(''),
  capabilityDescription: z.string().optional().default(''),
  capabilityCategory: z.string().optional().default('Core Banking'),
  capabilityDependencies: z.array(z.string()).optional().default([]),
  associatedServices: z.array(z.string()).optional().default([]),
  apiName: z.string().optional().default(''),
  apiBaseUrl: z.string().optional().default(''),
  apiMethods: z.array(z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])).optional().default(['GET']),
  apiAuthType: z
    .enum(['OAuth 2.0 + mTLS', 'JWT Bearer', 'Internal Service Token', 'API Key + HMAC'])
    .optional()
    .default('OAuth 2.0 + mTLS'),
  apiSpecification: z.string().optional().default(''),
  docTitle: z.string().optional().default(''),
  docContent: z.string().optional().default(''),
  docUsageInstructions: z.string().optional().default(''),
  docExamples: z.string().optional().default(''),
  currentStep: z.number().min(1).max(5).optional().default(1),
});

function buildWorkflowNodes(
  intent: WorkflowExecution['intent'],
  simulateError = false
): { nodes: WorkflowNodeExecution[]; branch: string } {
  const isDiscovery = intent === 'platform_discovery';
  const isDoc = intent === 'doc_generation';
  const isCap = intent === 'capability_audit';

  const branch = isDiscovery
    ? 'Platform Discovery -> Capability Validation -> Approval'
    : isDoc
    ? 'Documentation Generation -> Capability Validation -> Approval'
    : isCap
    ? 'Capability Validation -> Approval'
    : 'Platform Discovery -> Documentation Generation -> Capability Validation -> Approval';

  const nodes: WorkflowNodeExecution[] = [
    {
      id: 'n-request',
      label: 'User Request',
      agentType: 'Router',
      status: 'completed',
      durationMs: 42,
      outputSummary: 'Normalized developer prompt and workspace context.',
    },
    {
      id: 'n-validate',
      label: 'Input Validation',
      agentType: 'Validator',
      status: 'completed',
      durationMs: 96,
      outputSummary: 'Schema validated and security guardrails verified.',
    },
    {
      id: 'n-intent',
      label: 'Intent Classification',
      agentType: 'LangGraph',
      status: 'completed',
      durationMs: 245,
      outputSummary: `Classified workflow intent as ${intent}.`,
    },
    {
      id: 'n-router',
      label: 'Conditional Router',
      agentType: 'Router',
      status: 'completed',
      durationMs: 38,
      outputSummary: `Selected execution branch: ${branch}.`,
    },
    {
      id: 'n-discover',
      label: 'Platform Discovery',
      agentType: 'DeepAgent',
      status: isDiscovery || intent === 'producer_onboarding' ? 'completed' : 'skipped',
      durationMs: isDiscovery || intent === 'producer_onboarding' ? 540 : 0,
      outputSummary:
        isDiscovery || intent === 'producer_onboarding'
          ? `Queried ${store.platforms.length} platforms and ${store.apis.length} APIs via A2A registry.`
          : 'Skipped for current branch.',
      a2aPayload:
        isDiscovery || intent === 'producer_onboarding'
          ? {
              protocol: 'A2A/1.0',
              sourceAgent: 'langgraph-supervisor',
              targetAgent: 'catalog-discovery-agent',
              matchedPlatforms: store.platforms.slice(0, 3).map((p) => p.id),
            }
          : undefined,
    },
    {
      id: 'n-docgen',
      label: 'Documentation Generation',
      agentType: 'DeepAgent',
      status: isDoc || intent === 'producer_onboarding' ? (simulateError ? 'error' : 'completed') : 'skipped',
      durationMs: isDoc || intent === 'producer_onboarding' ? 680 : 0,
      outputSummary: simulateError
        ? 'Simulated upstream timeout waiting for OpenAPI schema parser. Use Retry to recover.'
        : isDoc || intent === 'producer_onboarding'
        ? 'Synthesized Markdown quickstart & cURL snippets.'
        : 'Skipped for current branch.',
      a2aPayload:
        isDoc || intent === 'producer_onboarding'
          ? {
              protocol: 'A2A/1.0',
              sourceAgent: 'langgraph-supervisor',
              targetAgent: 'doc-synthesis-agent',
              format: 'markdown-v1',
            }
          : undefined,
    },
    {
      id: 'n-capcheck',
      label: 'Capability Validation',
      agentType: 'A2A',
      status: simulateError && (isDoc || intent === 'producer_onboarding') ? 'skipped' : 'completed',
      durationMs: simulateError && (isDoc || intent === 'producer_onboarding') ? 0 : 415,
      outputSummary: simulateError
        ? 'Blocked pending Documentation Generation.'
        : `Verified ${store.capabilities.length} capability nodes and IAM dependencies.`,
      a2aPayload: {
        protocol: 'A2A/1.0',
        sourceAgent: 'capability-graph-agent',
        targetAgent: 'iam-policy-verifier',
        dependenciesChecked: ['cap-oauth', 'cap-mtls', 'cap-risk-score'],
      },
    },
    {
      id: 'n-approval',
      label: 'Approval Gate',
      agentType: 'Gate',
      status: simulateError && (isDoc || intent === 'producer_onboarding') ? 'skipped' : 'completed',
      durationMs: simulateError && (isDoc || intent === 'producer_onboarding') ? 0 : 160,
      outputSummary: simulateError ? 'Gate bypassed due to prior error.' : 'Policy gate cleared.',
    },
    {
      id: 'n-complete',
      label: 'Workflow Completion',
      agentType: 'Output',
      status: simulateError && (isDoc || intent === 'producer_onboarding') ? 'error' : 'completed',
      durationMs: 75,
      outputSummary: simulateError
        ? 'Workflow halted with recoverable error.'
        : 'Completed and persisted execution trace.',
    },
  ];

  return { nodes, branch };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());

  // Ensure every session starts with a valid demo JWT cookie if none present on first API hit,
  // while still supporting explicit login/logout/role switching.
  app.use('/api', (req: AuthenticatedRequest, _res, next) => {
    const authUser = extractAuthUser(req);
    if (authUser) {
      req.authUser = authUser;
    }
    next();
  });

  // ------------------------------------------------------------------
  // Authentication Endpoints
  // ------------------------------------------------------------------
  app.post('/api/auth/login', (req: AuthenticatedRequest, res) => {
    const { userId, email } = req.body as { userId?: string; email?: string };
    const user =
      store.users.find((u) => (userId && u.id === userId) || (email && u.email === email)) ||
      store.users[0];

    user.lastLogin = new Date().toISOString();
    setAuthCookies(res, user);
    req.authUser = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      type: 'access',
    };
    recordAudit(req, 'AUTH_LOGIN', `${user.email} (${user.role})`, 'Allowed');
    res.json({ user, authenticated: true });
  });

  app.post('/api/auth/refresh', (req: AuthenticatedRequest, res) => {
    const refreshToken = req.cookies?.ipp_refresh_token;
    if (!refreshToken) {
      res.status(401).json({ error: 'No refresh token present.' });
      return;
    }
    const decoded = verifyToken(refreshToken);
    if (!decoded || decoded.type !== 'refresh') {
      res.status(401).json({ error: 'Invalid or expired refresh token.' });
      return;
    }
    const user = store.users.find((u) => u.id === decoded.sub);
    if (!user) {
      res.status(401).json({ error: 'User account not found.' });
      return;
    }
    setAuthCookies(res, user);
    res.json({ user, refreshed: true });
  });

  app.post('/api/auth/logout', (req: AuthenticatedRequest, res) => {
    recordAudit(req, 'AUTH_LOGOUT', req.authUser?.email || 'session', 'Allowed');
    clearAuthCookies(res);
    res.json({ loggedOut: true });
  });

  app.get('/api/auth/me', (req: AuthenticatedRequest, res) => {
    const tokenUser = extractAuthUser(req);
    if (!tokenUser) {
      // Auto-bootstrap default illustrative Principal Architect session for seamless portal preview
      const defaultUser = store.users[0];
      setAuthCookies(res, defaultUser);
      res.json({ user: defaultUser, availableUsers: store.users, sessionMode: 'demo-jwt-cookie' });
      return;
    }
    const user = store.users.find((u) => u.id === tokenUser.sub) || store.users[0];
    res.json({ user, availableUsers: store.users, sessionMode: 'demo-jwt-cookie' });
  });

  // ------------------------------------------------------------------
  // Overview Summary
  // ------------------------------------------------------------------
  app.get('/api/overview', (_req, res) => {
    res.json({
      kpis: {
        registeredPlatforms: store.platforms.length,
        availableApis: store.apis.length,
        publishedDocuments: store.documents.filter((d) => d.status === 'Published').length,
        totalDocuments: store.documents.length,
        activeProducerWorkflows: store.journeys.filter((j) => j.status !== 'Published').length,
      },
      platforms: store.platforms,
      journeys: store.journeys,
      activities: store.activities.slice(0, 12),
      aiConfigured: isGeminiConfigured(),
    });
  });

  // ------------------------------------------------------------------
  // Platforms CRUD
  // ------------------------------------------------------------------
  app.get('/api/platforms', (req, res) => {
    const search = String(req.query.search || '').toLowerCase();
    const category = String(req.query.category || '');
    const status = String(req.query.status || '');
    const owner = String(req.query.owner || '');

    let result = [...store.platforms];
    if (search) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.description.toLowerCase().includes(search) ||
          p.domain.toLowerCase().includes(search)
      );
    }
    if (category && category !== 'All') result = result.filter((p) => p.category === category);
    if (status && status !== 'All') result = result.filter((p) => p.lifecycleStatus === status);
    if (owner && owner !== 'All') result = result.filter((p) => p.owner === owner);

    result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    res.json({ items: result, total: result.length });
  });

  app.get('/api/platforms/:id', (req, res) => {
    const platform = store.platforms.find((p) => p.id === req.params.id);
    if (!platform) {
      res.status(404).json({ error: 'Platform not found.' });
      return;
    }
    res.json({ platform });
  });

  app.post(
    '/api/platforms',
    requireAuth,
    requireRole(['Administrator', 'Platform Producer']),
    (req: AuthenticatedRequest, res) => {
      const parsed = platformSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid platform payload' });
        return;
      }
      const now = new Date().toISOString();
      const id = `plat-${Date.now().toString(36)}`;
      const slug = parsed.data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const created: Platform = {
        id,
        name: parsed.data.name,
        slug,
        description: parsed.data.description,
        owner: parsed.data.owner,
        ownerEmail: parsed.data.ownerEmail || `${slug}@enterprise-ipp.example`,
        category: parsed.data.category,
        domain: parsed.data.domain || parsed.data.category,
        lifecycleStatus: parsed.data.lifecycleStatus,
        capabilityIds: [],
        apiIds: [],
        documentIds: [],
        slaTarget: parsed.data.slaTarget,
        tier: parsed.data.tier,
        createdAt: now,
        updatedAt: now,
        isDemoRecord: true,
      };
      store.platforms.unshift(created);
      recordActivity(req.authUser?.name || created.owner, 'registered platform', created.name, 'Platform');
      recordAudit(req, 'PLATFORM_CREATED', created.id, 'Allowed');
      res.status(201).json({ platform: created });
    }
  );

  app.put(
    '/api/platforms/:id',
    requireAuth,
    requireRole(['Administrator', 'Platform Producer']),
    (req: AuthenticatedRequest, res) => {
      const idx = store.platforms.findIndex((p) => p.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: 'Platform not found.' });
        return;
      }
      const parsed = platformSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Validation failed' });
        return;
      }
      store.platforms[idx] = {
        ...store.platforms[idx],
        ...parsed.data,
        updatedAt: new Date().toISOString(),
      };
      recordActivity(req.authUser?.name || 'System', 'updated platform', store.platforms[idx].name, 'Platform');
      recordAudit(req, 'PLATFORM_UPDATED', req.params.id, 'Allowed');
      res.json({ platform: store.platforms[idx] });
    }
  );

  app.delete(
    '/api/platforms/:id',
    requireAuth,
    requireRole(['Administrator']),
    (req: AuthenticatedRequest, res) => {
      const idx = store.platforms.findIndex((p) => p.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: 'Platform not found.' });
        return;
      }
      const [removed] = store.platforms.splice(idx, 1);
      recordAudit(req, 'PLATFORM_DELETED', removed.id, 'Allowed');
      res.json({ deleted: true, id: removed.id });
    }
  );

  // ------------------------------------------------------------------
  // Capabilities CRUD
  // ------------------------------------------------------------------
  app.get('/api/capabilities', (_req, res) => {
    res.json({ items: store.capabilities, total: store.capabilities.length });
  });

  app.post(
    '/api/capabilities',
    requireAuth,
    requireRole(['Administrator', 'Platform Producer']),
    (req: AuthenticatedRequest, res) => {
      const parsed = capabilitySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid capability payload' });
        return;
      }
      const now = new Date().toISOString();
      const cap: Capability = {
        id: `cap-${Date.now().toString(36)}`,
        name: parsed.data.name,
        description: parsed.data.description,
        category: parsed.data.category,
        owner: parsed.data.owner,
        lifecycleStatus: parsed.data.lifecycleStatus,
        platformIds: parsed.data.platformIds,
        dependencyIds: parsed.data.dependencyIds,
        associatedServices: parsed.data.associatedServices,
        createdAt: now,
        updatedAt: now,
        isDemoRecord: true,
      };
      store.capabilities.unshift(cap);
      cap.platformIds.forEach((pid) => {
        const plat = store.platforms.find((p) => p.id === pid);
        if (plat && !plat.capabilityIds.includes(cap.id)) plat.capabilityIds.push(cap.id);
      });
      recordActivity(req.authUser?.name || cap.owner, 'defined capability', cap.name, 'Capability');
      recordAudit(req, 'CAPABILITY_CREATED', cap.id, 'Allowed');
      res.status(201).json({ capability: cap });
    }
  );

  app.put(
    '/api/capabilities/:id',
    requireAuth,
    requireRole(['Administrator', 'Platform Producer']),
    (req: AuthenticatedRequest, res) => {
      const idx = store.capabilities.findIndex((c) => c.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: 'Capability not found.' });
        return;
      }
      const parsed = capabilitySchema.partial().safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Validation error' });
        return;
      }
      store.capabilities[idx] = {
        ...store.capabilities[idx],
        ...parsed.data,
        updatedAt: new Date().toISOString(),
      };
      recordAudit(req, 'CAPABILITY_UPDATED', req.params.id, 'Allowed');
      res.json({ capability: store.capabilities[idx] });
    }
  );

  app.delete(
    '/api/capabilities/:id',
    requireAuth,
    requireRole(['Administrator', 'Platform Producer']),
    (req: AuthenticatedRequest, res) => {
      const idx = store.capabilities.findIndex((c) => c.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: 'Capability not found.' });
        return;
      }
      const [removed] = store.capabilities.splice(idx, 1);
      recordAudit(req, 'CAPABILITY_DELETED', removed.id, 'Allowed');
      res.json({ deleted: true });
    }
  );

  // ------------------------------------------------------------------
  // Documentation Hub CRUD
  // ------------------------------------------------------------------
  app.get('/api/documents', (_req, res) => {
    res.json({ items: store.documents, total: store.documents.length });
  });

  app.get('/api/documents/:id', (req, res) => {
    const doc = store.documents.find((d) => d.id === req.params.id);
    if (!doc) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }
    res.json({ document: doc });
  });

  app.post(
    '/api/documents',
    requireAuth,
    requireRole(['Administrator', 'Platform Producer', 'Developer']),
    (req: AuthenticatedRequest, res) => {
      const parsed = documentSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid document payload' });
        return;
      }
      const now = new Date().toISOString();
      const doc: DocumentEntry = {
        id: `doc-${Date.now().toString(36)}`,
        title: parsed.data.title,
        category: parsed.data.category,
        platformId: parsed.data.platformId,
        apiId: parsed.data.apiId,
        owner: parsed.data.owner,
        status: parsed.data.status,
        version: '1.0.0',
        content: parsed.data.content,
        versions: [
          {
            version: '1.0.0',
            updatedAt: now,
            updatedBy: req.authUser?.name || parsed.data.owner,
            summary: parsed.data.summary || 'Initial documentation draft',
            content: parsed.data.content,
          },
        ],
        createdAt: now,
        updatedAt: now,
        isDemoRecord: true,
      };
      store.documents.unshift(doc);
      const plat = store.platforms.find((p) => p.id === doc.platformId);
      if (plat && !plat.documentIds.includes(doc.id)) plat.documentIds.push(doc.id);
      recordActivity(req.authUser?.name || doc.owner, 'authored documentation', doc.title, 'Documentation');
      recordAudit(req, 'DOC_CREATED', doc.id, 'Allowed');
      res.status(201).json({ document: doc });
    }
  );

  app.put(
    '/api/documents/:id',
    requireAuth,
    requireRole(['Administrator', 'Platform Producer', 'Developer']),
    (req: AuthenticatedRequest, res) => {
      const idx = store.documents.findIndex((d) => d.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: 'Document not found.' });
        return;
      }
      const parsed = documentSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid update payload' });
        return;
      }
      const existing = store.documents[idx];
      const now = new Date().toISOString();
      const parts = existing.version.split('.').map(Number);
      const nextVersion = `${parts[0] || 1}.${(parts[1] || 0) + 1}.0`;

      const updated: DocumentEntry = {
        ...existing,
        ...parsed.data,
        version: nextVersion,
        updatedAt: now,
        versions: [
          {
            version: nextVersion,
            updatedAt: now,
            updatedBy: req.authUser?.name || existing.owner,
            summary: parsed.data.summary || 'Updated technical documentation',
            content: parsed.data.content ?? existing.content,
          },
          ...existing.versions,
        ],
      };
      store.documents[idx] = updated;
      recordActivity(req.authUser?.name || updated.owner, 'updated documentation', updated.title, 'Documentation');
      recordAudit(req, 'DOC_UPDATED', updated.id, 'Allowed');
      res.json({ document: updated });
    }
  );

  app.post(
    '/api/documents/:id/publish',
    requireAuth,
    requireRole(['Administrator', 'Platform Producer']),
    (req: AuthenticatedRequest, res) => {
      const doc = store.documents.find((d) => d.id === req.params.id);
      if (!doc) {
        res.status(404).json({ error: 'Document not found.' });
        return;
      }
      doc.status = 'Published';
      doc.updatedAt = new Date().toISOString();
      recordActivity(req.authUser?.name || doc.owner, 'published documentation', doc.title, 'Documentation');
      recordAudit(req, 'DOC_PUBLISHED', doc.id, 'Allowed');
      res.json({ document: doc });
    }
  );

  app.delete(
    '/api/documents/:id',
    requireAuth,
    requireRole(['Administrator', 'Platform Producer']),
    (req: AuthenticatedRequest, res) => {
      const idx = store.documents.findIndex((d) => d.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: 'Document not found.' });
        return;
      }
      const [removed] = store.documents.splice(idx, 1);
      recordAudit(req, 'DOC_DELETED', removed.id, 'Allowed');
      res.json({ deleted: true });
    }
  );

  // ------------------------------------------------------------------
  // Producer Workflows / Journeys
  // ------------------------------------------------------------------
  app.get('/api/producer/journeys', (_req, res) => {
    res.json({ items: store.journeys, total: store.journeys.length });
  });

  app.get('/api/producer/journeys/:id', (req, res) => {
    const journey = store.journeys.find((j) => j.id === req.params.id);
    if (!journey) {
      res.status(404).json({ error: 'Producer journey not found.' });
      return;
    }
    res.json({ journey });
  });

  app.post(
    '/api/producer/journeys',
    requireAuth,
    requireRole(['Administrator', 'Platform Producer']),
    (req: AuthenticatedRequest, res) => {
      const parsed = journeySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Validation failed' });
        return;
      }
      const now = new Date().toISOString();
      const journey: ProducerJourney = {
        id: `jrn-${Date.now().toString(36)}`,
        ...parsed.data,
        status: parsed.data.currentStep >= 2 ? 'In Progress' : 'Draft',
        durationSeconds: 180,
        createdAt: now,
        updatedAt: now,
        isDemoRecord: true,
      };
      store.journeys.unshift(journey);
      recordActivity(req.authUser?.name || journey.technicalOwner, 'saved producer draft for', journey.platformName, 'Workflow');
      recordAudit(req, 'PRODUCER_JOURNEY_SAVED', journey.id, 'Allowed');
      res.status(201).json({ journey });
    }
  );

  app.put(
    '/api/producer/journeys/:id',
    requireAuth,
    requireRole(['Administrator', 'Platform Producer']),
    (req: AuthenticatedRequest, res) => {
      const idx = store.journeys.findIndex((j) => j.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: 'Producer journey not found.' });
        return;
      }
      const parsed = journeySchema.partial().safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid update' });
        return;
      }
      store.journeys[idx] = {
        ...store.journeys[idx],
        ...parsed.data,
        updatedAt: new Date().toISOString(),
      };
      res.json({ journey: store.journeys[idx] });
    }
  );

  app.post(
    '/api/producer/journeys/:id/submit',
    requireAuth,
    requireRole(['Administrator', 'Platform Producer']),
    (req: AuthenticatedRequest, res) => {
      const journey = store.journeys.find((j) => j.id === req.params.id);
      if (!journey) {
        res.status(404).json({ error: 'Producer journey not found.' });
        return;
      }
      if (!journey.platformName || !journey.capabilityName || !journey.apiName || !journey.docTitle) {
        res.status(400).json({ error: 'All 4 configuration steps must be populated before submitting for review.' });
        return;
      }
      journey.status = 'Pending Review';
      journey.currentStep = 5;
      journey.updatedAt = new Date().toISOString();
      recordActivity(req.authUser?.name || journey.technicalOwner, 'submitted onboarding review for', journey.platformName, 'Workflow');
      recordAudit(req, 'PRODUCER_JOURNEY_SUBMITTED', journey.id, 'Allowed');
      res.json({ journey });
    }
  );

  app.post(
    '/api/producer/journeys/:id/approve',
    requireAuth,
    requireRole(['Administrator']),
    (req: AuthenticatedRequest, res) => {
      const journey = store.journeys.find((j) => j.id === req.params.id);
      if (!journey) {
        res.status(404).json({ error: 'Producer journey not found.' });
        return;
      }
      journey.status = 'Approved';
      journey.reviewNotes = (req.body as { notes?: string })?.notes || 'Approved by Platform Administrator.';
      journey.updatedAt = new Date().toISOString();
      recordActivity(req.authUser?.name || 'Admin', 'approved producer onboarding for', journey.platformName, 'Workflow');
      recordAudit(req, 'PRODUCER_JOURNEY_APPROVED', journey.id, 'Allowed');
      res.json({ journey });
    }
  );

  app.post(
    '/api/producer/journeys/:id/reject',
    requireAuth,
    requireRole(['Administrator']),
    (req: AuthenticatedRequest, res) => {
      const journey = store.journeys.find((j) => j.id === req.params.id);
      if (!journey) {
        res.status(404).json({ error: 'Producer journey not found.' });
        return;
      }
      journey.status = 'Rejected';
      journey.reviewNotes = (req.body as { notes?: string })?.notes || 'Returned for additional capability and documentation detail.';
      journey.updatedAt = new Date().toISOString();
      recordAudit(req, 'PRODUCER_JOURNEY_REJECTED', journey.id, 'Allowed');
      res.json({ journey });
    }
  );

  app.post(
    '/api/producer/journeys/:id/publish',
    requireAuth,
    requireRole(['Administrator', 'Platform Producer']),
    (req: AuthenticatedRequest, res) => {
      const journey = store.journeys.find((j) => j.id === req.params.id);
      if (!journey) {
        res.status(404).json({ error: 'Producer journey not found.' });
        return;
      }
      if (store.settings.requireAdminApprovalForPublish && journey.status !== 'Approved' && journey.status !== 'Published') {
        res.status(400).json({ error: 'Journey must be Approved before publishing to the Enterprise Catalog.' });
        return;
      }

      const now = new Date().toISOString();
      const slug = journey.platformName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Materialize Platform, Capability, API, and Document into live catalog if not already published
      let platform = store.platforms.find((p) => p.name.toLowerCase() === journey.platformName.toLowerCase());
      const capId = `cap-${Date.now().toString(36)}`;
      const apiId = `api-${Date.now().toString(36)}`;
      const docId = `doc-${Date.now().toString(36)}`;

      if (!platform) {
        platform = {
          id: `plat-${Date.now().toString(36)}`,
          name: journey.platformName,
          slug,
          description: journey.description,
          owner: journey.technicalOwner,
          ownerEmail: journey.contactEmail,
          category: journey.businessDomain,
          domain: journey.businessDomain,
          lifecycleStatus: 'Published',
          capabilityIds: [capId],
          apiIds: [apiId],
          documentIds: [docId],
          slaTarget: '99.95%',
          tier: 'Tier 2',
          createdAt: now,
          updatedAt: now,
          isDemoRecord: true,
        };
        store.platforms.unshift(platform);
      } else {
        platform.lifecycleStatus = 'Published';
        platform.updatedAt = now;
      }

      if (journey.capabilityName) {
        store.capabilities.unshift({
          id: capId,
          name: journey.capabilityName,
          description: journey.capabilityDescription || journey.description,
          category: journey.capabilityCategory || journey.businessDomain,
          owner: journey.technicalOwner,
          lifecycleStatus: 'Published',
          platformIds: [platform.id],
          dependencyIds: journey.capabilityDependencies,
          associatedServices: journey.associatedServices,
          createdAt: now,
          updatedAt: now,
          isDemoRecord: true,
        });
      }

      if (journey.apiName) {
        store.apis.unshift({
          id: apiId,
          name: journey.apiName,
          version: 'v1.0',
          description: journey.apiSpecification || `REST interface for ${journey.platformName}`,
          category: journey.businessDomain,
          platformId: platform.id,
          owner: journey.technicalOwner,
          baseUrl: journey.apiBaseUrl || `https://internal-gw.ipp.example/${slug}/v1`,
          sandboxPath: `/api/sandbox/generic/${slug}`,
          methods: journey.apiMethods.length ? journey.apiMethods : ['GET'],
          defaultMethod: journey.apiMethods[0] || 'GET',
          authType: journey.apiAuthType,
          rateLimit: '1,000 req/sec',
          sampleHeaders: { 'Content-Type': 'application/json' },
          sampleQuery: {},
          sampleBody: '{\n  "sample": true\n}',
          documentId: docId,
          lifecycleStatus: 'Published',
          updatedAt: now,
          isDemoRecord: true,
        });
      }

      if (journey.docTitle) {
        store.documents.unshift({
          id: docId,
          title: journey.docTitle,
          category: journey.businessDomain,
          platformId: platform.id,
          apiId,
          owner: journey.technicalOwner,
          status: 'Published',
          version: '1.0.0',
          content: `${journey.docContent}\n\n## Usage Instructions\n${journey.docUsageInstructions}\n\n## Examples\n\`\`\`bash\n${journey.docExamples}\n\`\`\``,
          versions: [],
          createdAt: now,
          updatedAt: now,
          isDemoRecord: true,
        });
      }

      journey.status = 'Published';
      journey.updatedAt = now;
      recordActivity(req.authUser?.name || journey.technicalOwner, 'published new platform', journey.platformName, 'Platform');
      recordAudit(req, 'PRODUCER_JOURNEY_PUBLISHED', journey.id, 'Allowed');
      res.json({ journey, platform });
    }
  );

  // ------------------------------------------------------------------
  // API Catalog & Explorer Proxy
  // ------------------------------------------------------------------
  app.get('/api/catalog/apis', (_req, res) => {
    res.json({ items: store.apis, total: store.apis.length });
  });

  app.get('/api/catalog/apis/:id', (req, res) => {
    const api = store.apis.find((a) => a.id === req.params.id);
    if (!api) {
      res.status(404).json({ error: 'API not found.' });
      return;
    }
    res.json({ api });
  });

  // Simulated internal banking sandbox routes
  app.all('/api/sandbox/*', (req, res) => {
    const subPath = req.path.replace(/^\/api\/sandbox\//, '');
    const start = Date.now();
    const requestId = `req_${Date.now().toString(36)}`;

    if (subPath.includes('payments/transfers/tx_')) {
      res.json({
        simulatedSandbox: true,
        transferId: 'tx_902184',
        rail: 'FEDNOW',
        status: 'SETTLED',
        amount: { value: '1450.00', currency: 'USD' },
        settledAt: new Date().toISOString(),
        traceId: requestId,
      });
      return;
    }

    if (subPath.includes('payments/transfers')) {
      res.status(req.method === 'POST' ? 201 : 200).json({
        simulatedSandbox: true,
        transferId: `tx_${Math.floor(100000 + Math.random() * 900000)}`,
        rail: (req.query.rail as string) || 'FEDNOW',
        status: req.method === 'POST' ? 'ACCEPTED_FOR_CLEARING' : 'LIST_OK',
        echoPayload: req.method === 'POST' ? req.body : undefined,
        processedInMs: Date.now() - start + 14,
        traceId: requestId,
      });
      return;
    }

    if (subPath.includes('cdp/parties')) {
      res.json({
        simulatedSandbox: true,
        partyId: 'pty_77410',
        kycTier: 'TIER_3_VERIFIED',
        segment: 'COMMERCIAL_MIDDLE_MARKET',
        primaryAddress: { city: 'Minneapolis', state: 'MN', country: 'US' },
        traceId: requestId,
      });
      return;
    }

    if (subPath.includes('accounts') && subPath.includes('balances')) {
      res.json({
        simulatedSandbox: true,
        accountId: 'acct_01J9X2K8M',
        currency: 'USD',
        availableBalance: '284910.45',
        currentBalance: '287410.45',
        memoHolds: [{ id: 'hold_11', amount: '2500.00', reason: 'ACH_PENDING_RELEASE' }],
        asOf: new Date().toISOString(),
      });
      return;
    }

    if (subPath.includes('risk/evaluate')) {
      res.json({
        simulatedSandbox: true,
        decision: 'ALLOW',
        riskScore: 0.08,
        reasonCodes: ['KNOWN_DEVICE', 'WITHIN_VELOCITY_BASELINE'],
        latencyMs: 11,
        traceId: requestId,
      });
      return;
    }

    res.json({
      simulatedSandbox: true,
      method: req.method,
      path: `/api/sandbox/${subPath}`,
      query: req.query,
      bodyReceived: req.body && Object.keys(req.body).length ? req.body : null,
      timestamp: new Date().toISOString(),
      note: 'Illustrative IPP internal sandbox response.',
    });
  });

  app.post('/api/explorer/proxy', async (req: AuthenticatedRequest, res) => {
    const { method, url, headers, query, body } = req.body as {
      method: HttpMethod;
      url: string;
      headers?: Record<string, string>;
      query?: Record<string, string>;
      body?: string;
    };

    const started = Date.now();
    try {
      const normalizedUrl = (url || '').trim();
      if (!normalizedUrl) {
        res.status(400).json({ error: 'Endpoint URL is required.' });
        return;
      }

      // If targeting internal *.ipp.example or /api/sandbox/*, route safely to internal sandbox handler
      const matchedApi = store.apis.find(
        (a) => normalizedUrl.startsWith(a.baseUrl) || normalizedUrl === a.sandboxPath
      );

      if (normalizedUrl.includes('ipp.example') || normalizedUrl.startsWith('/api/sandbox')) {
        const sandboxTarget = matchedApi
          ? matchedApi.sandboxPath
          : normalizedUrl.startsWith('/api/sandbox')
          ? normalizedUrl
          : `/api/sandbox/${normalizedUrl.replace(/^https?:\/\/[^/]+\//, '')}`;

        const qs = query && Object.keys(query).length ? `?${new URLSearchParams(query).toString()}` : '';
        const localUrl = `http://127.0.0.1:${PORT}${sandboxTarget}${qs}`;

        const upstream = await fetch(localUrl, {
          method: method || 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(headers || {}),
          },
          body: method !== 'GET' && body ? body : undefined,
        });
        const data = await upstream.json();
        const durationMs = Date.now() - started;
        recordAudit(req, 'API_EXPLORER_SANDBOX_CALL', `${method} ${normalizedUrl}`, 'Allowed');

        res.json({
          status: upstream.status,
          statusText: upstream.statusText,
          durationMs,
          mode: 'Simulated Internal Banking Sandbox',
          headers: Object.fromEntries(upstream.headers.entries()),
          body: data,
        });
        return;
      }

      // External HTTPS proxy with basic SSRF protection (block localhost/private metadata IPs)
      const parsedUrl = new URL(normalizedUrl);
      if (parsedUrl.protocol !== 'https:') {
        res.status(400).json({ error: 'External proxy requests must use HTTPS.' });
        return;
      }
      const host = parsedUrl.hostname.toLowerCase();
      if (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host.startsWith('10.') ||
        host.startsWith('169.254.') ||
        host.startsWith('192.168.')
      ) {
        res.status(403).json({ error: 'Blocked private or metadata network target.' });
        return;
      }

      if (query) {
        Object.entries(query).forEach(([k, v]) => {
          if (k) parsedUrl.searchParams.set(k, v);
        });
      }

      const upstream = await fetch(parsedUrl.toString(), {
        method: method || 'GET',
        headers: headers || {},
        body: method !== 'GET' && body ? body : undefined,
      });
      const text = await upstream.text();
      let parsedBody: unknown = text;
      try {
        parsedBody = JSON.parse(text);
      } catch {
        // leave as plain text
      }
      res.json({
        status: upstream.status,
        statusText: upstream.statusText,
        durationMs: Date.now() - started,
        mode: 'Live Backend Proxy',
        headers: Object.fromEntries(upstream.headers.entries()),
        body: parsedBody,
      });
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Proxy request failed.',
        durationMs: Date.now() - started,
      });
    }
  });

  // ------------------------------------------------------------------
  // AI Assistant (Server-Side Gemini Streaming + Transparent Demo Mode)
  // ------------------------------------------------------------------
  app.get('/api/ai/status', (_req, res) => {
    res.json({
      configured: isGeminiConfigured(),
      model: isGeminiConfigured() ? 'gemini-4-hydrogen' : 'demo-deterministic',
    });
  });

  app.post('/api/ai/chat', async (req, res) => {
    const { message, history } = req.body as {
      message?: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    };

    if (!message || !message.trim()) {
      res.status(400).json({ error: 'Message prompt is required.' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (!isGeminiConfigured()) {
      const demo = generateDemoAssistantResponse(
        message,
        store.platforms,
        store.apis,
        store.capabilities
      );
      res.write(`data: ${JSON.stringify({ type: 'meta', mode: 'demo', suggestedActions: demo.suggestedActions })}\n\n`);
      const chunks = demo.text.match(/.{1,32}(\s|$)/g) || [demo.text];
      for (const chunk of chunks) {
        res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
      return;
    }

    try {
      const ai = createGeminiClient();
      const systemInstruction = buildPortalContextSummary(
        store.platforms,
        store.apis,
        store.capabilities,
        store.documents
      );

      const historyText = (history || [])
        .slice(-6)
        .map((h) => `${h.role === 'user' ? 'Developer' : 'IPP Assistant'}: ${h.content}`)
        .join('\n\n');

      const fullPrompt = historyText ? `${historyText}\n\nDeveloper: ${message}` : message;

      res.write(`data: ${JSON.stringify({ type: 'meta', mode: 'live-gemini', model: 'gemini-4-hydrogen' })}\n\n`);

      const stream = await ai.models.generateContentStream({
        model: 'gemini-4-hydrogen',
        contents: fullPrompt,
        config: {
          systemInstruction,
        },
      });

      for await (const chunk of stream) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk.text })}\n\n`);
        }
      }
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Upstream Gemini API error';
      res.write(`data: ${JSON.stringify({ type: 'error', error: errMsg })}\n\n`);
      res.end();
    }
  });

  // ------------------------------------------------------------------
  // Agent Workflows (LangGraph + DeepAgents + A2A Simulation)
  // ------------------------------------------------------------------
  app.get('/api/ai/workflows', (_req, res) => {
    res.json({ items: store.workflows, total: store.workflows.length });
  });

  app.get('/api/ai/workflows/:id', (req, res) => {
    const wf = store.workflows.find((w) => w.id === req.params.id);
    if (!wf) {
      res.status(404).json({ error: 'Workflow execution not found.' });
      return;
    }
    res.json({ workflow: wf });
  });

  app.post('/api/ai/workflows/execute', (req: AuthenticatedRequest, res) => {
    const { name, intent, prompt, simulateError } = req.body as {
      name?: string;
      intent?: WorkflowExecution['intent'];
      prompt?: string;
      simulateError?: boolean;
    };

    const resolvedIntent: WorkflowExecution['intent'] = intent || 'platform_discovery';
    const { nodes, branch } = buildWorkflowNodes(resolvedIntent, Boolean(simulateError));
    const totalDurationMs = nodes.reduce((acc, n) => acc + n.durationMs, 0);
    const hasError = nodes.some((n) => n.status === 'error');
    const now = new Date().toISOString();

    const execution: WorkflowExecution = {
      id: `wf-run-${Date.now().toString(36)}`,
      name: name || `Workflow: ${resolvedIntent.replace('_', ' ')}`,
      intent: resolvedIntent,
      prompt: prompt || 'Execute enterprise platform governance workflow',
      status: hasError ? 'Failed' : 'Completed',
      startedAt: now,
      completedAt: now,
      totalDurationMs,
      selectedBranch: branch,
      nodes,
      logs: nodes
        .filter((n) => n.status !== 'skipped')
        .map((n) => ({
          timestamp: new Date().toISOString().slice(11, 23),
          level: n.status === 'error' ? 'ERROR' : 'INFO',
          node: n.label,
          message: n.outputSummary,
        })),
      isSimulated: true,
    };

    store.workflows.unshift(execution);
    recordAudit(req, 'AI_WORKFLOW_EXECUTED', `${execution.id} (${execution.status})`, 'Allowed');
    res.status(201).json({ workflow: execution });
  });

  app.post('/api/ai/workflows/:id/retry', (req: AuthenticatedRequest, res) => {
    const existing = store.workflows.find((w) => w.id === req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Workflow execution not found.' });
      return;
    }
    const { nodes, branch } = buildWorkflowNodes(existing.intent, false);
    existing.status = 'Completed';
    existing.selectedBranch = branch;
    existing.nodes = nodes;
    existing.totalDurationMs = nodes.reduce((acc, n) => acc + n.durationMs, 0);
    existing.completedAt = new Date().toISOString();
    existing.logs.push({
      timestamp: new Date().toISOString().slice(11, 23),
      level: 'INFO',
      node: 'Workflow Completion',
      message: 'Retry succeeded cleanly across all A2A agent nodes.',
    });
    recordAudit(req, 'AI_WORKFLOW_RETRIED', existing.id, 'Allowed');
    res.json({ workflow: existing });
  });

  // ------------------------------------------------------------------
  // Integrations & Health Checks
  // ------------------------------------------------------------------
  async function checkPostgresHealth(): Promise<{ connected: boolean; detail: string }> {
    const connString = process.env.DATABASE_URL;
    const hasPgEnv = Boolean(connString || process.env.PGHOST);
    if (!hasPgEnv) {
      return {
        connected: false,
        detail: 'Set DATABASE_URL (e.g. postgresql://postgres:postgres@localhost:5432/ipp_portal) to connect.',
      };
    }

    const pool = new Pool(
      connString
        ? { connectionString: connString, connectionTimeoutMillis: 2500 }
        : {
            host: process.env.PGHOST || 'localhost',
            port: Number(process.env.PGPORT || 5432),
            database: process.env.PGDATABASE || 'ipp_portal',
            user: process.env.PGUSER || 'postgres',
            password: process.env.PGPASSWORD || 'postgres',
            connectionTimeoutMillis: 2500,
          }
    );

    try {
      const result = await pool.query('SELECT version()');
      const versionStr = String(result.rows[0]?.version || 'PostgreSQL').split(',')[0];
      return {
        connected: true,
        detail: `Connected to ${versionStr} (pgAdmin 4 compatible).`,
      };
    } catch (err) {
      return {
        connected: false,
        detail: `Configured, but connection failed: ${err instanceof Error ? err.message : 'Unable to reach Postgres'}`,
      };
    } finally {
      await pool.end().catch(() => {});
    }
  }

  app.get('/api/integrations', async (_req, res) => {
    const pgConfigured = Boolean(process.env.DATABASE_URL || process.env.PGHOST);
    const pgStatus = pgConfigured ? await checkPostgresHealth() : null;

    const items = store.integrations.map((item) => {
      if (item.id === 'int-deepagents' && isGeminiConfigured()) {
        return {
          ...item,
          connectionState: 'Connected' as const,
          configurationStatus: 'Connected to server-side Gemini API (@google/genai).',
        };
      }
      if (item.id === 'int-fastapi' && process.env.FASTAPI_BACKEND_URL) {
        return { ...item, connectionState: 'Connected' as const };
      }
      if (item.id === 'int-redis' && process.env.REDIS_URL) {
        return { ...item, connectionState: 'Connected' as const };
      }
      if (item.id === 'int-postgres' && pgStatus) {
        return {
          ...item,
          connectionState: pgStatus.connected ? ('Connected' as const) : ('Not Configured' as const),
          configurationStatus: pgStatus.detail,
        };
      }
      return item;
    });
    res.json({ items });
  });

  app.post('/api/integrations/:id/check', async (req: AuthenticatedRequest, res) => {
    const item = store.integrations.find((i) => i.id === req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Integration not found.' });
      return;
    }
    item.lastCheckedAt = new Date().toISOString();

    if (item.id === 'int-postgres') {
      const pgStatus = await checkPostgresHealth();
      item.connectionState = pgStatus.connected ? 'Connected' : 'Not Configured';
      item.configurationStatus = pgStatus.detail;
    } else if (item.id === 'int-apigw' || item.id === 'int-a2ui') {
      item.connectionState = item.id === 'int-a2ui' ? 'Connected' : 'Demo Sandbox';
    } else if (item.id === 'int-deepagents' && isGeminiConfigured()) {
      item.connectionState = 'Connected';
      item.configurationStatus = 'Verified GEMINI_API_KEY configured on server.';
    } else if (item.envVarName && process.env[item.envVarName] && process.env[item.envVarName] !== 'MY_GEMINI_API_KEY') {
      item.connectionState = 'Connected';
    } else if (item.id !== 'int-langgraph' && item.id !== 'int-a2a') {
      item.connectionState = 'Not Configured';
    }

    recordAudit(req, 'INTEGRATION_HEALTH_CHECK', `${item.name} -> ${item.connectionState}`, 'Allowed');
    res.json({ integration: item });
  });

  // ------------------------------------------------------------------
  // Administration & RBAC
  // ------------------------------------------------------------------
  app.get('/api/admin/users', (_req, res) => {
    res.json({ items: store.users, roles: ROLE_DEFINITIONS });
  });

  app.put(
    '/api/admin/users/:id/role',
    requireAuth,
    (req: AuthenticatedRequest, res) => {
      if (req.authUser?.role !== 'Administrator') {
        recordAudit(req, 'ADMIN_ROLE_UPDATE_ATTEMPT', req.params.id, 'Denied');
        res.status(403).json({ error: 'Only Administrators can modify user roles.' });
        return;
      }
      const user = store.users.find((u) => u.id === req.params.id);
      if (!user) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }
      const { role } = req.body as { role?: UserRole };
      if (!role || !['Administrator', 'Platform Producer', 'Developer', 'Viewer'].includes(role)) {
        res.status(400).json({ error: 'Invalid role provided.' });
        return;
      }
      user.role = role;
      recordActivity(req.authUser.name, `assigned role ${role} to`, user.name, 'Security');
      recordAudit(req, 'ADMIN_ROLE_UPDATED', `${user.email} -> ${role}`, 'Allowed');
      res.json({ user });
    }
  );

  app.get('/api/admin/audit-logs', (_req, res) => {
    res.json({ items: store.auditLogs });
  });

  app.get('/api/admin/settings', (_req, res) => {
    res.json({ settings: store.settings });
  });

  app.put(
    '/api/admin/settings',
    requireAuth,
    requireRole(['Administrator']),
    (req: AuthenticatedRequest, res) => {
      store.settings = {
        ...store.settings,
        ...(req.body as Partial<SystemSettings>),
      };
      recordAudit(req, 'SYSTEM_SETTINGS_UPDATED', 'portal_settings', 'Allowed');
      res.json({ settings: store.settings });
    }
  );

  // ------------------------------------------------------------------
  // Vite Middleware (Dev) or Static Assets (Prod)
  // ------------------------------------------------------------------
  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found. Run npm run build.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`IPP Internal Platforms Portal server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start IPP server:', err);
  process.exit(1);
});
