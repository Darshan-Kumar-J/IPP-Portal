import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileEdit,
  Info,
  ShieldAlert,
  X,
  XCircle,
} from 'lucide-react';

export function IppLogo({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="IPP Geometric Nodes Logo"
    >
      <rect width="36" height="36" rx="8" fill="#101B32" />
      <path
        d="M11 12L25 12M11 12L18 25M25 12L18 25"
        stroke="#438BFF"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="11" cy="12" r="3.25" fill="#2457D6" stroke="#F7F9FC" strokeWidth="1.25" />
      <circle cx="25" cy="12" r="3.25" fill="#438BFF" stroke="#F7F9FC" strokeWidth="1.25" />
      <circle cx="18" cy="25" r="3.25" fill="#16A477" stroke="#F7F9FC" strokeWidth="1.25" />
    </svg>
  );
}

export function StatusText({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === 'published' || s === 'approved' || s === 'completed' || s === 'connected' || s === 'allowed' || s === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#16A477] whitespace-nowrap shrink-0">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>{status}</span>
      </span>
    );
  }
  if (s === 'in review' || s === 'pending review' || s === 'in progress' || s === 'running' || s === 'demo sandbox') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#E9A23B] whitespace-nowrap shrink-0">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        <span>{status}</span>
      </span>
    );
  }
  if (s === 'rejected' || s === 'failed' || s === 'denied' || s === 'error' || s === 'suspended') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#D94B4B] whitespace-nowrap shrink-0">
        <XCircle className="w-3.5 h-3.5 shrink-0" />
        <span>{status}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#65748B] dark:text-slate-400 whitespace-nowrap shrink-0">
      <FileEdit className="w-3.5 h-3.5 shrink-0" />
      <span>{status}</span>
    </span>
  );
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}) {
  if (!toasts.length) return null;
  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-700/80 shadow-lg"
        >
          {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[#16A477] mt-0.5 shrink-0" />}
          {t.type === 'error' && <ShieldAlert className="w-4 h-4 text-[#D94B4B] mt-0.5 shrink-0" />}
          {t.type === 'info' && <Info className="w-4 h-4 text-[#2457D6] dark:text-[#438BFF] mt-0.5 shrink-0" />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#101B32] dark:text-slate-100">{t.title}</p>
            {t.message && (
              <p className="text-xs text-[#65748B] dark:text-slate-400 mt-0.5 leading-relaxed">{t.message}</p>
            )}
          </div>
          <button
            onClick={() => onDismiss(t.id)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#101B32]/50 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-md rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-700/80 p-6 shadow-xl"
      >
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-lg shrink-0 ${
              destructive
                ? 'bg-[#D94B4B]/10 text-[#D94B4B]'
                : 'bg-[#2457D6]/10 text-[#2457D6] dark:text-[#438BFF]'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 id="confirm-dialog-title" className="text-base font-semibold text-[#101B32] dark:text-slate-100">
              {title}
            </h3>
            <p className="mt-1.5 text-sm text-[#65748B] dark:text-slate-400 leading-relaxed">{description}</p>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-[#101B32] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors whitespace-nowrap shrink-0"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors whitespace-nowrap shrink-0 ${
              destructive
                ? 'bg-[#D94B4B] hover:bg-[#c13e3e]'
                : 'bg-[#2457D6] hover:bg-[#1d48b8]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  maxWidth = 'max-w-2xl',
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#101B32]/50 backdrop-blur-[2px] overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full ${maxWidth} rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-700/80 shadow-xl my-8`}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-[#101B32] dark:text-slate-100">{title}</h3>
            {subtitle && <p className="text-xs text-[#65748B] dark:text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#65748B] hover:text-[#101B32] dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-white/60 dark:bg-[#101B32]/40">
      <p className="text-sm font-semibold text-[#101B32] dark:text-slate-100">{title}</p>
      <p className="text-sm text-[#65748B] dark:text-slate-400 mt-1 max-w-md">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 px-4 py-2 text-sm font-medium rounded-lg bg-[#2457D6] text-white hover:bg-[#1d48b8] transition-colors whitespace-nowrap shrink-0"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading content">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="h-12 rounded-lg bg-slate-200/70 dark:bg-slate-800/70 animate-pulse"
        />
      ))}
    </div>
  );
}

export function CodeBlock({ code, language = 'text' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700/80 bg-[#0E172A] text-slate-100">
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-800 bg-[#101B32] text-xs text-slate-400">
        <span className="font-mono lowercase">{language}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-[#16A477]" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs font-mono leading-relaxed text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[12px] text-[#2457D6] dark:text-[#438BFF]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-[#101B32] dark:text-slate-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCode = false;
  let codeLang = 'text';
  let codeBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('```')) {
      if (!inCode) {
        inCode = true;
        codeLang = line.trim().slice(3).trim() || 'text';
        codeBuffer = [];
      } else {
        inCode = false;
        elements.push(<CodeBlock key={`code-${i}`} language={codeLang} code={codeBuffer.join('\n')} />);
      }
      continue;
    }

    if (inCode) {
      codeBuffer.push(line);
      continue;
    }

    if (line.startsWith('# ')) {
      const text = line.slice(2).trim();
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      elements.push(
        <h1 key={i} id={id} className="text-xl font-semibold text-[#101B32] dark:text-slate-100 mt-2 mb-3">
          {text}
        </h1>
      );
    } else if (line.startsWith('## ')) {
      const text = line.slice(3).trim();
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      elements.push(
        <h2
          key={i}
          id={id}
          className="text-base font-semibold text-[#101B32] dark:text-slate-100 mt-5 mb-2 pt-3 border-t border-slate-200/80 dark:border-slate-800"
        >
          {text}
        </h2>
      );
    } else if (line.startsWith('### ') || line.startsWith('#### ')) {
      const text = line.replace(/^#{3,4}\s+/, '').trim();
      elements.push(
        <h3 key={i} className="text-sm font-semibold text-[#101B32] dark:text-slate-100 mt-4 mb-1.5">
          {text}
        </h3>
      );
    } else if (line.trim().startsWith('- ') || /^\d+\.\s/.test(line.trim())) {
      const text = line.trim().replace(/^(-\s+|\d+\.\s+)/, '');
      elements.push(
        <div key={i} className="flex items-start gap-2.5 text-sm text-[#334155] dark:text-slate-300 leading-relaxed my-1 pl-1">
          <span className="text-[#65748B] select-none mt-0.5">•</span>
          <span>{renderInlineMarkdown(text)}</span>
        </div>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(
        <p key={i} className="text-sm text-[#334155] dark:text-slate-300 leading-relaxed my-1.5">
          {renderInlineMarkdown(line)}
        </p>
      );
    }
  }

  if (inCode && codeBuffer.length) {
    elements.push(<CodeBlock key="code-tail" language={codeLang} code={codeBuffer.join('\n')} />);
  }

  return <div className="space-y-0.5">{elements}</div>;
}
