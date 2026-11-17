import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Bot, Check, Copy, Send, User as UserIcon } from 'lucide-react';
import { ippApi } from '../../lib/api';
import type { NavSection } from '../../types/ipp';
import { MarkdownRenderer } from '../ui/Primitives';

interface AiAssistantViewProps {
  onNavigate: (section: NavSection) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: 'live-gemini' | 'demo';
  suggestedActions?: Array<{ label: string; section: string; description: string }>;
}

const SUGGESTED_PROMPTS = [
  'Help me register a new platform.',
  'Find APIs related to payment processing.',
  'Generate documentation for my platform.',
  'Explain the producer onboarding process.',
  'Help identify missing platform capabilities.',
];

export function AiAssistantView({ onNavigate }: AiAssistantViewProps) {
  const [aiStatus, setAiStatus] = useState<{ configured: boolean; model: string } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello! I am the **IPP Enterprise Developer Assistant**. Ask me about registered banking platforms, API endpoints, capability dependencies, Markdown documentation templates, or the 5-step producer onboarding journey.',
      suggestedActions: [
        { label: 'Explore Platform Catalog', section: 'platforms', description: 'Browse 8 sample platforms' },
        { label: 'Open Producer Workspace', section: 'producer', description: 'Register a new platform' },
      ],
    },
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ippApi.getAiStatus().then(setAiStatus).catch(() => {});
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || streaming) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };
    const assistantId = `a-${Date.now()}`;
    const assistantPlaceholder: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
    };

    const historySnapshot = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
    setInput('');
    setStreaming(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history: historySnapshot }),
      });

      if (!res.ok || !res.body) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error((errBody as { error?: string }).error || 'AI service request failed');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const evt of events) {
          if (!evt.startsWith('data: ')) continue;
          const payload = JSON.parse(evt.slice(6)) as {
            type: 'meta' | 'chunk' | 'done' | 'error';
            mode?: 'live-gemini' | 'demo';
            text?: string;
            error?: string;
            suggestedActions?: ChatMessage['suggestedActions'];
          };

          if (payload.type === 'meta') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, mode: payload.mode, suggestedActions: payload.suggestedActions }
                  : m
              )
            );
          } else if (payload.type === 'chunk' && payload.text) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + payload.text } : m
              )
            );
          } else if (payload.type === 'error') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content: `**AI Request Error:** ${payload.error || 'Upstream model error'}`,
                    }
                  : m
              )
            );
          }
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: `**Request failed:** ${err instanceof Error ? err.message : 'Unable to reach AI endpoint'}`,
              }
            : m
        )
      );
    } finally {
      setStreaming(false);
    }
  };

  const copyResponse = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#101B32] dark:text-slate-100">AI Assistant</h1>
          <p className="text-sm text-[#65748B] dark:text-slate-400">
            Intelligent developer guidance for platform discovery, producer onboarding, and documentation synthesis.
          </p>
        </div>

        <div className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#101B32] text-[#65748B] dark:text-slate-300 whitespace-nowrap shrink-0">
          {aiStatus?.configured
            ? `Live Server-Side AI (${aiStatus.model})`
            : 'Demo Mode · Predefined Enterprise Assistant'}
        </div>
      </div>

      {/* Suggested Prompts */}
      <div className="flex flex-wrap gap-2">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={streaming}
            onClick={() => sendMessage(prompt)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#101B32] text-[#101B32] dark:text-slate-200 hover:border-[#2457D6] dark:hover:border-[#438BFF] transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Viewport */}
      <div className="rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 flex flex-col h-[540px]">
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-[#2457D6]/10 text-[#2457D6] dark:text-[#438BFF] flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-3xl rounded-xl p-4 ${
                  msg.role === 'user'
                    ? 'bg-[#2457D6] text-white text-sm'
                    : 'bg-[#F7F9FC] dark:bg-[#0B1221] border border-slate-200/80 dark:border-slate-800 flex-1'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="leading-relaxed">{msg.content}</p>
                ) : (
                  <div className="space-y-3">
                    {msg.mode && (
                      <div className="flex items-center justify-between text-[11px] text-[#65748B] dark:text-slate-400">
                        <span>
                          {msg.mode === 'live-gemini'
                            ? 'Live Gemini Server Response'
                            : 'Demo Assistant Response (Predefined)'}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyResponse(msg.id, msg.content)}
                          className="inline-flex items-center gap-1 hover:text-[#101B32] dark:hover:text-slate-100"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3 h-3 text-[#16A477]" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    )}

                    {msg.content ? (
                      <MarkdownRenderer content={msg.content} />
                    ) : (
                      <p className="text-xs text-[#65748B]">Generating response...</p>
                    )}

                    {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 flex flex-wrap gap-2">
                        {msg.suggestedActions.map((act) => (
                          <button
                            key={act.label}
                            type="button"
                            onClick={() => onNavigate(act.section as NavSection)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-700 text-[#2457D6] dark:text-[#438BFF] hover:border-[#2457D6] transition-colors"
                          >
                            <span>{act.label}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 text-[#101B32] dark:text-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask IPP Assistant about APIs, onboarding steps, or capabilities..."
            aria-label="Prompt input"
            className="flex-1 px-4 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-[#2457D6] text-white hover:bg-[#1d48b8] disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>{streaming ? 'Streaming...' : 'Send'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
