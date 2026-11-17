import React, { useMemo, useState } from 'react';
import {
  Background,
  Controls,
  Edge,
  MarkerType,
  Node,
  ReactFlow,
} from '@xyflow/react';
import {
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  Compass,
  Cpu,
  Database,
  FilePlus2,
  GitBranch,
  Layers,
  Network,
  Play,
  Plus,
  Server,
  ShieldCheck,
  Terminal,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ippApi } from '../../lib/api';
import type {
  ActivityEvent,
  ApiEndpoint,
  Capability,
  IntegrationItem,
  NavSection,
  Platform,
  ProducerJourney,
} from '../../types/ipp';
import { StatusText } from '../ui/Primitives';

interface OverviewViewProps {
  kpis: {
    registeredPlatforms: number;
    availableApis: number;
    publishedDocuments: number;
    totalDocuments: number;
    activeProducerWorkflows: number;
  };
  platforms: Platform[];
  apis: ApiEndpoint[];
  capabilities: Capability[];
  journeys: ProducerJourney[];
  activities: ActivityEvent[];
  integrations: IntegrationItem[];
  aiConfigured: boolean;
  onNavigate: (section: NavSection) => void;
  onSelectPlatform: (platformId: string) => void;
  onSelectApi: (api: ApiEndpoint) => void;
}

const STACK_PILLARS = [
  {
    id: 'gateway',
    label: 'FastAPI & Gateway',
    summary: 'Async REST microservices with Pydantic v2 schema validation, mTLS workload identity, and rate-limited edge routing.',
    target: 'integrations' as NavSection,
  },
  {
    id: 'data',
    label: 'PostgreSQL & Redis',
    summary: '17-table normalized PostgreSQL 16 schema (managed via pgAdmin 4) with UUID keys and RLS paired with Redis caching.',
    target: 'integrations' as NavSection,
  },
  {
    id: 'agents',
    label: 'LangGraph & DeepAgents',
    summary: 'Stateful multi-branch AI graphs coordinating Discovery, Documentation Synthesis, and Capability Validation agents.',
    target: 'workflows' as NavSection,
  },
  {
    id: 'a2a',
    label: 'A2A & A2UI',
    summary: 'Agent-to-Agent structured task handoffs paired with declarative A2UI action cards inside the developer chat.',
    target: 'assistant' as NavSection,
  },
  {
    id: 'docker',
    label: 'Docker Stack',
    summary: 'Reproducible multi-container orchestration across React portal, FastAPI service layer, Redis 7, and PostgreSQL 16.',
    target: 'integrations' as NavSection,
  },
];

interface TopologyMeta {
  id: string;
  title: string;
  layer: string;
  accent: string;
  description: string;
  platformId?: string;
  targetSection: NavSection;
  actionLabel: string;
  metrics: string;
}

const TOPOLOGY_DETAILS: Record<string, TopologyMeta> = {
  'topo-gw': {
    id: 'topo-gw',
    title: 'Enterprise API Gateway',
    layer: 'Edge & Security Layer',
    accent: '#2457D6',
    description: 'Terminates mTLS, validates FAPI 2.0 OAuth tokens, and distributes Redis sliding-window rate limits across all internal platforms.',
    targetSection: 'explorer',
    actionLabel: 'Open API Explorer',
    metrics: 'p99 edge overhead < 4ms · mTLS enforced',
  },
  'topo-iam': {
    id: 'topo-iam',
    title: 'Identity and Access Platform',
    layer: 'Edge & Security Layer',
    accent: '#0EA5E9',
    description: 'Centralized OAuth 2.1, OIDC, RFC 8693 token exchange, and SPIFFE/X.509 certificate authority.',
    platformId: 'plat-iam',
    targetSection: 'platforms',
    actionLabel: 'Inspect IAM Platform',
    metrics: '99.999% Tier 1 SLA · 2 APIs',
  },
  'topo-pay': {
    id: 'topo-pay',
    title: 'Payment Processing Platform',
    layer: 'Core Banking Domain',
    accent: '#2457D6',
    description: 'FedNow, RTP, ACH batch clearing, and ISO 20022 orchestration rail with mandatory idempotency guarantees.',
    platformId: 'plat-pay',
    targetSection: 'platforms',
    actionLabel: 'Inspect Payment Platform',
    metrics: '99.995% Tier 1 SLA · 3 APIs',
  },
  'topo-cdp': {
    id: 'topo-cdp',
    title: 'Customer Data Platform',
    layer: 'Core Banking Domain',
    accent: '#16A477',
    description: 'Canonical party graph, KYC verification tiers, and open-banking consent ledger.',
    platformId: 'plat-cdp',
    targetSection: 'platforms',
    actionLabel: 'Inspect Customer Platform',
    metrics: '99.99% Tier 1 SLA · 2 APIs',
  },
  'topo-acct': {
    id: 'topo-acct',
    title: 'Account Services Platform',
    layer: 'Core Banking Domain',
    accent: '#438BFF',
    description: 'Real-time checking, savings, and commercial DDA intraday balances and cursor-paginated transaction streams.',
    platformId: 'plat-acct',
    targetSection: 'platforms',
    actionLabel: 'Inspect Account Platform',
    metrics: '99.99% Tier 1 SLA · 2 APIs',
  },
  'topo-fraud': {
    id: 'topo-fraud',
    title: 'Fraud Risk Telemetry Platform',
    layer: 'Core Banking Domain',
    accent: '#E9A23B',
    description: 'Sub-25ms behavioral anomaly scoring and OFAC sanctions decisioning prior to payment settlement.',
    platformId: 'plat-fraud',
    targetSection: 'platforms',
    actionLabel: 'Inspect Fraud Platform',
    metrics: '99.99% Tier 1 SLA · < 25ms p99',
  },
  'topo-langgraph': {
    id: 'topo-langgraph',
    title: 'LangGraph & DeepAgents',
    layer: 'AI Orchestration Layer',
    accent: '#6366F1',
    description: 'Stateful agent supervisor coordinating conditional routing, A2A discovery handoffs, and Markdown documentation synthesis.',
    targetSection: 'workflows',
    actionLabel: 'Open Agent Workflows',
    metrics: 'A2A/1.0 + A2UI · Conditional Routing',
  },
  'topo-data': {
    id: 'topo-data',
    title: 'PostgreSQL (pgAdmin 4) & Redis',
    layer: 'Persistence & Cache Layer',
    accent: '#16A477',
    description: 'Normalized relational PostgreSQL 16 storage managed via pgAdmin 4, backed by Redis response caching (~30% reported workflow speedup).',
    targetSection: 'integrations',
    actionLabel: 'Inspect Integrations',
    metrics: '17 Tables · pgAdmin 4 + Redis TTL 300s',
  },
};

export function OverviewView({
  kpis,
  platforms,
  apis,
  capabilities,
  journeys,
  activities,
  integrations,
  aiConfigured,
  onNavigate,
  onSelectPlatform,
  onSelectApi,
}: OverviewViewProps) {
  const [activeStackId, setActiveStackId] = useState(STACK_PILLARS[0].id);
  const [selectedTopoId, setSelectedTopoId] = useState<string>('topo-pay');
  const [chartMode, setChartMode] = useState<'bar' | 'area'>('bar');

  // Prototype Sandbox state
  const [protoApiId, setProtoApiId] = useState<string>(apis[0]?.id || '');
  const [protoLoading, setProtoLoading] = useState(false);
  const [protoResult, setProtoResult] = useState<{
    status: number;
    durationMs: number;
    mode: string;
    body: unknown;
  } | null>(null);

  const activeStack = STACK_PILLARS.find((s) => s.id === activeStackId) || STACK_PILLARS[0];
  const selectedTopo = TOPOLOGY_DETAILS[selectedTopoId] || TOPOLOGY_DETAILS['topo-pay'];
  const protoApi = apis.find((a) => a.id === protoApiId) || apis[0];

  // Domain Chart Data
  const domainChartData = useMemo(() => {
    const map = new Map<
      string,
      { category: string; platforms: number; apis: number; capabilities: number }
    >();
    platforms.forEach((p) => {
      const shortCat = p.category.split(' ')[0];
      const existing = map.get(shortCat) || {
        category: shortCat,
        platforms: 0,
        apis: 0,
        capabilities: 0,
      };
      existing.platforms += 1;
      existing.apis += apis.filter((a) => a.platformId === p.id).length;
      existing.capabilities += capabilities.filter((c) => c.platformIds.includes(p.id)).length;
      map.set(shortCat, existing);
    });
    return Array.from(map.values());
  }, [platforms, apis, capabilities]);

  // Mini KPI Trend Data (illustrative progression)
  const kpiCards = [
    {
      title: 'Registered Platforms',
      value: kpis.registeredPlatforms,
      meta: `${platforms.filter((p) => p.lifecycleStatus === 'Published').length} published · ${platforms.filter((p) => p.lifecycleStatus !== 'Published').length} in pipeline`,
      icon: Layers,
      accent: '#2457D6',
      bgTint: 'bg-[#2457D6]/10 text-[#2457D6] dark:text-[#438BFF]',
      trend: [{ v: 3 }, { v: 4 }, { v: 5 }, { v: 6 }, { v: 7 }, { v: kpis.registeredPlatforms }],
      target: 'platforms' as NavSection,
    },
    {
      title: 'Available APIs',
      value: kpis.availableApis,
      meta: 'REST & FAPI 2.0 · Sandbox enabled',
      icon: Terminal,
      accent: '#0EA5E9',
      bgTint: 'bg-[#0EA5E9]/10 text-[#0284C7] dark:text-[#38BDF8]',
      trend: [{ v: 5 }, { v: 7 }, { v: 8 }, { v: 10 }, { v: 11 }, { v: kpis.availableApis }],
      target: 'apis' as NavSection,
    },
    {
      title: 'Published Documents',
      value: kpis.publishedDocuments,
      meta: `${kpis.totalDocuments} total specs including drafts`,
      icon: BookOpen,
      accent: '#16A477',
      bgTint: 'bg-[#16A477]/10 text-[#16A477]',
      trend: [{ v: 4 }, { v: 6 }, { v: 7 }, { v: 8 }, { v: 9 }, { v: kpis.publishedDocuments }],
      target: 'docs' as NavSection,
    },
    {
      title: 'Active Producer Workflows',
      value: kpis.activeProducerWorkflows,
      meta: `${journeys.length} onboarding journeys tracked`,
      icon: GitBranch,
      accent: '#E9A23B',
      bgTint: 'bg-[#E9A23B]/15 text-[#D97706] dark:text-[#FBBF24]',
      trend: [{ v: 2 }, { v: 3 }, { v: 5 }, { v: 4 }, { v: 4 }, { v: kpis.activeProducerWorkflows }],
      target: 'producer' as NavSection,
    },
  ];

  // Interactive Topology Graph Nodes & Edges
  const { topoNodes, topoEdges } = useMemo(() => {
    const nodeStyle = (id: string, borderHex: string) => ({
      width: 195,
      borderRadius: 10,
      padding: 10,
      background: selectedTopoId === id ? '#EFF6FF' : '#FFFFFF',
      border: selectedTopoId === id ? `2px solid ${borderHex}` : `1.5px solid ${borderHex}`,
      boxShadow: selectedTopoId === id ? '0 4px 14px rgba(36, 87, 214, 0.16)' : 'none',
      cursor: 'pointer',
    });

    const makeLabel = (kicker: string, title: string, color: string) => (
      <div className="text-left">
        <div className="text-[10px] font-medium truncate" style={{ color }}>
          {kicker}
        </div>
        <div className="text-xs font-semibold text-[#101B32] mt-0.5 leading-snug">{title}</div>
      </div>
    );

    const nodes: Node[] = [
      {
        id: 'topo-gw',
        position: { x: 20, y: 80 },
        data: { label: makeLabel('Edge Proxy · mTLS', 'Enterprise API Gateway', '#2457D6') },
        style: nodeStyle('topo-gw', '#2457D6'),
      },
      {
        id: 'topo-iam',
        position: { x: 20, y: 220 },
        data: { label: makeLabel('FAPI 2.0 · OIDC', 'Identity & Access (IAM)', '#0EA5E9') },
        style: nodeStyle('topo-iam', '#0EA5E9'),
      },
      {
        id: 'topo-pay',
        position: { x: 280, y: 20 },
        data: { label: makeLabel('FedNow · RTP · ACH', 'Payment Processing', '#2457D6') },
        style: nodeStyle('topo-pay', '#2457D6'),
      },
      {
        id: 'topo-cdp',
        position: { x: 280, y: 120 },
        data: { label: makeLabel('KYC · Consent Ledger', 'Customer Data Platform', '#16A477') },
        style: nodeStyle('topo-cdp', '#16A477'),
      },
      {
        id: 'topo-acct',
        position: { x: 280, y: 220 },
        data: { label: makeLabel('DDA · Memo Holds', 'Account Services', '#438BFF') },
        style: nodeStyle('topo-acct', '#438BFF'),
      },
      {
        id: 'topo-fraud',
        position: { x: 280, y: 320 },
        data: { label: makeLabel('Risk Score < 25ms', 'Fraud Risk Telemetry', '#E9A23B') },
        style: nodeStyle('topo-fraud', '#E9A23B'),
      },
      {
        id: 'topo-langgraph',
        position: { x: 550, y: 85 },
        data: { label: makeLabel('A2A · A2UI Agents', 'LangGraph & DeepAgents', '#6366F1') },
        style: nodeStyle('topo-langgraph', '#6366F1'),
      },
      {
        id: 'topo-data',
        position: { x: 550, y: 235 },
        data: { label: makeLabel('pgAdmin 4 · Redis TTL', 'PostgreSQL & Redis Cache', '#16A477') },
        style: nodeStyle('topo-data', '#16A477'),
      },
    ];

    const edgeDefs: Array<[string, string, string]> = [
      ['topo-gw', 'topo-pay', '#2457D6'],
      ['topo-gw', 'topo-cdp', '#16A477'],
      ['topo-gw', 'topo-acct', '#438BFF'],
      ['topo-iam', 'topo-gw', '#0EA5E9'],
      ['topo-iam', 'topo-pay', '#0EA5E9'],
      ['topo-iam', 'topo-fraud', '#E9A23B'],
      ['topo-pay', 'topo-langgraph', '#6366F1'],
      ['topo-cdp', 'topo-langgraph', '#6366F1'],
      ['topo-acct', 'topo-data', '#16A477'],
      ['topo-fraud', 'topo-data', '#16A477'],
      ['topo-langgraph', 'topo-data', '#6366F1'],
    ];

    const edges: Edge[] = edgeDefs.map(([source, target, color]) => ({
      id: `${source}->${target}`,
      source,
      target,
      animated: source === selectedTopoId || target === selectedTopoId,
      style: {
        stroke: source === selectedTopoId || target === selectedTopoId ? color : '#94A3B8',
        strokeWidth: source === selectedTopoId || target === selectedTopoId ? 2.25 : 1.25,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: source === selectedTopoId || target === selectedTopoId ? color : '#94A3B8',
      },
    }));

    return { topoNodes: nodes, topoEdges: edges };
  }, [selectedTopoId]);

  const runPrototype = async () => {
    if (!protoApi) return;
    setProtoLoading(true);
    try {
      const res = await ippApi.proxyApiRequest({
        method: protoApi.defaultMethod,
        url: protoApi.baseUrl,
        headers: protoApi.sampleHeaders,
        query: protoApi.sampleQuery,
        body: protoApi.defaultMethod !== 'GET' ? protoApi.sampleBody : undefined,
      });
      setProtoResult({
        status: res.status,
        durationMs: res.durationMs,
        mode: res.mode,
        body: res.body,
      });
    } catch (err) {
      setProtoResult({
        status: 502,
        durationMs: 0,
        mode: 'Error',
        body: { error: err instanceof Error ? err.message : 'Prototype call failed' },
      });
    } finally {
      setProtoLoading(false);
    }
  };

  const formatShortDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-6">
      {/* 1. Asymmetric Midnight Navy Hero Command Surface */}
      <section className="rounded-2xl overflow-hidden bg-[#101B32] text-white border border-slate-800 grid grid-cols-1 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-7 p-6 lg:p-8 flex flex-col justify-between space-y-6">
          <div>
            <p className="text-xs font-medium text-[#438BFF] tracking-wide">
              Internal Platforms Portal · Discover. Connect. Build. Accelerate.
            </p>
            <h1 className="mt-2 text-2xl lg:text-3xl font-semibold tracking-tight text-white">
              Welcome to IPP
            </h1>
            <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
              One intelligent workspace to discover internal banking platforms, prototype REST & FAPI 2.0 APIs, manage capabilities, and orchestrate LangGraph & DeepAgents documentation workflows.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('producer')}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-[#2457D6] hover:bg-[#3166eb] text-white transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Register a Platform</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('explorer')}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-white transition-colors whitespace-nowrap shrink-0"
              >
                <Terminal className="w-4 h-4 text-[#438BFF]" />
                <span>Launch API Explorer</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('assistant')}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition-colors whitespace-nowrap shrink-0"
              >
                <Bot className="w-4 h-4 text-[#16A477]" />
                <span>Ask AI Assistant</span>
              </button>
            </div>
          </div>

          {/* Interactive Tech Stack Blueprint Strip */}
          <div className="pt-5 border-t border-white/10 space-y-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {STACK_PILLARS.map((pillar) => (
                <button
                  key={pillar.id}
                  type="button"
                  onClick={() => setActiveStackId(pillar.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    activeStackId === pillar.id
                      ? 'bg-[#438BFF] text-white'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {pillar.label}
                </button>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-300">
              <p className="leading-relaxed">{activeStack.summary}</p>
              <button
                type="button"
                onClick={() => onNavigate(activeStack.target)}
                className="inline-flex items-center gap-1 text-[#438BFF] hover:text-white font-medium whitespace-nowrap shrink-0"
              >
                <span>Inspect</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Architectural Isometric Visual */}
        <div className="lg:col-span-5 relative min-h-[240px] bg-[#0B1221] border-t lg:border-t-0 lg:border-l border-white/10">
          <img
            src="/src/assets/images/ipp_architecture_visual_1794898004881.jpg"
            alt="IPP Enterprise Platform and AI Agent Topology"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#101B32] via-[#101B32]/25 to-transparent flex flex-col justify-end p-5">
            <p className="text-xs font-medium text-[#438BFF]">Illustrative Enterprise Sandbox</p>
            <p className="text-xs text-slate-200 mt-0.5">
              {integrations.filter((i) => i.connectionState !== 'Not Configured').length} sandbox & AI modules active · {aiConfigured ? 'Gemini Live' : 'AI Demo Mode'}
            </p>
          </div>
        </div>
      </section>

      {/* 2. High-Contrast KPI Bento Strip with Micro-Charts */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <button
              key={kpi.title}
              type="button"
              onClick={() => onNavigate(kpi.target)}
              className="text-left p-5 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 hover:border-[#2457D6]/50 dark:hover:border-[#438BFF]/50 transition-colors flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-medium text-[#65748B] dark:text-slate-400">
                    {kpi.title}
                  </span>
                  <p className="mt-1.5 text-3xl font-semibold tabular-nums text-[#101B32] dark:text-slate-100">
                    {kpi.value}
                  </p>
                </div>
                <div className={`p-2.5 rounded-lg shrink-0 ${kpi.bgTint}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-4 flex items-end justify-between gap-3">
                <p className="text-xs text-[#65748B] dark:text-slate-400 leading-snug">
                  {kpi.meta}
                </p>
                <div className="w-20 h-9 shrink-0" aria-hidden="true">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={kpi.trend}>
                      <Bar dataKey="v" fill={kpi.accent} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </button>
          );
        })}
      </section>

      {/* 3. Interactive Enterprise Topology & Node Inspector */}
      <section className="rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#101B32] dark:text-slate-100 flex items-center gap-2">
              <Network className="w-4 h-4 text-[#2457D6] dark:text-[#438BFF]" />
              <span>Interactive Platform & AI Ecosystem Topology</span>
            </h2>
            <p className="text-xs text-[#65748B] dark:text-slate-400 mt-0.5">
              Click any node to inspect edge security, banking domain services, LangGraph/A2A agents, and persistence layers.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('capabilities')}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-[#101B32] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              Capability Graph
            </button>
            <button
              type="button"
              onClick={() => onNavigate('workflows')}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#2457D6] text-white hover:bg-[#1d48b8] whitespace-nowrap shrink-0"
            >
              Run Agent Workflow
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-8 h-[390px] bg-[#F7F9FC] dark:bg-[#0B1221]">
            <ReactFlow
              nodes={topoNodes}
              edges={topoEdges}
              onNodeClick={(_e, node) => setSelectedTopoId(node.id)}
              fitView
            >
              <Background gap={20} size={1} color="rgba(100,116,139,0.22)" />
              <Controls />
            </ReactFlow>
          </div>

          <div className="lg:col-span-4 p-5 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[#2457D6] dark:text-[#438BFF]">
                  {selectedTopo.layer}
                </span>
                <span className="font-mono text-[#65748B] dark:text-slate-400">
                  {selectedTopo.id}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-[#101B32] dark:text-slate-100">
                {selectedTopo.title}
              </h3>
              <p className="text-sm text-[#65748B] dark:text-slate-400 leading-relaxed">
                {selectedTopo.description}
              </p>

              <div className="p-3 rounded-lg bg-[#F7F9FC] dark:bg-[#0B1221] border border-slate-200/80 dark:border-slate-800 text-xs font-mono text-[#101B32] dark:text-slate-200">
                {selectedTopo.metrics}
              </div>

              {selectedTopo.platformId && (
                <div className="space-y-1.5 pt-2">
                  <p className="text-xs font-medium text-[#65748B] dark:text-slate-400">
                    Associated APIs
                  </p>
                  {apis
                    .filter((a) => a.platformId === selectedTopo.platformId)
                    .map((api) => (
                      <button
                        key={api.id}
                        type="button"
                        onClick={() => onSelectApi(api)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200/80 dark:border-slate-800 hover:border-[#2457D6] text-xs text-left transition-colors"
                      >
                        <span className="font-medium text-[#101B32] dark:text-slate-100 truncate">
                          {api.name}
                        </span>
                        <span className="font-mono text-[#2457D6] dark:text-[#438BFF] ml-2 shrink-0">
                          {api.defaultMethod}
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                if (selectedTopo.platformId) {
                  onSelectPlatform(selectedTopo.platformId);
                } else {
                  onNavigate(selectedTopo.targetSection);
                }
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium rounded-lg bg-[#101B32] dark:bg-[#2457D6] text-white hover:opacity-95 transition-opacity"
            >
              <span>{selectedTopo.actionLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 4. Domain Coverage Analytics + Live API Prototyping Workbench */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Multi-Series Domain Coverage Chart */}
        <div className="lg:col-span-7 p-5 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-semibold text-[#101B32] dark:text-slate-100">
                Platform, API & Capability Coverage
              </h2>
              <p className="text-xs text-[#65748B] dark:text-slate-400">
                Distribution across enterprise banking domains (illustrative catalog)
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800/80">
              <button
                type="button"
                onClick={() => setChartMode('bar')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  chartMode === 'bar'
                    ? 'bg-white dark:bg-[#101B32] text-[#101B32] dark:text-slate-100 shadow-sm'
                    : 'text-[#65748B]'
                }`}
              >
                Bar View
              </button>
              <button
                type="button"
                onClick={() => setChartMode('area')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  chartMode === 'area'
                    ? 'bg-white dark:bg-[#101B32] text-[#101B32] dark:text-slate-100 shadow-sm'
                    : 'text-[#65748B]'
                }`}
              >
                Area Trend
              </button>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'bar' ? (
                <BarChart data={domainChartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
                  <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#65748B' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#65748B' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#101B32',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#F7F9FC',
                    }}
                  />
                  <Bar dataKey="platforms" name="Platforms" fill="#2457D6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="apis" name="APIs" fill="#438BFF" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="capabilities" name="Capabilities" fill="#16A477" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <AreaChart data={domainChartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradApis" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#438BFF" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#438BFF" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradCaps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16A477" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#16A477" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
                  <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#65748B' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#65748B' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#101B32',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#F7F9FC',
                    }}
                  />
                  <Area type="monotone" dataKey="apis" name="APIs" stroke="#438BFF" fill="url(#gradApis)" strokeWidth={2} />
                  <Area type="monotone" dataKey="capabilities" name="Capabilities" stroke="#16A477" fill="url(#gradCaps)" strokeWidth={2} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Quick API Prototyping Workbench */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#101B32] dark:text-slate-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#E9A23B]" />
                <span>Quick API Prototyping Sandbox</span>
              </h2>
              <button
                type="button"
                onClick={() => protoApi && onSelectApi(protoApi)}
                className="text-xs font-medium text-[#2457D6] dark:text-[#438BFF] hover:underline whitespace-nowrap"
              >
                Full Explorer
              </button>
            </div>
            <p className="text-xs text-[#65748B] dark:text-slate-400">
              Select a banking API and test the simulated backend proxy directly from your dashboard.
            </p>

            <div className="flex gap-2">
              <select
                value={protoApiId}
                onChange={(e) => {
                  setProtoApiId(e.target.value);
                  setProtoResult(null);
                }}
                aria-label="Select API to prototype"
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221] text-[#101B32] dark:text-slate-100"
              >
                {apis.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.defaultMethod} · {a.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={runPrototype}
                disabled={protoLoading || !protoApi}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-[#2457D6] text-white hover:bg-[#1d48b8] disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{protoLoading ? 'Running...' : 'Run'}</span>
              </button>
            </div>

            {protoApi && (
              <div className="p-2.5 rounded-lg bg-[#F7F9FC] dark:bg-[#0B1221] border border-slate-200/80 dark:border-slate-800 font-mono text-[11px] text-[#334155] dark:text-slate-300 truncate">
                <span className="font-semibold text-[#2457D6] dark:text-[#438BFF] mr-1.5">
                  {protoApi.defaultMethod}
                </span>
                {protoApi.baseUrl}
              </div>
            )}

            <div className="rounded-lg bg-[#0E172A] text-slate-100 p-3.5 font-mono text-[11px] h-44 overflow-auto border border-slate-800">
              {protoResult ? (
                <>
                  <div className="flex items-center justify-between text-[10px] pb-2 mb-2 border-b border-slate-800 text-slate-400">
                    <span className="text-[#16A477] font-semibold">
                      HTTP {protoResult.status} · {protoResult.durationMs}ms
                    </span>
                    <span>{protoResult.mode}</span>
                  </div>
                  <pre className="leading-relaxed">
                    {JSON.stringify(protoResult.body, null, 2)}
                  </pre>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 px-4">
                  <Cpu className="w-5 h-5 mb-2 text-[#438BFF]" />
                  <p>Click Run to invoke the sandbox proxy and inspect response headers, latency, and JSON payload.</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-800">
            {[
              { label: 'Onboard', icon: FilePlus2, target: 'producer' as NavSection },
              { label: 'APIs', icon: Compass, target: 'apis' as NavSection },
              { label: 'AI Chat', icon: Bot, target: 'assistant' as NavSection },
            ].map((q) => {
              const Icon = q.icon;
              return (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => onNavigate(q.target)}
                  className="inline-flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/70 text-[#101B32] dark:text-slate-200"
                >
                  <Icon className="w-3.5 h-3.5 text-[#2457D6] dark:text-[#438BFF]" />
                  <span>{q.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. Platform Activity & Producer Journeys */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#101B32] dark:text-slate-100">
              Platform Activity
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('platforms')}
              className="text-xs font-medium text-[#2457D6] dark:text-[#438BFF] hover:underline"
            >
              View Catalog
            </button>
          </div>
          <div className="divide-y divide-slate-200/70 dark:divide-slate-800">
            {platforms.slice(0, 5).map((plat) => (
              <div
                key={plat.id}
                className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onSelectPlatform(plat.id)}
                    className="text-sm font-medium text-[#101B32] dark:text-slate-100 hover:text-[#2457D6] dark:hover:text-[#438BFF] truncate block text-left"
                  >
                    {plat.name}
                  </button>
                  <p className="text-xs text-[#65748B] dark:text-slate-400 mt-0.5 truncate tabular-nums">
                    {plat.tier} · SLA {plat.slaTarget} · {plat.owner} · {formatShortDate(plat.updatedAt)}
                  </p>
                </div>
                <StatusText status={plat.lifecycleStatus} />
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#101B32] dark:text-slate-100">
              Recent Producer Workflows
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('producer')}
              className="text-xs font-medium text-[#2457D6] dark:text-[#438BFF] hover:underline"
            >
              Producer Workspace
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-[#65748B] dark:text-slate-400">
                  <th className="py-2 pr-3 font-medium">Platform</th>
                  <th className="py-2 px-3 font-medium">Step</th>
                  <th className="py-2 px-3 font-medium">Status</th>
                  <th className="py-2 pl-3 font-medium text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800 text-sm">
                {journeys.slice(0, 5).map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 pr-3">
                      <p className="font-medium text-[#101B32] dark:text-slate-100 truncate max-w-[180px]">
                        {j.platformName}
                      </p>
                      <p className="text-xs text-[#65748B] dark:text-slate-400">{j.technicalOwner}</p>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs tabular-nums text-[#65748B] dark:text-slate-400 whitespace-nowrap">
                      {j.currentStep}/5
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusText status={j.status} />
                    </td>
                    <td className="py-2.5 pl-3 text-right font-mono text-xs tabular-nums text-[#65748B] dark:text-slate-400 whitespace-nowrap">
                      {formatDuration(j.durationSeconds)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 6. Service Health + Chronological Feed + Reported Project Context */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-5 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#101B32] dark:text-slate-100">
              Platform Health
            </h2>
            <Server className="w-4 h-4 text-[#65748B]" />
          </div>
          {[
            { name: 'API Gateway Sandbox', state: 'Operational', note: 'Proxy active at /api/explorer/proxy' },
            { name: 'JWT Auth & RBAC', state: 'Operational', note: 'HTTP-only cookie enforcement' },
            { name: 'AI Assistant Service', state: aiConfigured ? 'Connected' : 'Demo Mode', note: aiConfigured ? 'Live Gemini streaming' : 'Deterministic demo assistant' },
            { name: 'Database Blueprint', state: 'Ready', note: '17-table PostgreSQL RLS migration' },
          ].map((svc) => (
            <div
              key={svc.name}
              className="pb-2.5 border-b border-slate-200/70 dark:border-slate-800 last:border-0 last:pb-0 flex items-start justify-between gap-2"
            >
              <div>
                <p className="text-xs font-medium text-[#101B32] dark:text-slate-100">{svc.name}</p>
                <p className="text-[11px] text-[#65748B] dark:text-slate-400">{svc.note}</p>
              </div>
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap shrink-0 ${
                  svc.state === 'Demo Mode' ? 'text-[#E9A23B]' : 'text-[#16A477]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{svc.state}</span>
              </span>
            </div>
          ))}
        </div>

        <div className="lg:col-span-2 p-5 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-[#101B32] dark:text-slate-100">
                Recent Activity Feed
              </h2>
              <span className="text-xs text-[#65748B] dark:text-slate-400">
                Illustrative demonstration events
              </span>
            </div>
            <div className="divide-y divide-slate-200/70 dark:divide-slate-800">
              {activities.slice(0, 5).map((act) => (
                <div key={act.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium text-[#101B32] dark:text-slate-100">{act.actor}</span>{' '}
                    <span className="text-[#65748B] dark:text-slate-400">{act.action}</span>{' '}
                    <span className="font-medium text-[#2457D6] dark:text-[#438BFF]">{act.target}</span>
                  </div>
                  <span className="text-xs text-[#65748B] dark:text-slate-400 whitespace-nowrap shrink-0 tabular-nums">
                    {act.targetType} · {formatShortDate(act.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#F7F9FC] dark:bg-[#0B1221] border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#2457D6] dark:text-[#438BFF] mt-0.5 shrink-0" />
              <p className="text-xs text-[#65748B] dark:text-slate-400 leading-relaxed">
                <strong className="text-[#101B32] dark:text-slate-100">Reference Project Benchmark:</strong>{' '}
                Approximately 30% improvement in documentation-generation and AI workflow throughput reported through parallel processing, multithreading, and Redis caching.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('integrations')}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#2457D6] dark:text-[#438BFF] hover:underline whitespace-nowrap shrink-0"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Architecture</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
