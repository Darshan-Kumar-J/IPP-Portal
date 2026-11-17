import { GoogleGenAI } from '@google/genai';
import type { ApiEndpoint, Capability, DocumentEntry, Platform } from '../src/types/ipp.js';

export function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.trim() && key !== 'MY_GEMINI_API_KEY');
}

export function createGeminiClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function buildPortalContextSummary(
  platforms: Platform[],
  apis: ApiEndpoint[],
  capabilities: Capability[],
  docs: DocumentEntry[]
): string {
  const platLines = platforms
    .map((p) => `- ${p.name} (${p.id}, ${p.category}, ${p.lifecycleStatus}, Owner: ${p.owner})`)
    .join('\n');
  const apiLines = apis
    .map((a) => `- ${a.name} (${a.methods.join(', ')} ${a.baseUrl}, Auth: ${a.authType}, Platform: ${a.platformId})`)
    .join('\n');
  const capLines = capabilities
    .map((c) => `- ${c.name} (${c.id}, Dependencies: ${c.dependencyIds.join(', ') || 'None'})`)
    .join('\n');
  const docLines = docs
    .map((d) => `- ${d.title} (${d.status}, v${d.version}, Platform: ${d.platformId})`)
    .join('\n');

  return `You are the IPP (Internal Platforms Portal) Enterprise Developer Assistant.
Your role is to assist platform producers, API consumers, developers, and enterprise architects using the portal's catalog data below.
Always clearly distinguish illustrative demo records from live production systems, and never claim to have executed external infrastructure actions that did not run.
When helpful, suggest concrete next steps inside IPP modules (Platform Catalog, API Marketplace, Producer Workspace, Documentation Hub, Capability Management, Agent Workflows, or API Explorer).

Current Registered Platforms (${platforms.length}):
${platLines}

Current API Marketplace (${apis.length}):
${apiLines}

Current Capabilities (${capabilities.length}):
${capLines}

Current Documentation Entries (${docs.length}):
${docLines}`;
}

export interface DemoAssistantResponse {
  text: string;
  suggestedActions: Array<{ label: string; section: string; description: string }>;
}

export function generateDemoAssistantResponse(
  prompt: string,
  platforms: Platform[],
  apis: ApiEndpoint[],
  capabilities: Capability[]
): DemoAssistantResponse {
  const lower = prompt.toLowerCase();

  if (lower.includes('register') || lower.includes('onboard') || lower.includes('producer')) {
    return {
      text: `### Registering a New Platform in IPP (Demo Mode)

To onboard a new internal technology platform, follow the 5-step **Producer Journey** in the Producer Workspace:

1. **Platform Information** — Provide platform name, business domain, technical owner, and support contact.
2. **Capability Configuration** — Define capabilities, assign categories, and link upstream dependencies (for example \`FAPI 2.0 OAuth Token Issuance\`).
3. **API Configuration** — Configure base URL, allowed HTTP methods, authentication profile (\`OAuth 2.0 + mTLS\`, \`JWT Bearer\`, etc.), and OpenAPI specification notes.
4. **Documentation** — Author Markdown quickstart documentation, usage instructions, and sample code snippets.
5. **Review & Publish** — Validate required fields, save as draft or submit for Architecture Review Board approval, and publish to the Platform Catalog.

\`\`\`json
{
  "recommendedAuth": "OAuth 2.0 + mTLS",
  "requiredDependencies": ["cap-oauth", "cap-mtls"],
  "reviewGate": "Pending Review -> Approved -> Published"
}
\`\`\``,
      suggestedActions: [
        {
          label: 'Open Producer Workspace',
          section: 'producer',
          description: 'Launch the 5-step platform registration wizard',
        },
        {
          label: 'View Capability Dependencies',
          section: 'capabilities',
          description: 'Inspect upstream IAM & ledger dependencies',
        },
      ],
    };
  }

  if (lower.includes('payment') || lower.includes('api')) {
    const paymentApis = apis.filter(
      (a) => a.category.toLowerCase().includes('payment') || a.platformId === 'plat-pay'
    );
    const list = paymentApis
      .map(
        (a) =>
          `- **${a.name}** (\`${a.version}\`) — \`${a.methods.join(', ')}\` \`${a.baseUrl}\` · Auth: ${a.authType}`
      )
      .join('\n');

    return {
      text: `### Payment Processing APIs in IPP (Demo Mode)

I found **${paymentApis.length} illustrative payment APIs** associated with the **Payment Processing Platform**:

${list}

#### Integration Example (\`POST /payments/v2/transfers\`)
\`\`\`bash
curl -X POST https://internal-gw.ipp.example/payments/v2/transfers \\
  -H "Authorization: Bearer <FAPI_TOKEN>" \\
  -H "Idempotency-Key: 8f41c9e2-7b31-4a0d-9d2c-1102a8f7c401" \\
  -H "Content-Type: application/json" \\
  -d '{"sourceAccountId":"acct_01J9X2K8M","amount":{"value":"1450.00","currency":"USD"}}'
\`\`\`

You can test these endpoints immediately against the simulated sandbox in **API Explorer**.`,
      suggestedActions: [
        {
          label: 'Browse API Marketplace',
          section: 'apis',
          description: 'Inspect schemas, rate limits, and auth profiles',
        },
        {
          label: 'Open API Explorer',
          section: 'explorer',
          description: 'Send a live sandbox request to Payment Initiation API',
        },
      ],
    };
  }

  if (lower.includes('doc') || lower.includes('markdown')) {
    return {
      text: `### Documentation Template for Enterprise Platforms (Demo Mode)

Here is a compliant Markdown blueprint matching IPP's **Documentation Hub** standards:

\`\`\`markdown
# [Platform Name] Integration Guide

## Overview
Describe the core business domain, SLA tier, and consumer boundaries.

## Authentication & Security
All Tier 1 calls require FAPI 2.0 OAuth tokens bound to workload mTLS certificates.

## Quickstart Example
\\\`\\\`\\\`bash
curl -X GET https://internal-gw.ipp.example/<service>/v1/resource \\
  -H "Authorization: Bearer <TOKEN>"
\\\`\\\`\\\`

## Error Codes & Idempotency
Document 409 Conflict, 429 Too Many Requests, and retry backoff expectations.
\`\`\`

You can author, preview, version, and publish Markdown docs directly inside **Documentation Hub**.`,
      suggestedActions: [
        {
          label: 'Open Documentation Hub',
          section: 'docs',
          description: 'Create or edit Markdown documentation with live preview',
        },
      ],
    };
  }

  if (lower.includes('capabilit') || lower.includes('missing') || lower.includes('gap')) {
    const draftOrReview = capabilities.filter((c) => c.lifecycleStatus !== 'Published');
    return {
      text: `### Capability Dependency & Gap Analysis (Demo Mode)

Across **${platforms.length} registered platforms** and **${capabilities.length} tracked capabilities**:

- **Published Capabilities**: ${capabilities.length - draftOrReview.length}
- **In Review / Pending**: ${draftOrReview.map((c) => c.name).join(', ') || 'None'}
- **Core Foundation Dependencies**: \`cap-oauth\` (FAPI 2.0 OAuth) and \`cap-mtls\` (Zero-Trust mTLS) are depended on by 7 downstream capabilities.

#### Recommended Checkpoints
1. Ensure any new payment or ledger platform explicitly maps dependencies to **Real-Time Fraud & Sanctions Scoring** (\`cap-risk-score\`).
2. Verify **Open Banking Consent Ledger** (\`cap-consent\`) integration for customer-facing data endpoints.`,
      suggestedActions: [
        {
          label: 'Open Capability Management',
          section: 'capabilities',
          description: 'Inspect the interactive dependency graph',
        },
        {
          label: 'Run Capability Audit Workflow',
          section: 'workflows',
          description: 'Execute the simulated LangGraph capability check',
        },
      ],
    };
  }

  return {
    text: `### IPP Assistant Summary (Demo Mode)

I am currently operating in **Illustrative Demo Mode** because no server-side LLM key is configured. I can help you explore the **${platforms.length} sample platforms**, **${apis.length} sample APIs**, **${capabilities.length} capabilities**, and the 5-step producer onboarding journey.

Try asking me to:
- Help register a new platform
- Find APIs related to payment processing
- Generate documentation for a platform
- Identify missing platform capabilities`,
    suggestedActions: [
      {
        label: 'Explore Platform Catalog',
        section: 'platforms',
        description: 'View all 8 illustrative enterprise platforms',
      },
      {
        label: 'Start Producer Journey',
        section: 'producer',
        description: 'Register a new platform in 5 guided steps',
      },
    ],
  };
}
