import React, { useState } from 'react';
import { RefreshCw, Server, SlidersHorizontal } from 'lucide-react';
import type { IntegrationItem } from '../../types/ipp';
import { Modal, StatusText } from '../ui/Primitives';

interface IntegrationsViewProps {
  integrations: IntegrationItem[];
  onCheckHealth: (id: string) => Promise<void>;
}

export function IntegrationsView({ integrations, onCheckHealth }: IntegrationsViewProps) {
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<IntegrationItem | null>(null);

  const handleCheck = async (id: string) => {
    setCheckingId(id);
    try {
      await onCheckHealth(id);
    } finally {
      setCheckingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#101B32] dark:text-slate-100">
          Integrations & Platform Architecture
        </h1>
        <p className="text-sm text-[#65748B] dark:text-slate-400">
          Inspect backend microservices, database, Redis caching, AI orchestration protocols, and honest runtime connection states.
        </p>
      </div>

      {/* Architecture Visual Showcase */}
      <div className="rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-5 relative min-h-[220px] bg-[#101B32] flex items-center justify-center">
          <img
            src="/src/assets/images/ipp_architecture_visual_1794898004881.jpg"
            alt="IPP Enterprise Platform and AI Agent Architecture Visualization"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="lg:col-span-7 p-6 flex flex-col justify-center space-y-3">
          <p className="text-xs font-medium text-[#2457D6] dark:text-[#438BFF]">
            Reference Enterprise Microservice Topology
          </p>
          <h2 className="text-lg font-semibold text-[#101B32] dark:text-slate-100">
            Modular Gateway, FastAPI, PostgreSQL, Redis & Multi-Agent AI
          </h2>
          <p className="text-sm text-[#65748B] dark:text-slate-400 leading-relaxed">
            IPP separates concerns across an authenticated developer portal, REST microservice layer, normalized PostgreSQL schema with Row Level Security, Redis response caching, and LangGraph / DeepAgents / A2A workflow orchestration. In the original project benchmark, combining parallel processing, multithreading, and Redis caching yielded approximately 30% improvement in documentation-generation and AI workflow execution speed.
          </p>
          <div className="pt-2 flex flex-wrap gap-4 text-xs font-mono text-[#65748B] dark:text-slate-400">
            <span>/backend-fastapi</span>
            <span>·</span>
            <span>/database/migrations</span>
            <span>·</span>
            <span>docker-compose.yml</span>
          </div>
        </div>
      </div>

      {/* Integration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {integrations.map((item) => (
          <div
            key={item.id}
            className="p-5 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 text-xs text-[#65748B] dark:text-slate-400">
                <span>{item.category}</span>
                <StatusText status={item.connectionState} />
              </div>
              <h3 className="mt-2 text-base font-semibold text-[#101B32] dark:text-slate-100">
                {item.name}
              </h3>
              <p className="mt-1.5 text-sm text-[#65748B] dark:text-slate-400 leading-relaxed">
                {item.description}
              </p>
              <p className="mt-3 text-xs text-[#334155] dark:text-slate-300 bg-[#F7F9FC] dark:bg-[#0B1221] p-2.5 rounded-lg border border-slate-200/70 dark:border-slate-800">
                {item.configurationStatus}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
              <span className="text-[#65748B] dark:text-slate-400 tabular-nums">
                Checked {new Date(item.lastCheckedAt).toLocaleTimeString()}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedConfig(item)}
                  className="inline-flex items-center gap-1 text-[#65748B] hover:text-[#101B32] dark:hover:text-slate-100"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Setup</span>
                </button>
                <button
                  type="button"
                  disabled={checkingId === item.id}
                  onClick={() => handleCheck(item.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-medium text-[#2457D6] dark:text-[#438BFF] hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingId === item.id ? 'animate-spin' : ''}`} />
                  <span>Check</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={Boolean(selectedConfig)}
        title={selectedConfig ? `${selectedConfig.name} Setup` : 'Integration Setup'}
        onClose={() => setSelectedConfig(null)}
      >
        {selectedConfig && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[#65748B]">Current State</span>
              <StatusText status={selectedConfig.connectionState} />
            </div>
            <p className="text-[#334155] dark:text-slate-300 leading-relaxed">
              {selectedConfig.configurationStatus}
            </p>
            <div className="p-3.5 rounded-lg bg-[#0E172A] text-slate-100 font-mono text-xs space-y-1">
              <p className="text-slate-400">Environment Configuration Reference</p>
              <p>
                <Server className="w-3.5 h-3.5 inline mr-1.5 text-[#438BFF]" />
                {selectedConfig.envVarName} ({selectedConfig.endpointHint})
              </p>
            </div>
            <p className="text-xs text-[#65748B] dark:text-slate-400">
              Secrets and connection strings are configured exclusively on the server via environment variables or the AI Studio Secrets panel.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
