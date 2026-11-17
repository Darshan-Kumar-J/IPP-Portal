import React, { useMemo, useState } from 'react';
import {
  Background,
  Controls,
  Edge,
  MarkerType,
  Node,
  ReactFlow,
} from '@xyflow/react';
import { Play, RotateCcw } from 'lucide-react';
import type { WorkflowExecution, WorkflowNodeExecution } from '../../types/ipp';
import { StatusText } from '../ui/Primitives';

interface AgentWorkflowsViewProps {
  workflows: WorkflowExecution[];
  onExecuteWorkflow: (payload: {
    name: string;
    intent: WorkflowExecution['intent'];
    prompt: string;
    simulateError?: boolean;
  }) => Promise<WorkflowExecution>;
  onRetryWorkflow: (id: string) => Promise<void>;
}

const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  'n-request': { x: 20, y: 140 },
  'n-validate': { x: 220, y: 140 },
  'n-intent': { x: 420, y: 140 },
  'n-router': { x: 630, y: 140 },
  'n-discover': { x: 850, y: 40 },
  'n-docgen': { x: 850, y: 240 },
  'n-capcheck': { x: 1090, y: 140 },
  'n-approval': { x: 1310, y: 140 },
  'n-complete': { x: 1520, y: 140 },
};

const BASE_EDGES: Array<[string, string]> = [
  ['n-request', 'n-validate'],
  ['n-validate', 'n-intent'],
  ['n-intent', 'n-router'],
  ['n-router', 'n-discover'],
  ['n-router', 'n-docgen'],
  ['n-discover', 'n-capcheck'],
  ['n-docgen', 'n-capcheck'],
  ['n-router', 'n-capcheck'],
  ['n-capcheck', 'n-approval'],
  ['n-approval', 'n-complete'],
];

export function AgentWorkflowsView({
  workflows,
  onExecuteWorkflow,
  onRetryWorkflow,
}: AgentWorkflowsViewProps) {
  const [selectedId, setSelectedId] = useState<string>(workflows[0]?.id || '');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('n-discover');
  const [workflowName, setWorkflowName] = useState('Enterprise API & Capability Audit');
  const [intent, setIntent] = useState<WorkflowExecution['intent']>('platform_discovery');
  const [prompt, setPrompt] = useState('Inspect Payment Processing Platform APIs and verify IAM dependencies');
  const [simulateError, setSimulateError] = useState(false);
  const [running, setRunning] = useState(false);

  const activeWorkflow = workflows.find((w) => w.id === selectedId) || workflows[0];
  const inspectedNode: WorkflowNodeExecution | undefined = activeWorkflow?.nodes.find(
    (n) => n.id === selectedNodeId
  );

  const { flowNodes, flowEdges } = useMemo(() => {
    if (!activeWorkflow) return { flowNodes: [], flowEdges: [] };

    const statusColor = (status: WorkflowNodeExecution['status']) => {
      if (status === 'completed') return '#16A477';
      if (status === 'error') return '#D94B4B';
      if (status === 'running') return '#438BFF';
      return '#94A3B8';
    };

    const nodes: Node[] = activeWorkflow.nodes.map((n) => ({
      id: n.id,
      position: NODE_POSITIONS[n.id] || { x: 0, y: 0 },
      data: {
        label: (
          <div className="text-left">
            <div className="text-[10px] font-mono text-[#65748B] flex items-center justify-between">
              <span>{n.agentType}</span>
              <span className="tabular-nums">{n.durationMs}ms</span>
            </div>
            <div className="text-xs font-semibold text-[#101B32] mt-0.5">{n.label}</div>
            <div
              className="text-[10px] font-medium mt-1 capitalize"
              style={{ color: statusColor(n.status) }}
            >
              {n.status}
            </div>
          </div>
        ),
      },
      style: {
        width: 175,
        borderRadius: 10,
        padding: 10,
        background: n.id === selectedNodeId ? '#EFF6FF' : '#FFFFFF',
        border: `2px solid ${statusColor(n.status)}`,
        opacity: n.status === 'skipped' ? 0.55 : 1,
      },
    }));

    const nodeMap = new Map(activeWorkflow.nodes.map((n) => [n.id, n]));
    const edges: Edge[] = BASE_EDGES.map(([source, target]) => {
      const sNode = nodeMap.get(source);
      const tNode = nodeMap.get(target);
      const activeBranch =
        sNode?.status === 'completed' &&
        (tNode?.status === 'completed' || tNode?.status === 'error');
      return {
        id: `${source}->${target}`,
        source,
        target,
        animated: activeBranch,
        style: {
          stroke: activeBranch ? '#2457D6' : '#CBD5E1',
          strokeWidth: activeBranch ? 2 : 1.25,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: activeBranch ? '#2457D6' : '#CBD5E1',
        },
      };
    });

    return { flowNodes: nodes, flowEdges: edges };
  }, [activeWorkflow, selectedNodeId]);

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setRunning(true);
    try {
      const created = await onExecuteWorkflow({
        name: workflowName,
        intent,
        prompt,
        simulateError,
      });
      setSelectedId(created.id);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#101B32] dark:text-slate-100">
          Agent Workflows (LangGraph & A2A Orchestration)
        </h1>
        <p className="text-sm text-[#65748B] dark:text-slate-400">
          Visualize stateful agent routing, DeepAgent synthesis, and A2A handoffs. Demo runs execute deterministic simulated graphs with retry recovery.
        </p>
      </div>

      {/* Create & Trigger Workflow Bar */}
      <form
        onSubmit={handleRun}
        className="p-4 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
      >
        <div className="md:col-span-3">
          <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1">
            Workflow Name
          </label>
          <input
            required
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
          />
        </div>
        <div className="md:col-span-3">
          <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1">
            Conditional Branch Intent
          </label>
          <select
            value={intent}
            onChange={(e) => setIntent(e.target.value as WorkflowExecution['intent'])}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
          >
            <option value="platform_discovery">Platform Discovery</option>
            <option value="doc_generation">Documentation Generation</option>
            <option value="capability_audit">Capability Validation Only</option>
            <option value="producer_onboarding">Full Producer Onboarding</option>
          </select>
        </div>
        <div className="md:col-span-4">
          <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1">
            Task Prompt
          </label>
          <input
            required
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
          />
        </div>
        <div className="md:col-span-2 flex items-center justify-end gap-2">
          <label className="flex items-center gap-1.5 text-xs text-[#65748B] cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={simulateError}
              onChange={(e) => setSimulateError(e.target.checked)}
            />
            <span>Test Error</span>
          </label>
          <button
            type="submit"
            disabled={running}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-[#2457D6] text-white hover:bg-[#1d48b8] disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            <Play className="w-4 h-4" />
            <span>Execute</span>
          </button>
        </div>
      </form>

      {/* Visual React Flow Graph */}
      {activeWorkflow && (
        <div className="p-4 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-sm font-semibold text-[#101B32] dark:text-slate-100">
                {activeWorkflow.name}
              </span>
              <span className="ml-3 text-xs text-[#65748B] dark:text-slate-400">
                Branch: {activeWorkflow.selectedBranch} · {activeWorkflow.totalDurationMs}ms (Simulated)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <StatusText status={activeWorkflow.status} />
              {activeWorkflow.status === 'Failed' && (
                <button
                  type="button"
                  onClick={() => onRetryWorkflow(activeWorkflow.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#2457D6] text-white hover:bg-[#1d48b8]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Workflow</span>
                </button>
              )}
            </div>
          </div>

          <div className="h-[360px] w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F7F9FC] dark:bg-[#0B1221] overflow-hidden">
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              onNodeClick={(_evt, node) => setSelectedNodeId(node.id)}
              fitView
            >
              <Background gap={18} size={1} color="rgba(148,163,184,0.22)" />
              <Controls />
            </ReactFlow>
          </div>
        </div>
      )}

      {/* Node Inspector + Logs + History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-5 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 space-y-3">
          <h2 className="text-sm font-semibold text-[#101B32] dark:text-slate-100">
            Node & A2A Inspector
          </h2>
          {inspectedNode ? (
            <div className="space-y-2 text-xs">
              <p className="font-medium text-[#101B32] dark:text-slate-100">
                {inspectedNode.label} ({inspectedNode.agentType})
              </p>
              <p className="text-[#65748B] dark:text-slate-400 leading-relaxed">
                {inspectedNode.outputSummary}
              </p>
              {inspectedNode.a2aPayload && (
                <pre className="p-3 rounded-lg bg-[#0E172A] text-slate-100 font-mono overflow-x-auto">
                  {JSON.stringify(inspectedNode.a2aPayload, null, 2)}
                </pre>
              )}
            </div>
          ) : (
            <p className="text-xs text-[#65748B]">Click any node in the graph to inspect its A2A payload.</p>
          )}
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 space-y-3">
          <h2 className="text-sm font-semibold text-[#101B32] dark:text-slate-100">
            Execution Logs
          </h2>
          <div className="space-y-2 max-h-56 overflow-y-auto font-mono text-[11px]">
            {activeWorkflow?.logs.map((log, i) => (
              <div key={i} className="p-2 rounded bg-[#F7F9FC] dark:bg-[#0B1221]">
                <span className="text-[#65748B]">{log.timestamp}</span>{' '}
                <span className={log.level === 'ERROR' ? 'text-[#D94B4B] font-semibold' : 'text-[#2457D6] dark:text-[#438BFF]'}>
                  [{log.level}]
                </span>{' '}
                <span className="font-semibold">{log.node}:</span>{' '}
                <span className="text-[#334155] dark:text-slate-300">{log.message}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 space-y-3">
          <h2 className="text-sm font-semibold text-[#101B32] dark:text-slate-100">
            Workflow History ({workflows.length})
          </h2>
          <div className="divide-y divide-slate-200/70 dark:divide-slate-800 max-h-56 overflow-y-auto">
            {workflows.map((wf) => (
              <button
                key={wf.id}
                type="button"
                onClick={() => setSelectedId(wf.id)}
                className={`w-full py-2.5 px-2 text-left rounded transition-colors ${
                  activeWorkflow?.id === wf.id
                    ? 'bg-[#2457D6]/10 dark:bg-[#438BFF]/10'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[#101B32] dark:text-slate-100 truncate">
                    {wf.name}
                  </span>
                  <StatusText status={wf.status} />
                </div>
                <p className="text-[11px] font-mono text-[#65748B] tabular-nums mt-0.5">
                  {wf.intent} · {wf.totalDurationMs}ms
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
