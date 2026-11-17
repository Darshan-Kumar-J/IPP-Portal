import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  Plus,
  Rocket,
  Save,
  Send,
  XCircle,
} from 'lucide-react';
import { z } from 'zod';
import type { ApiEndpoint, Capability, HttpMethod, ProducerJourney, UserRole } from '../../types/ipp';
import { MarkdownRenderer, StatusText } from '../ui/Primitives';

interface ProducerWorkspaceViewProps {
  journeys: ProducerJourney[];
  capabilities: Capability[];
  userRole: UserRole;
  userName: string;
  onSaveDraft: (payload: Partial<ProducerJourney>, existingId?: string) => Promise<ProducerJourney>;
  onSubmitJourney: (id: string) => Promise<void>;
  onApproveJourney: (id: string) => Promise<void>;
  onRejectJourney: (id: string) => Promise<void>;
  onPublishJourney: (id: string) => Promise<void>;
}

const STORAGE_KEY = 'ipp_producer_wizard_draft_v1';

const step1Schema = z.object({
  platformName: z.string().min(3, 'Platform name must be at least 3 characters'),
  description: z.string().min(12, 'Please provide a clear platform description (min 12 chars)'),
  businessDomain: z.string().min(2, 'Business domain is required'),
  technicalOwner: z.string().min(2, 'Technical owner is required'),
  contactEmail: z.string().email('Enter a valid contact email address'),
});

const step2Schema = z.object({
  capabilityName: z.string().min(3, 'Capability name is required'),
  capabilityDescription: z.string().min(10, 'Capability description must be at least 10 characters'),
  capabilityCategory: z.string().min(2, 'Capability category is required'),
});

const step3Schema = z.object({
  apiName: z.string().min(3, 'API name is required'),
  apiBaseUrl: z.string().url('Enter a valid HTTPS base URL (e.g., https://internal-gw.ipp.example/...)'),
  apiMethods: z.array(z.string()).min(1, 'Select at least one HTTP method'),
});

const step4Schema = z.object({
  docTitle: z.string().min(3, 'Documentation title is required'),
  docContent: z.string().min(15, 'Documentation Markdown content is required'),
});

const EMPTY_FORM = {
  platformName: '',
  description: '',
  businessDomain: 'Commercial Banking',
  technicalOwner: '',
  contactEmail: '',
  capabilityName: '',
  capabilityDescription: '',
  capabilityCategory: 'Core Banking',
  capabilityDependencies: [] as string[],
  associatedServicesText: 'core-domain-svc',
  apiName: '',
  apiBaseUrl: 'https://internal-gw.ipp.example/service/v1/resource',
  apiMethods: ['GET', 'POST'] as HttpMethod[],
  apiAuthType: 'OAuth 2.0 + mTLS' as ApiEndpoint['authType'],
  apiSpecification: 'OpenAPI 3.1 REST Specification',
  docTitle: '',
  docContent: '# Platform Integration Guide\n\n## Overview\nDescribe authentication, rate limits, and consumer integration patterns.',
  docUsageInstructions: 'Authenticate via FAPI 2.0 token exchange before calling endpoints.',
  docExamples: 'curl -X GET https://internal-gw.ipp.example/service/v1/resource',
};

export function ProducerWorkspaceView({
  journeys,
  capabilities,
  userRole,
  userName,
  onSaveDraft,
  onSubmitJourney,
  onApproveJourney,
  onRejectJourney,
  onPublishJourney,
}: ProducerWorkspaceViewProps) {
  const [step, setStep] = useState(1);
  const [activeJourneyId, setActiveJourneyId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY_FORM>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...EMPTY_FORM, ...JSON.parse(saved) };
    } catch {
      // ignore storage failure
    }
    return { ...EMPTY_FORM, technicalOwner: userName };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [docPreview, setDocPreview] = useState(false);
  const [busy, setBusy] = useState(false);

  const canProduce = userRole === 'Administrator' || userRole === 'Platform Producer';
  const isAdmin = userRole === 'Administrator';

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {
      // ignore storage errors
    }
  }, [form]);

  const activeJourney = journeys.find((j) => j.id === activeJourneyId) || null;

  const loadJourneyIntoForm = (j: ProducerJourney) => {
    setActiveJourneyId(j.id);
    setStep(j.currentStep || 1);
    setErrors({});
    setForm({
      platformName: j.platformName,
      description: j.description,
      businessDomain: j.businessDomain,
      technicalOwner: j.technicalOwner,
      contactEmail: j.contactEmail,
      capabilityName: j.capabilityName,
      capabilityDescription: j.capabilityDescription,
      capabilityCategory: j.capabilityCategory,
      capabilityDependencies: j.capabilityDependencies,
      associatedServicesText: j.associatedServices.join(', '),
      apiName: j.apiName,
      apiBaseUrl: j.apiBaseUrl,
      apiMethods: j.apiMethods,
      apiAuthType: j.apiAuthType,
      apiSpecification: j.apiSpecification,
      docTitle: j.docTitle,
      docContent: j.docContent,
      docUsageInstructions: j.docUsageInstructions,
      docExamples: j.docExamples,
    });
  };

  const startNewJourney = () => {
    setActiveJourneyId(null);
    setStep(1);
    setErrors({});
    setForm({ ...EMPTY_FORM, technicalOwner: userName });
  };

  const validateStep = (targetStep: number): boolean => {
    const schema =
      targetStep === 1
        ? step1Schema
        : targetStep === 2
        ? step2Schema
        : targetStep === 3
        ? step3Schema
        : targetStep === 4
        ? step4Schema
        : null;

    if (!schema) {
      setErrors({});
      return true;
    }

    const result = schema.safeParse(form);
    if (!result.success) {
      const nextErrs: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const key = String(issue.path[0] || 'form');
        nextErrs[key] = issue.message;
      });
      setErrors(nextErrs);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((s) => Math.min(5, s + 1));
    }
  };

  const buildPayload = (): Partial<ProducerJourney> => ({
    platformName: form.platformName,
    description: form.description,
    businessDomain: form.businessDomain,
    technicalOwner: form.technicalOwner,
    contactEmail: form.contactEmail,
    capabilityName: form.capabilityName,
    capabilityDescription: form.capabilityDescription,
    capabilityCategory: form.capabilityCategory,
    capabilityDependencies: form.capabilityDependencies,
    associatedServices: form.associatedServicesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    apiName: form.apiName,
    apiBaseUrl: form.apiBaseUrl,
    apiMethods: form.apiMethods,
    apiAuthType: form.apiAuthType,
    apiSpecification: form.apiSpecification,
    docTitle: form.docTitle,
    docContent: form.docContent,
    docUsageInstructions: form.docUsageInstructions,
    docExamples: form.docExamples,
    currentStep: step,
  });

  const handleSaveDraft = async () => {
    if (!validateStep(1)) {
      setStep(1);
      return;
    }
    setBusy(true);
    try {
      const saved = await onSaveDraft(buildPayload(), activeJourneyId || undefined);
      setActiveJourneyId(saved.id);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitForReview = async () => {
    for (let s = 1; s <= 4; s++) {
      if (!validateStep(s)) {
        setStep(s);
        return;
      }
    }
    setBusy(true);
    try {
      const saved = await onSaveDraft({ ...buildPayload(), currentStep: 5 }, activeJourneyId || undefined);
      setActiveJourneyId(saved.id);
      await onSubmitJourney(saved.id);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setBusy(false);
    }
  };

  const toggleMethod = (m: HttpMethod) => {
    setForm((prev) => ({
      ...prev,
      apiMethods: prev.apiMethods.includes(m)
        ? prev.apiMethods.filter((x) => x !== m)
        : [...prev.apiMethods, m],
    }));
  };

  const toggleDep = (capId: string) => {
    setForm((prev) => ({
      ...prev,
      capabilityDependencies: prev.capabilityDependencies.includes(capId)
        ? prev.capabilityDependencies.filter((x) => x !== capId)
        : [...prev.capabilityDependencies, capId],
    }));
  };

  const steps = [
    { num: 1, label: 'Platform Info' },
    { num: 2, label: 'Capabilities' },
    { num: 3, label: 'API Config' },
    { num: 4, label: 'Documentation' },
    { num: 5, label: 'Review & Publish' },
  ];

  const completionChecklist = [
    { label: 'Platform Information', valid: step1Schema.safeParse(form).success },
    { label: 'Capability Configuration', valid: step2Schema.safeParse(form).success },
    { label: 'API Configuration', valid: step3Schema.safeParse(form).success },
    { label: 'Documentation', valid: step4Schema.safeParse(form).success },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#101B32] dark:text-slate-100">
            Producer Workspace
          </h1>
          <p className="text-sm text-[#65748B] dark:text-slate-400">
            Guided 5-step onboarding journey to register platforms, map capabilities, attach APIs, and publish approved documentation.
          </p>
        </div>
        <button
          type="button"
          onClick={startNewJourney}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#101B32] text-[#101B32] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Producer Journey</span>
        </button>
      </div>

      {!canProduce && (
        <div className="p-3.5 rounded-lg bg-[#E9A23B]/10 border border-[#E9A23B]/30 text-xs text-[#101B32] dark:text-slate-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#E9A23B] shrink-0" />
          <span>
            You are signed in as <strong>{userRole}</strong>. Drafts can be edited locally, while submitting or publishing requires Platform Producer or Administrator role (switch roles in User Profile menu).
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Main 5-Step Journey Builder */}
        <div className="xl:col-span-3 space-y-5">
          {/* Stepper Bar */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {steps.map((s) => (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => setStep(s.num)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    step === s.num
                      ? 'bg-[#2457D6] text-white'
                      : step > s.num
                      ? 'bg-[#16A477]/10 text-[#16A477]'
                      : 'text-[#65748B] dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="font-mono tabular-nums">0{s.num}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Active Journey Form Card */}
          <div className="p-6 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 space-y-5">
            {activeJourney && (
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800 text-xs">
                <span className="text-[#65748B] dark:text-slate-400">
                  Editing Journey <code className="font-mono">{activeJourney.id}</code>
                </span>
                <StatusText status={activeJourney.status} />
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-[#101B32] dark:text-slate-100">
                  Step 1: Platform Information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1">
                      Platform Name *
                    </label>
                    <input
                      value={form.platformName}
                      onChange={(e) => setForm({ ...form, platformName: e.target.value })}
                      placeholder="e.g., Commercial Treasury FX Platform"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
                    />
                    {errors.platformName && <p className="text-xs text-[#D94B4B] mt-1">{errors.platformName}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1">
                      Description *
                    </label>
                    <textarea
                      rows={3}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Summarize business capabilities, SLA tier, and consumer guidelines..."
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
                    />
                    {errors.description && <p className="text-xs text-[#D94B4B] mt-1">{errors.description}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1">
                      Business Domain *
                    </label>
                    <input
                      value={form.businessDomain}
                      onChange={(e) => setForm({ ...form, businessDomain: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
                    />
                    {errors.businessDomain && <p className="text-xs text-[#D94B4B] mt-1">{errors.businessDomain}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1">
                      Technical Owner *
                    </label>
                    <input
                      value={form.technicalOwner}
                      onChange={(e) => setForm({ ...form, technicalOwner: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
                    />
                    {errors.technicalOwner && <p className="text-xs text-[#D94B4B] mt-1">{errors.technicalOwner}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1">
                      Owner Contact Email *
                    </label>
                    <input
                      type="email"
                      value={form.contactEmail}
                      onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                      placeholder="platform-team@enterprise-ipp.example"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
                    />
                    {errors.contactEmail && <p className="text-xs text-[#D94B4B] mt-1">{errors.contactEmail}</p>}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-[#101B32] dark:text-slate-100">
                  Step 2: Capability Configuration
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1">
                      Capability Name *
                    </label>
                    <input
                      value={form.capabilityName}
                      onChange={(e) => setForm({ ...form, capabilityName: e.target.value })}
                      placeholder="e.g., Real-Time FX Quote Execution"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
                    />
                    {errors.capabilityName && <p className="text-xs text-[#D94B4B] mt-1">{errors.capabilityName}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1">
                      Capability Category *
                    </label>
                    <input
                      value={form.capabilityCategory}
                      onChange={(e) => setForm({ ...form, capabilityCategory: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1">
                      Capability Description *
                    </label>
                    <textarea
                      rows={3}
                      value={form.capabilityDescription}
                      onChange={(e) => setForm({ ...form, capabilityDescription: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
                    />
                    {errors.capabilityDescription && (
                      <p className="text-xs text-[#D94B4B] mt-1">{errors.capabilityDescription}</p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1.5">
                      Upstream Capability Dependencies
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]">
                      {capabilities.map((cap) => (
                        <label key={cap.id} className="flex items-center gap-2 text-xs cursor-pointer p-1">
                          <input
                            type="checkbox"
                            checked={form.capabilityDependencies.includes(cap.id)}
                            onChange={() => toggleDep(cap.id)}
                          />
                          <span className="truncate">{cap.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1">
                      Associated Microservices (comma-separated)
                    </label>
                    <input
                      value={form.associatedServicesText}
                      onChange={(e) => setForm({ ...form, associatedServicesText: e.target.value })}
                      className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-[#101B32] dark:text-slate-100">
                  Step 3: API Configuration
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1">
                      API Name *
                    </label>
                    <input
                      value={form.apiName}
                      onChange={(e) => setForm({ ...form, apiName: e.target.value })}
                      placeholder="e.g., FX Quote & Lock API"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
                    />
                    {errors.apiName && <p className="text-xs text-[#D94B4B] mt-1">{errors.apiName}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1">
                      Authentication Type
                    </label>
                    <select
                      value={form.apiAuthType}
                      onChange={(e) =>
                        setForm({ ...form, apiAuthType: e.target.value as ApiEndpoint['authType'] })
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
                    >
                      <option value="OAuth 2.0 + mTLS">OAuth 2.0 + mTLS</option>
                      <option value="JWT Bearer">JWT Bearer</option>
                      <option value="Internal Service Token">Internal Service Token</option>
                      <option value="API Key + HMAC">API Key + HMAC</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1">
                      Base URL *
                    </label>
                    <input
                      value={form.apiBaseUrl}
                      onChange={(e) => setForm({ ...form, apiBaseUrl: e.target.value })}
                      className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
                    />
                    {errors.apiBaseUrl && <p className="text-xs text-[#D94B4B] mt-1">{errors.apiBaseUrl}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1.5">
                      Supported HTTP Methods *
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as HttpMethod[]).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => toggleMethod(m)}
                          className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg border transition-colors ${
                            form.apiMethods.includes(m)
                              ? 'bg-[#2457D6] border-[#2457D6] text-white'
                              : 'border-slate-200 dark:border-slate-700 text-[#65748B]'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1">
                      API Specification Notes / OpenAPI Ref
                    </label>
                    <textarea
                      rows={3}
                      value={form.apiSpecification}
                      onChange={(e) => setForm({ ...form, apiSpecification: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-[#101B32] dark:text-slate-100">
                    Step 4: Documentation
                  </h2>
                  <button
                    type="button"
                    onClick={() => setDocPreview(!docPreview)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-[#2457D6] dark:text-[#438BFF]"
                  >
                    {docPreview ? 'Back to Editor' : 'Preview Markdown'}
                  </button>
                </div>

                {docPreview ? (
                  <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F7F9FC] dark:bg-[#0B1221]">
                    <MarkdownRenderer
                      content={`${form.docContent}\n\n## Usage Instructions\n${form.docUsageInstructions}\n\n## Example\n\`\`\`bash\n${form.docExamples}\n\`\`\``}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1">
                        Documentation Title *
                      </label>
                      <input
                        value={form.docTitle}
                        onChange={(e) => setForm({ ...form, docTitle: e.target.value })}
                        placeholder="e.g., Commercial FX Platform Quickstart"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
                      />
                      {errors.docTitle && <p className="text-xs text-[#D94B4B] mt-1">{errors.docTitle}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1">
                        Markdown Content *
                      </label>
                      <textarea
                        rows={6}
                        value={form.docContent}
                        onChange={(e) => setForm({ ...form, docContent: e.target.value })}
                        className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
                      />
                      {errors.docContent && <p className="text-xs text-[#D94B4B] mt-1">{errors.docContent}</p>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1">
                          Usage Instructions
                        </label>
                        <textarea
                          rows={3}
                          value={form.docUsageInstructions}
                          onChange={(e) => setForm({ ...form, docUsageInstructions: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#334155] dark:text-slate-300 mb-1">
                          Code Example
                        </label>
                        <textarea
                          rows={3}
                          value={form.docExamples}
                          onChange={(e) => setForm({ ...form, docExamples: e.target.value })}
                          className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F7F9FC] dark:bg-[#0B1221]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 5 && (
              <div className="space-y-5">
                <h2 className="text-base font-semibold text-[#101B32] dark:text-slate-100">
                  Step 5: Review & Publish
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {completionChecklist.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F7F9FC] dark:bg-[#0B1221]"
                    >
                      <span className="text-xs font-medium text-[#101B32] dark:text-slate-200">
                        {item.label}
                      </span>
                      {item.valid ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#16A477]">
                          <Check className="w-3.5 h-3.5" /> Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#D94B4B]">
                          <AlertCircle className="w-3.5 h-3.5" /> Incomplete
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <p>
                    <strong className="text-[#101B32] dark:text-slate-100">Platform:</strong>{' '}
                    {form.platformName || 'Untitled'} ({form.businessDomain}) · Owner: {form.technicalOwner}
                  </p>
                  <p>
                    <strong className="text-[#101B32] dark:text-slate-100">Capability:</strong>{' '}
                    {form.capabilityName || 'Not set'} ({form.capabilityDependencies.length} dependencies)
                  </p>
                  <p>
                    <strong className="text-[#101B32] dark:text-slate-100">API:</strong>{' '}
                    {form.apiName || 'Not set'} — <code className="font-mono">{form.apiMethods.join(', ')} {form.apiBaseUrl}</code>
                  </p>
                  <p>
                    <strong className="text-[#101B32] dark:text-slate-100">Documentation:</strong>{' '}
                    {form.docTitle || 'Not set'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {canProduce && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={handleSubmitForReview}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[#2457D6] text-white hover:bg-[#1d48b8] disabled:opacity-60 whitespace-nowrap shrink-0"
                    >
                      <Send className="w-4 h-4" />
                      <span>Submit for Approval</span>
                    </button>
                  )}

                  {isAdmin && activeJourney && activeJourney.status === 'Pending Review' && (
                    <>
                      <button
                        type="button"
                        onClick={() => onApproveJourney(activeJourney.id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-[#16A477] text-white hover:bg-[#138f67] whitespace-nowrap shrink-0"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve Journey</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onRejectJourney(activeJourney.id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-[#D94B4B] text-white hover:bg-[#c13e3e] whitespace-nowrap shrink-0"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </>
                  )}

                  {canProduce && activeJourney && activeJourney.status === 'Approved' && (
                    <button
                      type="button"
                      onClick={() => onPublishJourney(activeJourney.id)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[#16A477] text-white hover:bg-[#138f67] whitespace-nowrap shrink-0"
                    >
                      <Rocket className="w-4 h-4" />
                      <span>Publish to Enterprise Catalog</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Footer Controls */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={step === 1}
                  onClick={() => setStep((s) => Math.max(1, s - 1))}
                  className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>
                {step < 5 && (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center gap-1 px-4 py-2 text-xs font-medium rounded-lg bg-[#2457D6] text-white hover:bg-[#1d48b8]"
                  >
                    <span>Continue</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              {canProduce && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleSaveDraft}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{busy ? 'Saving...' : 'Save Draft'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Producer Journey Queue */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 h-fit">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#101B32] dark:text-slate-100">
              Onboarding Queue ({journeys.length})
            </h2>
            <FileCheck2 className="w-4 h-4 text-[#65748B]" />
          </div>
          <div className="divide-y divide-slate-200/70 dark:divide-slate-800">
            {journeys.map((j) => (
              <button
                key={j.id}
                type="button"
                onClick={() => loadJourneyIntoForm(j)}
                className={`w-full py-3 text-left px-2 rounded-lg transition-colors ${
                  activeJourneyId === j.id
                    ? 'bg-[#2457D6]/10 dark:bg-[#438BFF]/10'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-[#101B32] dark:text-slate-100 truncate">
                    {j.platformName}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className="text-xs text-[#65748B] dark:text-slate-400 truncate">
                    {j.technicalOwner}
                  </span>
                  <StatusText status={j.status} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
