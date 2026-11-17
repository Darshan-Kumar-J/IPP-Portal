import React, { useEffect, useState } from 'react';
import { Clock, Play, Plus, Trash2 } from 'lucide-react';
import { ippApi } from '../../lib/api';
import type { ApiEndpoint, HttpMethod } from '../../types/ipp';

interface ApiExplorerViewProps {
  apis: ApiEndpoint[];
  selectedApi: ApiEndpoint | null;
}

interface KeyValueRow {
  key: string;
  value: string;
}

interface RequestHistoryItem {
  id: string;
  method: HttpMethod;
  url: string;
  status: number;
  durationMs: number;
  timestamp: string;
}

export function ApiExplorerView({ apis, selectedApi }: ApiExplorerViewProps) {
  const initialApi = selectedApi || apis[0];

  const [method, setMethod] = useState<HttpMethod>(initialApi?.defaultMethod || 'GET');
  const [url, setUrl] = useState<string>(initialApi?.baseUrl || '');
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body'>('body');
  const [queryRows, setQueryRows] = useState<KeyValueRow[]>([{ key: 'rail', value: 'FEDNOW' }]);
  const [headerRows, setHeaderRows] = useState<KeyValueRow[]>([
    { key: 'Content-Type', value: 'application/json' },
  ]);
  const [bodyText, setBodyText] = useState<string>(initialApi?.sampleBody || '');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [response, setResponse] = useState<{
    status: number;
    statusText: string;
    durationMs: number;
    mode: string;
    headers: Record<string, string>;
    body: unknown;
  } | null>(null);
  const [history, setHistory] = useState<RequestHistoryItem[]>([]);

  const loadApiPreset = (api: ApiEndpoint) => {
    setMethod(api.defaultMethod);
    setUrl(api.baseUrl);
    setHeaderRows(
      Object.entries(api.sampleHeaders).map(([key, value]) => ({ key, value }))
    );
    setQueryRows(
      Object.entries(api.sampleQuery).length
        ? Object.entries(api.sampleQuery).map(([key, value]) => ({ key, value }))
        : [{ key: '', value: '' }]
    );
    setBodyText(api.sampleBody || '');
    setActiveTab(api.defaultMethod === 'GET' ? 'params' : 'body');
    setErrorMsg(null);
  };

  useEffect(() => {
    if (selectedApi) {
      loadApiPreset(selectedApi);
    }
  }, [selectedApi]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setErrorMsg(null);
    try {
      const headers: Record<string, string> = {};
      headerRows.forEach((r) => {
        if (r.key.trim()) headers[r.key.trim()] = r.value;
      });
      const query: Record<string, string> = {};
      queryRows.forEach((r) => {
        if (r.key.trim()) query[r.key.trim()] = r.value;
      });

      const res = await ippApi.proxyApiRequest({
        method,
        url,
        headers,
        query,
        body: method !== 'GET' ? bodyText : undefined,
      });
      setResponse(res);
      setHistory((prev) => [
        {
          id: `hist-${Date.now()}`,
          method,
          url,
          status: res.status,
          durationMs: res.durationMs,
          timestamp: new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 14),
      ]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#101B32] dark:text-slate-100">API Explorer</h1>
          <p className="text-sm text-[#65748B] dark:text-slate-400">
            Test enterprise REST endpoints via the secure server-side proxy. Internal <code className="font-mono text-xs">*.ipp.example</code> routes return clearly labeled simulated sandbox responses.
          </p>
        </div>

        <select
          aria-label="Load API preset"
          onChange={(e) => {
            const found = apis.find((a) => a.id === e.target.value);
            if (found) loadApiPreset(found);
          }}
          value={apis.find((a) => a.baseUrl === url)?.id || ''}
          className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#101B32] text-[#101B32] dark:text-slate-100 max-w-xs"
        >
          <option value="" disabled>
            Load Sample API Preset...
          </option>
          {apis.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.defaultMethod})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 space-y-5">
          {/* Request Builder */}
          <form
            onSubmit={handleSend}
            className="p-5 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <div className="flex flex-col sm:flex-row gap-2.5">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as HttpMethod)}
                aria-label="HTTP Method"
                className="px-3.5 py-2.5 text-sm font-mono font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221] text-[#2457D6] dark:text-[#438BFF]"
              >
                {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as HttpMethod[]).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://internal-gw.ipp.example/payments/v2/transfers"
                aria-label="Request Endpoint URL"
                className="flex-1 px-3.5 py-2.5 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221] text-[#101B32] dark:text-slate-100"
              />

              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-[#2457D6] text-white hover:bg-[#1d48b8] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
              >
                <Play className="w-4 h-4" />
                <span>{sending ? 'Sending...' : 'Send Request'}</span>
              </button>
            </div>

            {/* Request Sub-tabs */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 w-fit">
              {(['params', 'headers', 'body'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                    activeTab === tab
                      ? 'bg-white dark:bg-[#101B32] text-[#101B32] dark:text-slate-100 shadow-sm'
                      : 'text-[#65748B]'
                  }`}
                >
                  {tab === 'params'
                    ? `Query Params (${queryRows.filter((r) => r.key).length})`
                    : tab === 'headers'
                    ? `Headers (${headerRows.filter((r) => r.key).length})`
                    : 'Request Body'}
                </button>
              ))}
            </div>

            {activeTab === 'params' && (
              <div className="space-y-2">
                {queryRows.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      value={row.key}
                      onChange={(e) => {
                        const copy = [...queryRows];
                        copy[idx].key = e.target.value;
                        setQueryRows(copy);
                      }}
                      placeholder="Parameter key"
                      className="flex-1 px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
                    />
                    <input
                      value={row.value}
                      onChange={(e) => {
                        const copy = [...queryRows];
                        copy[idx].value = e.target.value;
                        setQueryRows(copy);
                      }}
                      placeholder="Value"
                      className="flex-1 px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
                    />
                    <button
                      type="button"
                      onClick={() => setQueryRows(queryRows.filter((_, i) => i !== idx))}
                      className="p-1.5 text-[#65748B] hover:text-[#D94B4B]"
                      aria-label="Remove param"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setQueryRows([...queryRows, { key: '', value: '' }])}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#2457D6] dark:text-[#438BFF]"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Query Parameter
                </button>
              </div>
            )}

            {activeTab === 'headers' && (
              <div className="space-y-2">
                {headerRows.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      value={row.key}
                      onChange={(e) => {
                        const copy = [...headerRows];
                        copy[idx].key = e.target.value;
                        setHeaderRows(copy);
                      }}
                      placeholder="Header name"
                      className="flex-1 px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
                    />
                    <input
                      value={row.value}
                      onChange={(e) => {
                        const copy = [...headerRows];
                        copy[idx].value = e.target.value;
                        setHeaderRows(copy);
                      }}
                      placeholder="Header value"
                      className="flex-1 px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
                    />
                    <button
                      type="button"
                      onClick={() => setHeaderRows(headerRows.filter((_, i) => i !== idx))}
                      className="p-1.5 text-[#65748B] hover:text-[#D94B4B]"
                      aria-label="Remove header"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setHeaderRows([...headerRows, { key: '', value: '' }])}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#2457D6] dark:text-[#438BFF]"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Header
                </button>
              </div>
            )}

            {activeTab === 'body' && (
              <div>
                <textarea
                  rows={7}
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  disabled={method === 'GET'}
                  placeholder={method === 'GET' ? 'GET requests do not send a request body.' : '{ "key": "value" }'}
                  className="w-full p-3 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221] text-[#101B32] dark:text-slate-100 disabled:opacity-50"
                />
              </div>
            )}
          </form>

          {/* Response Viewer */}
          <div className="p-5 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-[#101B32] dark:text-slate-100">Response</h2>
              {response && (
                <div className="flex items-center gap-4 text-xs tabular-nums">
                  <span
                    className={`font-mono font-semibold ${
                      response.status >= 200 && response.status < 300
                        ? 'text-[#16A477]'
                        : 'text-[#D94B4B]'
                    }`}
                  >
                    HTTP {response.status} {response.statusText}
                  </span>
                  <span className="text-[#65748B] dark:text-slate-400 font-mono">
                    {response.durationMs} ms
                  </span>
                  <span className="text-[#2457D6] dark:text-[#438BFF] font-medium">
                    {response.mode}
                  </span>
                </div>
              )}
            </div>

            {errorMsg ? (
              <div className="mt-4 p-3.5 rounded-lg bg-[#D94B4B]/10 border border-[#D94B4B]/30 text-sm text-[#D94B4B]">
                {errorMsg}
              </div>
            ) : response ? (
              <div className="mt-4 space-y-4">
                <pre className="p-4 rounded-lg bg-[#0E172A] text-slate-100 text-xs font-mono overflow-x-auto max-h-96 leading-relaxed">
                  {typeof response.body === 'string'
                    ? response.body
                    : JSON.stringify(response.body, null, 2)}
                </pre>
                <details className="text-xs text-[#65748B] dark:text-slate-400">
                  <summary className="cursor-pointer font-medium hover:text-[#101B32] dark:hover:text-slate-200">
                    Response Headers ({Object.keys(response.headers).length})
                  </summary>
                  <pre className="mt-2 p-3 rounded-lg bg-[#F7F9FC] dark:bg-[#0B1221] font-mono overflow-x-auto">
                    {JSON.stringify(response.headers, null, 2)}
                  </pre>
                </details>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[#65748B] dark:text-slate-400">
                Select a preset or enter an endpoint URL and click <strong>Send Request</strong> to inspect headers, latency, and JSON output.
              </p>
            )}
          </div>
        </div>

        {/* History Sidebar */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 h-fit">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#101B32] dark:text-slate-100">Request History</h2>
            <Clock className="w-4 h-4 text-[#65748B]" />
          </div>
          {history.length === 0 ? (
            <p className="text-xs text-[#65748B] dark:text-slate-400">
              Executed requests from this session will appear here.
            </p>
          ) : (
            <div className="divide-y divide-slate-200/70 dark:divide-slate-800">
              {history.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setMethod(item.method);
                    setUrl(item.url);
                  }}
                  className="w-full py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded px-1 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-semibold text-[#2457D6] dark:text-[#438BFF]">{item.method}</span>
                    <span className="text-[#16A477] tabular-nums">
                      {item.status} · {item.durationMs}ms
                    </span>
                  </div>
                  <p className="text-xs font-mono text-[#65748B] dark:text-slate-400 truncate mt-0.5">
                    {item.url}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
