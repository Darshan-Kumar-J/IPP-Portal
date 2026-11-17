import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import PptxGenJS from 'pptxgenjs';
import type {
  ApiEndpoint,
  Capability,
  DocumentEntry,
  IntegrationItem,
  Platform,
  ProducerJourney,
  RoleDefinition,
  User,
} from '../src/types/ipp.js';

export interface ExportPortalSnapshot {
  platforms: Platform[];
  apis: ApiEndpoint[];
  capabilities: Capability[];
  documents: DocumentEntry[];
  journeys: ProducerJourney[];
  integrations: IntegrationItem[];
  users: User[];
  roles: RoleDefinition[];
}

const ARCH_IMAGE_PATH = path.resolve(
  process.cwd(),
  'src/assets/images/ipp_architecture_visual_1794898004881.jpg'
);

const PALETTE = {
  navy: '#101B32',
  royal: '#2457D6',
  electric: '#438BFF',
  cloud: '#F7F9FC',
  slate: '#65748B',
  ink: '#1E293B',
  border: '#CBD5E1',
  green: '#16A477',
  amber: '#E9A23B',
  red: '#D94B4B',
  white: '#FFFFFF',
};

// ============================================================================
// 1. COMPLETE TECHNICAL & FUNCTIONAL STUDY GUIDE (PDF)
// ============================================================================
export async function generateProjectPdfBuffer(
  snapshot: ExportPortalSnapshot
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 64, bottom: 56, left: 52, right: 52 },
      bufferPages: true,
      info: {
        Title: 'IPP — Internal Platforms Portal: Complete Project Study Guide',
        Author: 'IPP Enterprise Platform Architecture',
        Subject: 'Full-Stack Architecture, Modules, APIs, Database, RBAC & Deployment Guide',
        Keywords: 'IPP, Internal Platforms Portal, Developer Portal, API Marketplace, LangGraph, PostgreSQL',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const leftX = doc.page.margins.left;

    const ensureSpace = (neededHeight: number) => {
      if (doc.y + neededHeight > doc.page.height - doc.page.margins.bottom - 18) {
        doc.addPage();
      }
    };

    const drawSectionHeader = (num: string, title: string, subtitle?: string) => {
      ensureSpace(64);
      doc.moveDown(0.5);
      const y = doc.y;
      doc.rect(leftX, y, 4, 22).fill(PALETTE.royal);
      doc
        .fillColor(PALETTE.royal)
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .text(`SECTION ${num}`, leftX + 12, y);
      doc
        .fillColor(PALETTE.navy)
        .font('Helvetica-Bold')
        .fontSize(16)
        .text(title, leftX + 12, y + 11);
      doc.y = y + 34;
      if (subtitle) {
        doc
          .fillColor(PALETTE.slate)
          .font('Helvetica')
          .fontSize(9.5)
          .text(subtitle, leftX, doc.y, { width: pageWidth });
        doc.moveDown(0.4);
      }
      doc
        .moveTo(leftX, doc.y)
        .lineTo(leftX + pageWidth, doc.y)
        .lineWidth(0.75)
        .strokeColor(PALETTE.border)
        .stroke();
      doc.moveDown(0.6);
    };

    const drawSubHeading = (title: string) => {
      ensureSpace(32);
      doc.moveDown(0.35);
      doc
        .fillColor(PALETTE.navy)
        .font('Helvetica-Bold')
        .fontSize(11.5)
        .text(title, leftX, doc.y, { width: pageWidth });
      doc.moveDown(0.25);
    };

    const drawParagraph = (text: string) => {
      ensureSpace(28);
      doc
        .fillColor(PALETTE.ink)
        .font('Helvetica')
        .fontSize(9.8)
        .text(text, leftX, doc.y, { width: pageWidth, lineGap: 3 });
      doc.moveDown(0.45);
    };

    const drawBullets = (items: Array<{ lead: string; body: string }>) => {
      for (const item of items) {
        ensureSpace(22);
        const startY = doc.y;
        doc.circle(leftX + 5, startY + 5, 2.2).fill(PALETTE.royal);
        doc
          .fillColor(PALETTE.navy)
          .font('Helvetica-Bold')
          .fontSize(9.5)
          .text(`${item.lead}: `, leftX + 14, startY, {
            width: pageWidth - 14,
            continued: true,
            lineGap: 2.5,
          })
          .font('Helvetica')
          .fillColor(PALETTE.ink)
          .text(item.body, { lineGap: 2.5 });
        doc.moveDown(0.22);
      }
      doc.moveDown(0.25);
    };

    const drawCodeBlock = (title: string, lines: string[]) => {
      const lineHeight = 12;
      const boxHeight = 24 + lines.length * lineHeight + 10;
      ensureSpace(boxHeight + 8);
      const y = doc.y;
      doc.roundedRect(leftX, y, pageWidth, boxHeight, 6).fill('#0F172A');
      doc
        .fillColor('#93C5FD')
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .text(title, leftX + 12, y + 8);
      doc
        .fillColor('#E2E8F0')
        .font('Courier')
        .fontSize(8.2)
        .text(lines.join('\n'), leftX + 12, y + 22, {
          width: pageWidth - 24,
          lineGap: 2,
        });
      doc.y = y + boxHeight + 10;
    };

    const drawTable = (
      headers: string[],
      rows: string[][],
      colWidths: number[]
    ) => {
      const headerHeight = 22;
      ensureSpace(headerHeight + 28);
      let y = doc.y;

      // Header row
      doc.rect(leftX, y, pageWidth, headerHeight).fill(PALETTE.navy);
      let cx = leftX;
      headers.forEach((h, i) => {
        doc
          .fillColor(PALETTE.white)
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .text(h, cx + 6, y + 6, { width: colWidths[i] - 12, ellipsis: true });
        cx += colWidths[i];
      });
      y += headerHeight;

      rows.forEach((row, rIdx) => {
        const heights = row.map((cell, i) => {
          doc.font(i === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.3);
          return doc.heightOfString(cell, { width: colWidths[i] - 12, lineGap: 1.5 });
        });
        const rowH = Math.max(20, Math.max(...heights) + 10);

        if (y + rowH > doc.page.height - doc.page.margins.bottom - 20) {
          doc.addPage();
          y = doc.page.margins.top;
          doc.rect(leftX, y, pageWidth, headerHeight).fill(PALETTE.navy);
          let rx = leftX;
          headers.forEach((h, i) => {
            doc
              .fillColor(PALETTE.white)
              .font('Helvetica-Bold')
              .fontSize(8.5)
              .text(h, rx + 6, y + 6, { width: colWidths[i] - 12, ellipsis: true });
            rx += colWidths[i];
          });
          y += headerHeight;
        }

        doc
          .rect(leftX, y, pageWidth, rowH)
          .fill(rIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC');
        doc
          .rect(leftX, y, pageWidth, rowH)
          .lineWidth(0.5)
          .strokeColor('#E2E8F0')
          .stroke();

        let cellX = leftX;
        row.forEach((cell, i) => {
          doc
            .fillColor(i === 0 ? PALETTE.navy : PALETTE.ink)
            .font(i === 0 ? 'Helvetica-Bold' : 'Helvetica')
            .fontSize(8.3)
            .text(cell, cellX + 6, y + 5, {
              width: colWidths[i] - 12,
              lineGap: 1.5,
            });
          cellX += colWidths[i];
        });
        y += rowH;
      });

      doc.y = y + 10;
    };

    // ---------------- COVER PAGE ----------------
    doc.rect(0, 0, doc.page.width, 250).fill(PALETTE.navy);
    doc.rect(0, 250, doc.page.width, 5).fill(PALETTE.royal);

    // Geometric node logo on cover
    const lx = leftX;
    const ly = 54;
    doc.circle(lx + 10, ly + 10, 4).fill(PALETTE.electric);
    doc.circle(lx + 30, ly + 4, 4).fill('#FFFFFF');
    doc.circle(lx + 30, ly + 22, 4).fill(PALETTE.green);
    doc
      .moveTo(lx + 10, ly + 10)
      .lineTo(lx + 30, ly + 4)
      .moveTo(lx + 10, ly + 10)
      .lineTo(lx + 30, ly + 22)
      .moveTo(lx + 30, ly + 4)
      .lineTo(lx + 30, ly + 22)
      .lineWidth(1.5)
      .strokeColor(PALETTE.electric)
      .stroke();

    doc
      .fillColor('#93C5FD')
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('ENTERPRISE DEVELOPER EXPERIENCE & AI PLATFORM', leftX + 46, 58);

    doc
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .fontSize(26)
      .text('IPP — Internal Platforms Portal', leftX, 100, { width: pageWidth });

    doc
      .fillColor('#CBD5E1')
      .font('Helvetica')
      .fontSize(13)
      .text('Complete Technical, Architectural & Functional Study Guide', leftX, 136, {
        width: pageWidth,
      });

    doc
      .fillColor(PALETTE.electric)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text('Discover. Connect. Build. Accelerate.', leftX, 174);

    doc
      .fillColor('#94A3B8')
      .font('Helvetica')
      .fontSize(9)
      .text(
        `Project Context: Internal Enterprise Developer Portal (U.S. Bancorp Engineering Context)  |  Generated: ${new Date().toISOString().slice(0, 10)}`,
        leftX,
        214,
        { width: pageWidth }
      );

    doc.y = 280;

    // Key Metrics Summary Boxes on Cover
    const boxW = (pageWidth - 24) / 4;
    const kpiCards = [
      { label: 'Registered Platforms', val: String(snapshot.platforms.length) },
      { label: 'Marketplace APIs', val: String(snapshot.apis.length) },
      { label: 'Tracked Capabilities', val: String(snapshot.capabilities.length) },
      { label: 'PostgreSQL Tables', val: '17' },
    ];
    kpiCards.forEach((k, idx) => {
      const bx = leftX + idx * (boxW + 8);
      doc.roundedRect(bx, doc.y, boxW, 58, 6).fill(PALETTE.cloud);
      doc
        .roundedRect(bx, doc.y, boxW, 58, 6)
        .lineWidth(0.75)
        .strokeColor(PALETTE.border)
        .stroke();
      doc
        .fillColor(PALETTE.royal)
        .font('Helvetica-Bold')
        .fontSize(20)
        .text(k.val, bx + 10, doc.y + 10, { width: boxW - 20 });
      doc
        .fillColor(PALETTE.slate)
        .font('Helvetica')
        .fontSize(8.2)
        .text(k.label, bx + 10, doc.y + 36, { width: boxW - 20 });
    });
    doc.y += 76;

    if (fs.existsSync(ARCH_IMAGE_PATH)) {
      doc.image(ARCH_IMAGE_PATH, leftX, doc.y, {
        width: pageWidth,
        height: 112,
        fit: [pageWidth, 112],
        align: 'center',
      });
      doc.y += 120;
    }

    drawSubHeading('Study Guide Contents');
    drawTable(
      ['Section', 'Topic', 'What You Will Learn'],
      [
        ['01', 'Product Vision & Context', 'Business problem, positioning, target personas, and demo notice'],
        ['02', 'Branding & Design System', 'Color tokens, typography, theme system, and enterprise UX rules'],
        ['03', 'Full-Stack Architecture', 'React 19 + Express/Vite + FastAPI + Gemini + Redis + PostgreSQL'],
        ['04', 'All 11 Portal Modules', 'Detailed walkthrough of every screen, state flow, and interaction'],
        ['05', 'REST API Reference', 'Every backend endpoint, HTTP method, proxy route, and RBAC rule'],
        ['06', 'Database Schema (17 Tables)', 'PostgreSQL 16 tables, UUIDs, indexes, RLS, and pgAdmin 4 workflow'],
        ['07', 'Security & RBAC Model', 'HTTP-only JWT cookies, 4-role permission matrix, and audit logging'],
        ['08', 'Setup & Client Demo Guide', 'Local & Docker deployment, .env config, and 5-minute demo script'],
      ],
      [52, 160, pageWidth - 212]
    );

    // ---------------- SECTION 1 ----------------
    doc.addPage();
    drawSectionHeader(
      '01',
      'Product Vision, Positioning & Enterprise Context',
      'Why IPP exists, who it serves, and how it accelerates banking software engineering.'
    );
    drawParagraph(
      'IPP (Internal Platforms Portal) is an enterprise Developer Experience Platform and AI-Powered Developer Portal designed around internal banking technology workflows (contextualized for U.S. Bancorp engineering teams). In large financial institutions, internal APIs, core banking platforms, security policies, and technical documentation are frequently scattered across disconnected wikis, repositories, and spreadsheets.'
    );
    drawParagraph(
      'Positioning Statement: "One intelligent platform to discover, publish, integrate, and manage enterprise technology capabilities." Tagline: "Discover. Connect. Build. Accelerate."'
    );
    drawBullets([
      {
        lead: 'Platform Producers',
        body: 'Register internal platforms through a structured 5-step onboarding wizard, map capabilities, attach API specs, and submit through governance review gates.',
      },
      {
        lead: 'API Consumers & Developers',
        body: 'Discover approved banking APIs, inspect FAPI 2.0 / mTLS auth requirements, read versioned Markdown docs, and execute live HTTP requests inside API Explorer.',
      },
      {
        lead: 'Enterprise Architects',
        body: 'Visualize platform-to-capability dependencies in interactive React Flow topology graphs to identify bottlenecks and security gaps.',
      },
      {
        lead: 'Technical Documentation Teams',
        body: 'Author, live-preview, version, and publish standardized integration guides with automatic Table of Contents generation.',
      },
      {
        lead: 'Platform Administrators',
        body: 'Enforce Role-Based Access Control (RBAC), approve producer onboarding submissions, inspect immutable audit logs, and configure security policies.',
      },
    ]);
    drawParagraph(
      'Demonstration Notice & Benchmark: All pre-loaded platforms, APIs, capabilities, documents, user profiles, and workflow logs are clearly marked as illustrative demonstration records (isDemoRecord: true) rather than live proprietary banking systems. In the reference architecture, combining parallel processing, multithreading, and Redis caching yielded approximately 30% improvement in documentation-generation and AI workflow execution speed.'
    );

    // ---------------- SECTION 2 ----------------
    drawSectionHeader(
      '02',
      'Branding & Enterprise Design System',
      'Banking-grade visual language built with Tailwind CSS v4, Inter, and IBM Plex Mono.'
    );
    drawTable(
      ['Token Name', 'Hex Code', 'Role in Interface'],
      [
        ['Midnight Navy', '#101B32', 'Primary dark surface, hero command canvas, headings, dark sidebar'],
        ['Royal Blue', '#2457D6', 'Primary CTAs, active navigation highlight, brand accent'],
        ['Electric Blue', '#438BFF', 'Interactive links, focus states, dark-mode primary highlights'],
        ['Cloud White', '#F7F9FC', 'Light mode canvas background for calm, readable contrast'],
        ['Slate Gray', '#65748B', 'Secondary labels, metadata, captions, inactive controls'],
        ['Success Green', '#16A477', 'Published status, passing health checks, completed workflow nodes'],
        ['Warning Amber', '#E9A23B', 'In Review / Pending Review states, demo mode notices'],
        ['Error Red', '#D94B4B', 'Denied RBAC actions, failed workflow nodes, destructive confirms'],
      ],
      [110, 80, pageWidth - 190]
    );
    drawBullets([
      {
        lead: 'Typography',
        body: 'Inter handles all UI headings and body copy with tabular-nums enabled for KPI figures, latencies, and timestamps. IBM Plex Mono renders API endpoints, HTTP methods, UUIDs, cURL snippets, and JSON payloads.',
      },
      {
        lead: 'Dual Theme Support',
        body: 'Seamless Light (Cloud White) and Dark (Midnight Navy / #0B1221) modes persisted in localStorage (ipp_theme) via Tailwind CSS v4 @custom-variant dark.',
      },
      {
        lead: 'Enterprise Interaction Polish',
        body: 'Includes skeleton loading screens during boot, empty states with next-action guidance, toast notifications, confirmation dialogs before destructive deletes, and responsive mobile drawers.',
      },
    ]);

    // ---------------- SECTION 3 ----------------
    drawSectionHeader(
      '03',
      'Full-Stack System Architecture & Tech Stack',
      'Unified TypeScript + React SPA backed by Express/Vite, FastAPI reference hooks, Gemini AI, Redis, and PostgreSQL 16.'
    );
    drawTable(
      ['Layer', 'Technologies Used', 'Responsibility'],
      [
        [
          'Frontend SPA',
          'React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide Icons, Motion',
          '11 enterprise modules, theme persistence, responsive AppShell, client validation',
        ],
        [
          'Visualization & Forms',
          '@xyflow/react (React Flow), Recharts, Zod',
          'Interactive ecosystem & capability topology graphs, domain analytics charts, strict form validation',
        ],
        [
          'Primary Backend Server',
          'Node.js, Express 4, tsx, Vite Middleware (port 3000)',
          'Serves SPA + REST APIs, JWT cookie auth, RBAC middleware, API Explorer proxy, SSE AI streaming, pg health check',
        ],
        [
          'AI Integration',
          '@google/genai (gemini-4-hydrogen), SSE Streaming',
          'Server-side LLM responses grounded in live catalog data + deterministic Demo Mode fallback when key is unset',
        ],
        [
          'Python Reference API',
          'FastAPI, Pydantic v2, Uvicorn (backend-fastapi/main.py)',
          'Modular Python microservice blueprint demonstrating JWT claims verification and LangGraph/A2A hooks',
        ],
        [
          'Database & Cache',
          'PostgreSQL 16 (pg driver + 001_initial_schema.sql), pgAdmin 4, Redis 7',
          '17 normalized tables with UUIDs, indexes, RLS policies, and container orchestration via docker-compose.yml',
        ],
      ],
      [115, 175, pageWidth - 290]
    );

    // ---------------- SECTION 4 ----------------
    doc.addPage();
    drawSectionHeader(
      '04',
      'Deep Dive: All 11 Application Modules',
      'Complete breakdown of user workflows, capabilities, and seed inventory across every navigation item.'
    );
    drawTable(
      ['#', 'Module', 'Key Features & Data Covered'],
      [
        ['1', 'Overview Dashboard', 'Midnight Navy command hero, 5-pillar Tech Stack switcher, 4 KPI bento cards with sparklines, interactive React Flow Ecosystem Topology with node inspector, Recharts domain analytics, Quick API Sandbox, platform activity, recent workflows, and service health.'],
        ['2', 'Platform Catalog', `${snapshot.platforms.length} illustrative banking platforms (Customer Data, Payment Processing, Identity & Access, Notification, Account Services, Treasury Liquidity, Fraud Risk, Developer Telemetry). Supports search, category/owner/lifecycle filters, sorting, grid/list views, detail drill-down, and Create/Edit modals.`],
        ['3', 'API Marketplace', `${snapshot.apis.length} banking APIs (Instant Payment Initiation, Settlement Status, ACH Batch, Customer Party, Open Banking Consent, FAPI Token Exchange, Introspection, Alert Dispatch, Intraday Balance, Transaction Ledger, Risk Decision, Liquidity Sweep). Displays auth type, methods, rate limits, and deep-links to API Explorer.`],
        ['4', 'Producer Workspace', 'Guided 5-step Producer Journey: (1) Platform Info -> (2) Capability Config -> (3) API Config -> (4) Markdown Docs -> (5) Review & Publish. Enforces Zod step validation, localStorage auto-drafts, backend persistence, Admin Approve/Reject gates, and live catalog publishing.'],
        ['5', 'Documentation Hub', `${snapshot.documents.length} technical Markdown guides with live split preview, auto-generated Table of Contents, syntax-styled copyable code blocks, full version history snapshots, Publish/Draft workflow, and delete confirmation.`],
        ['6', 'Capability Management', `${snapshot.capabilities.length} enterprise capabilities (e.g., FAPI 2.0 OAuth, Zero-Trust mTLS, KYC Resolution, Consent Ledger, Fraud Scoring, RTP/FedNow, ISO 20022). Includes CRUD + interactive React Flow dependency topology graph.`],
        ['7', 'AI Assistant', 'Server-side @google/genai (gemini-4-hydrogen) SSE chat grounded in live catalog metadata, suggested prompts, Markdown + code rendering, A2UI clickable navigation cards, and transparent Demo Mode fallback when GEMINI_API_KEY is unset.'],
        ['8', 'Agent Workflows', 'LangGraph / DeepAgents / A2A workflow visualizer. Routes prompts across Request -> Validation -> Intent -> Conditional Router -> Discovery / DocGen / Capability Validation -> Approval Gate -> Completion. Supports simulated error injection & retry recovery.'],
        ['9', 'API Explorer', 'Interactive HTTP workbench supporting GET, POST, PUT, PATCH, DELETE with editable headers, query params, JSON body, response latency/status, and cURL copy. Routes safely through /api/explorer/proxy and simulated /api/sandbox/* endpoints.'],
        ['10', 'Integrations', `${snapshot.integrations.length} runtime integration cards (FastAPI, PostgreSQL & pgAdmin 4, API Gateway, Redis, LangGraph, DeepAgents, A2A, A2UI, Docker) showing honest Connected / Demo Sandbox / Not Configured states and live PostgreSQL version() checks.`],
        ['11', 'Administration', '4 RBAC role definitions, live user role switching/management, immutable Security Audit Logs (Allowed & Denied attempts), and governance policy toggles (Admin Approval Gate, Tier-1 mTLS enforcement, Redis TTL).'],
      ],
      [24, 120, pageWidth - 144]
    );

    // ---------------- SECTION 5 ----------------
    drawSectionHeader(
      '05',
      'Complete Backend REST API Reference (server.ts)',
      'All Express endpoints served on port 3000 with Zod validation and RBAC enforcement.'
    );
    drawTable(
      ['Method & Path', 'Auth / Role Required', 'Purpose'],
      [
        ['POST /api/auth/login, /refresh, /logout', 'Public / Cookie', 'Issues or refreshes HTTP-only JWT access (2h) & refresh (7d) cookies for demo persona switching'],
        ['GET /api/auth/me', 'Cookie / Default', 'Returns active authenticated user session and available demo personas'],
        ['GET /api/overview', 'Authenticated', 'Returns KPI summary, recent activities, and aiConfigured status'],
        ['GET /api/platforms, /api/platforms/:id', 'All Roles', 'Lists/filters platforms or fetches full platform detail'],
        ['POST/PUT /api/platforms, DELETE /:id', 'Producer/Admin (Admin for DEL)', 'Registers, updates, or deletes platforms with Zod schema checks'],
        ['GET/POST/PUT/DELETE /api/capabilities', 'Producer/Admin (Admin for DEL)', 'Manages enterprise capability nodes and dependency arrays'],
        ['GET/POST/PUT/DELETE /api/documents', 'Dev+ (Producer/Admin publish)', 'Creates/updates versioned Markdown docs, publishes, or deletes'],
        ['GET/POST/PUT /api/producer/journeys', 'Producer/Admin', 'Saves and updates 5-step onboarding journeys'],
        ['POST /api/producer/journeys/:id/{submit,approve,reject,publish}', 'Admin for approve/reject/publish', 'Transitions onboarding state and publishes platform+capability+API+doc atomically'],
        ['GET /api/catalog/apis & POST /api/explorer/proxy', 'All Roles / Auth', 'Lists API Marketplace items and proxies safe test requests to /api/sandbox/*'],
        ['GET /api/ai/status & POST /api/ai/chat', 'Authenticated', 'Reports Gemini availability and streams SSE assistant replies'],
        ['GET /api/ai/workflows, POST /execute, /:id/retry', 'Authenticated', 'Lists, executes, or retries LangGraph/DeepAgents/A2A workflows'],
        ['GET /api/integrations & POST /:id/check', 'Authenticated', 'Runs live health probes (including PostgreSQL pg SELECT version())'],
        ['GET/PUT /api/admin/{users,audit-logs,settings}', 'Administrator for PUT', 'Manages RBAC user roles, views audit trail, updates portal policies'],
        ['GET /api/exports/project-guide.pdf & client-presentation.pptx', 'All Roles', 'Generates and downloads this Study Guide PDF and Client PPTX'],
      ],
      [185, 115, pageWidth - 300]
    );

    // ---------------- SECTION 6 ----------------
    doc.addPage();
    drawSectionHeader(
      '06',
      'PostgreSQL 16 Database Schema (17 Tables)',
      'Normalized relational schema in /database/migrations/001_initial_schema.sql, compatible with pgAdmin 4.'
    );
    drawParagraph(
      'The PostgreSQL migration uses pgcrypto (gen_random_uuid()), strict CHECK constraints, cascading foreign keys, B-Tree composite indexes, JSONB columns for dynamic agent/journey payloads, and standard PostgreSQL Row Level Security (RLS) policies using current_setting(\'app.current_user_id\', true) so it runs cleanly in standalone PostgreSQL and pgAdmin 4.'
    );
    drawTable(
      ['Domain Group', 'Tables Included', 'Key Columns & Constraints'],
      [
        ['Identity & RBAC', 'roles, permissions, users', 'UUID PKs, CHECK role in (Administrator, Platform Producer, Developer, Viewer), unique email'],
        ['Platform & Capabilities', 'platforms, platform_owners, capabilities, platform_capabilities', 'Tier (Tier 1/2/3), SLA target, UUID[] dependency_ids, M:N join tables'],
        ['API Marketplace', 'api_catalog, platform_apis', 'Version, base_url, TEXT[] methods, auth_type, rate_limit'],
        ['Documentation Hub', 'documents, document_versions', 'Draft/Published status, current_version, full immutable Markdown history'],
        ['Producer & Workflows', 'producer_journeys, workflow_executions, workflow_nodes', '5-step CHECK (1..5), JSONB payload, node execution telemetry & A2A JSONB'],
        ['AI, Infra & Audit', 'agent_sessions, integrations, audit_logs', 'Conversation JSONB, integration state, immutable Allowed/Denied audit records'],
      ],
      [115, 175, pageWidth - 290]
    );

    // ---------------- SECTION 7 ----------------
    drawSectionHeader(
      '07',
      'Security, Authentication & RBAC Matrix',
      'Defense-in-depth across browser cookies, Express middleware, PostgreSQL RLS, and banking API profiles.'
    );
    drawTable(
      ['Role', 'Platforms & Capabilities', 'Documentation & Producer', 'Administration & Audit'],
      [
        ['Administrator', 'Create, Edit, Delete, Approve', 'Create, Edit, Publish, Approve/Reject Journeys', 'Full access: manage user roles, settings, view audit logs'],
        ['Platform Producer', 'Create, Edit (cannot Delete)', 'Create, Edit, Publish Docs; Submit Onboarding', 'Read-only view of users/settings; actions audited'],
        ['Developer', 'Read-only catalog & graph', 'Create & Edit Doc drafts; Test API Explorer', 'Cannot approve journeys or modify admin settings'],
        ['Viewer', 'Read-only discovery', 'Read-only docs; API Explorer read testing', 'Write/Edit/Delete requests return HTTP 403 + Audit Denied'],
      ],
      [95, 125, 145, pageWidth - 365]
    );
    drawBullets([
      {
        lead: 'HTTP-Only JWT Cookies',
        body: 'Access tokens (2h TTL) and refresh tokens (7d TTL) are signed server-side via JWT_SECRET and stored in httpOnly, sameSite=lax cookies (secure in production) so client JavaScript cannot exfiltrate tokens.',
      },
      {
        lead: 'Server-Side AI & Proxy Isolation',
        body: 'GEMINI_API_KEY never reaches the React bundle. API Explorer routes through /api/explorer/proxy with strict protocol guards to prevent SSRF.',
      },
    ]);

    // ---------------- SECTION 8 ----------------
    drawSectionHeader(
      '08',
      'Environment Setup, Docker & Client Demo Script',
      'Practical instructions for local execution, pgAdmin 4 connection, and client presentation.'
    );
    drawCodeBlock('Local .env Configuration (Root Directory)', [
      'JWT_SECRET="replace-with-64-char-hex-secret"',
      'PGHOST="127.0.0.1"',
      'PGPORT="5432"',
      'PGDATABASE="ipp_portal"',
      'PGUSER="postgres"',
      'PGPASSWORD="YOUR_POSTGRES_PASSWORD"',
      'DATABASE_URL="postgresql://postgres:YOUR_POSTGRES_PASSWORD@127.0.0.1:5432/ipp_portal"',
      'GEMINI_API_KEY="YOUR_GEMINI_API_KEY"   # Optional: falls back to Demo Mode if omitted',
    ]);
    drawBullets([
      {
        lead: 'Step 1 (Database)',
        body: 'In pgAdmin 4, create database ipp_portal, open Query Tool, and run database/migrations/001_initial_schema.sql followed by database/seed.sql.',
      },
      {
        lead: 'Step 2 (Run Locally)',
        body: 'Run npm install && npm run dev (starts Express + Vite on http://localhost:3000), or run docker compose up -d for the full 5-container stack (Portal, FastAPI, Redis, Postgres, pgAdmin on :5050).',
      },
      {
        lead: 'Step 3 (5-Minute Client Demo Flow)',
        body: 'Overview Hero & Topology -> Platform Catalog Drill-down -> API Marketplace -> API Explorer Live Sandbox -> Producer 5-Step Journey & Admin Approval -> Capability Dependency Graph -> AI Assistant & Agent Workflows -> RBAC Role Switch & Audit Log Proof.',
      },
    ]);

    // Footer + Page Numbers across all buffered pages
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const prevTop = doc.page.margins.top;
      const prevBottom = doc.page.margins.bottom;
      doc.page.margins.top = 0;
      doc.page.margins.bottom = 0;

      const pageNum = i + 1;
      if (pageNum > 1) {
        doc
          .fillColor(PALETTE.slate)
          .font('Helvetica')
          .fontSize(8)
          .text(
            'IPP — Internal Platforms Portal  |  Technical & Functional Study Guide',
            leftX,
            26,
            { width: pageWidth - 90, lineBreak: false }
          );
        doc
          .moveTo(leftX, 40)
          .lineTo(leftX + pageWidth, 40)
          .lineWidth(0.5)
          .strokeColor('#E2E8F0')
          .stroke();
      }
      doc
        .fillColor(PALETTE.slate)
        .font('Helvetica')
        .fontSize(8)
        .text(
          `Illustrative Enterprise Reference Architecture  |  Page ${pageNum} of ${range.count}`,
          leftX,
          doc.page.height - 34,
          { width: pageWidth, align: 'center', lineBreak: false }
        );

      doc.page.margins.top = prevTop;
      doc.page.margins.bottom = prevBottom;
    }

    doc.end();
  });
}

// ============================================================================
// 2. CLIENT-READY EXECUTIVE & TECHNICAL PRESENTATION (PPTX)
// ============================================================================
export async function generateClientPptxBuffer(
  snapshot: ExportPortalSnapshot
): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5 inches
  pptx.author = 'IPP Enterprise Platform Architecture';
  pptx.company = 'Internal Platforms Portal';
  pptx.subject = 'Client Presentation — Enterprise Developer Experience & AI Platform';
  pptx.title = 'IPP — Internal Platforms Portal Client Presentation';

  const C = {
    navy: '101B32',
    navySoft: '172542',
    royal: '2457D6',
    electric: '438BFF',
    cloud: 'F7F9FC',
    white: 'FFFFFF',
    slate: '64748B',
    ink: '1E293B',
    border: 'CBD5E1',
    green: '16A477',
    amber: 'E9A23B',
    red: 'D94B4B',
  };

  const addSlideChrome = (
    slide: PptxGenJS.Slide,
    kicker: string,
    title: string,
    slideNo: number
  ) => {
    slide.background = { color: C.cloud };
    // Top bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.333,
      h: 0.12,
      fill: { color: C.royal },
      line: { type: 'none' },
    });
    slide.addText(kicker.toUpperCase(), {
      x: 0.6,
      y: 0.32,
      w: 10,
      h: 0.28,
      fontFace: 'Segoe UI',
      fontSize: 10,
      bold: true,
      color: C.royal,
    });
    slide.addText(title, {
      x: 0.6,
      y: 0.58,
      w: 12.1,
      h: 0.5,
      fontFace: 'Segoe UI',
      fontSize: 22,
      bold: true,
      color: C.navy,
    });
    slide.addShape(pptx.ShapeType.line, {
      x: 0.6,
      y: 1.15,
      w: 12.13,
      h: 0,
      line: { color: C.border, width: 1 },
    });
    // Footer
    slide.addText('IPP — Internal Platforms Portal  |  Discover. Connect. Build. Accelerate.', {
      x: 0.6,
      y: 7.05,
      w: 9.5,
      h: 0.3,
      fontFace: 'Segoe UI',
      fontSize: 9,
      color: C.slate,
    });
    slide.addText(`${slideNo} / 12`, {
      x: 11.5,
      y: 7.05,
      w: 1.23,
      h: 0.3,
      fontFace: 'Segoe UI',
      fontSize: 9,
      bold: true,
      align: 'right',
      color: C.slate,
    });
  };

  const addCard = (
    slide: PptxGenJS.Slide,
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    body: string,
    accentColor = C.royal
  ) => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x,
      y,
      w,
      h,
      rectRadius: 0.08,
      fill: { color: C.white },
      line: { color: C.border, width: 1 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y,
      w,
      h: 0.07,
      fill: { color: accentColor },
      line: { type: 'none' },
    });
    slide.addText(title, {
      x: x + 0.18,
      y: y + 0.18,
      w: w - 0.36,
      h: 0.35,
      fontFace: 'Segoe UI',
      fontSize: 13,
      bold: true,
      color: C.navy,
    });
    slide.addText(body, {
      x: x + 0.18,
      y: y + 0.55,
      w: w - 0.36,
      h: h - 0.68,
      fontFace: 'Segoe UI',
      fontSize: 10.5,
      color: C.ink,
      valign: 'top',
      lineSpacingMultiple: 1.2,
    });
  };

  // ---------------- SLIDE 1: TITLE SLIDE ----------------
  const s1 = pptx.addSlide();
  s1.background = { color: C.navy };
  s1.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 0.24,
    h: 7.5,
    fill: { color: C.royal },
    line: { type: 'none' },
  });
  s1.addText('ENTERPRISE DEVELOPER EXPERIENCE & AI PLATFORM', {
    x: 0.85,
    y: 1.1,
    w: 7.5,
    h: 0.35,
    fontFace: 'Segoe UI',
    fontSize: 11,
    bold: true,
    color: C.electric,
  });
  s1.addText('IPP — Internal\nPlatforms Portal', {
    x: 0.85,
    y: 1.55,
    w: 7.3,
    h: 1.8,
    fontFace: 'Segoe UI',
    fontSize: 42,
    bold: true,
    color: C.white,
  });
  s1.addText(
    'One intelligent platform to discover, publish, integrate, and manage enterprise technology capabilities.',
    {
      x: 0.85,
      y: 3.5,
      w: 7.2,
      h: 0.9,
      fontFace: 'Segoe UI',
      fontSize: 16,
      color: 'CBD5E1',
      lineSpacingMultiple: 1.25,
    }
  );
  s1.addText('Discover. Connect. Build. Accelerate.', {
    x: 0.85,
    y: 4.55,
    w: 6.5,
    h: 0.4,
    fontFace: 'Segoe UI',
    fontSize: 15,
    bold: true,
    color: C.electric,
  });
  s1.addShape(pptx.ShapeType.roundRect, {
    x: 0.85,
    y: 5.35,
    w: 7.1,
    h: 1.05,
    rectRadius: 0.08,
    fill: { color: C.navySoft },
    line: { color: C.royal, width: 1 },
  });
  s1.addText(
    'Banking Engineering Context (U.S. Bancorp Reference Model)\nNote: Pre-populated catalog records are illustrative demonstration data showcasing production patterns.',
    {
      x: 1.05,
      y: 5.5,
      w: 6.7,
      h: 0.8,
      fontFace: 'Segoe UI',
      fontSize: 10.5,
      color: 'E2E8F0',
      lineSpacingMultiple: 1.3,
    }
  );
  if (fs.existsSync(ARCH_IMAGE_PATH)) {
    s1.addImage({
      path: ARCH_IMAGE_PATH,
      x: 8.3,
      y: 1.35,
      w: 4.4,
      h: 4.8,
      sizing: { type: 'cover', w: 4.4, h: 4.8 },
    });
  }
  s1.addNotes(
    'Welcome the client and introduce IPP (Internal Platforms Portal). Emphasize that IPP is an internal enterprise developer portal designed for banking technology teams—bringing platform discovery, API testing, Markdown documentation, 5-step producer onboarding, capability mapping, and AI-assisted workflows into one governed self-service workspace. Note transparently that the seeded datasets are illustrative demonstration records.'
  );

  // ---------------- SLIDE 2: BUSINESS PROBLEM & SOLUTION ----------------
  const s2 = pptx.addSlide();
  addSlideChrome(s2, 'Executive Overview', 'Solving Enterprise Platform Fragmentation in Banking', 2);
  addCard(
    s2,
    0.6,
    1.45,
    5.85,
    5.2,
    'The Challenge Without IPP',
    '• Scattered Discovery: Banking APIs, SDKs, and internal services live across disconnected wikis, Confluence spaces, and Git repos.\n\n• Slow Producer Onboarding: Publishing a new platform requires manual spreadsheets, ad-hoc security reviews, and inconsistent docs.\n\n• Hidden Dependency Risk: Teams struggle to see upstream IAM, mTLS, ledger, or fraud-scoring dependencies before deploying.\n\n• High Developer Friction: Consumers lack a safe, unified sandbox to test FAPI 2.0 / OAuth endpoints before writing production code.',
    C.red
  );
  addCard(
    s2,
    6.88,
    1.45,
    5.85,
    5.2,
    'The IPP Unified Solution',
    '• Single Self-Service Catalog: Centralizes platforms, capabilities, APIs, and Markdown guides with real-time global search.\n\n• Guided 5-Step Producer Journey: Standardizes onboarding with Zod schema validation, draft persistence, and Architecture Review gates.\n\n• Visual Dependency Topology: Interactive React Flow graphs surface upstream/downstream capability links immediately.\n\n• AI & Agentic Acceleration: Streaming Gemini Assistant + LangGraph/A2A workflows accelerate discovery and documentation (~30% reported workflow speedup).',
    C.green
  );
  s2.addNotes(
    'Contrast the fragmented status quo on the left with IPP on the right. Key message for stakeholders: IPP reduces developer onboarding time from weeks of ticket-chasing to a structured, auditable self-service lifecycle while enforcing banking-grade security.'
  );

  // ---------------- SLIDE 3: TARGET PERSONAS & VALUE ----------------
  const s3 = pptx.addSlide();
  addSlideChrome(s3, 'Users & Stakeholders', 'Built for Every Role Across the Enterprise SDLC', 3);
  const personas = [
    {
      title: 'Platform Producers',
      body: 'Onboard new banking platforms via the 5-step wizard, register APIs, map capabilities, and publish documentation.',
      color: C.royal,
    },
    {
      title: 'API Consumers & Developers',
      body: 'Search the API Marketplace, read live Markdown quickstarts, copy cURL examples, and test calls in API Explorer.',
      color: C.electric,
    },
    {
      title: 'Enterprise Architects',
      body: 'Inspect cross-platform capability dependency graphs, SLA tiers, and zero-trust compliance across domains.',
      color: C.navy,
    },
    {
      title: 'Technical Writers',
      body: 'Author, live-preview, version, and publish standardized Markdown guides inside Documentation Hub.',
      color: C.green,
    },
    {
      title: 'Security & Admins',
      body: 'Enforce 4-tier RBAC via HTTP-only JWT cookies, review producer submissions, and monitor audit logs.',
      color: C.amber,
    },
    {
      title: 'AI Workflow Operators',
      body: 'Execute LangGraph/DeepAgents/A2A pipelines for discovery, capability audits, and doc synthesis with retry recovery.',
      color: C.royal,
    },
  ];
  personas.forEach((p, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    addCard(s3, 0.6 + col * 4.15, 1.45 + row * 2.7, 3.85, 2.45, p.title, p.body, p.color);
  });
  s3.addNotes(
    'Walk through the 6 user personas. Highlight that in the live demo we can actually switch between 4 RBAC personas (Administrator, Platform Producer, Developer, Viewer) from the header profile menu to prove how permissions adapt dynamically.'
  );

  // ---------------- SLIDE 4: SYSTEM ARCHITECTURE ----------------
  const s4 = pptx.addSlide();
  addSlideChrome(s4, 'Technical Architecture', 'Four-Tier Modular Full-Stack Ecosystem', 4);
  const tiers = [
    {
      name: '1. Presentation Layer (React 19 + TypeScript + Tailwind v4)',
      desc: '11-module SPA on Vite 8 · React Flow (@xyflow/react) topology graphs · Recharts domain analytics · Zod validation · Light/Dark themes.',
      color: C.electric,
    },
    {
      name: '2. API Gateway & Application Server (Node.js Express + FastAPI Reference)',
      desc: 'Port 3000 unified server · HTTP-only JWT cookies · RBAC enforcement · Safe /api/explorer/proxy & /api/sandbox/* · FastAPI Pydantic v2 microservice.',
      color: C.royal,
    },
    {
      name: '3. AI & Orchestration Layer (@google/genai + LangGraph / DeepAgents / A2A)',
      desc: 'Server-side Gemini SSE streaming (gemini-4-hydrogen) with Demo fallback · Conditional LangGraph routing · A2A JSON payloads · Redis 7 caching.',
      color: C.navy,
    },
    {
      name: '4. Persistence & Governance Layer (PostgreSQL 16 + pgAdmin 4 + Docker)',
      desc: '17 normalized tables · UUID primary keys · Row Level Security (RLS) · Immutable audit_logs · Containerized via docker-compose.yml.',
      color: C.green,
    },
  ];
  tiers.forEach((t, idx) => {
    const y = 1.45 + idx * 1.35;
    s4.addShape(pptx.ShapeType.roundRect, {
      x: 0.6,
      y,
      w: 12.13,
      h: 1.12,
      rectRadius: 0.08,
      fill: { color: C.white },
      line: { color: C.border, width: 1 },
    });
    s4.addShape(pptx.ShapeType.rect, {
      x: 0.6,
      y,
      w: 0.16,
      h: 1.12,
      fill: { color: t.color },
      line: { type: 'none' },
    });
    s4.addText(t.name, {
      x: 0.92,
      y: y + 0.14,
      w: 11.6,
      h: 0.35,
      fontFace: 'Segoe UI',
      fontSize: 13.5,
      bold: true,
      color: C.navy,
    });
    s4.addText(t.desc, {
      x: 0.92,
      y: y + 0.52,
      w: 11.6,
      h: 0.48,
      fontFace: 'Segoe UI',
      fontSize: 10.5,
      color: C.ink,
    });
  });
  s4.addNotes(
    'Explain how the architecture cleanly separates UI rendering, API/RBAC security, AI orchestration, and PostgreSQL persistence. Point out that all AI API keys and JWT signing secrets remain strictly server-side—never exposed to the browser.'
  );

  // ---------------- SLIDE 5: MODULES PART 1 ----------------
  const s5 = pptx.addSlide();
  addSlideChrome(s5, 'Core Modules (Part 1)', 'Discovery, Ecosystem Visibility & Interactive API Testing', 5);
  addCard(
    s5,
    0.6,
    1.45,
    5.85,
    2.55,
    'Overview Command Center',
    '• Midnight Navy executive hero with 5-pillar Tech Stack switcher.\n• 4 live KPI cards with sparklines & Recharts domain coverage analytics.\n• Interactive React Flow Ecosystem Topology + Quick API Sandbox.',
    C.navy
  );
  addCard(
    s5,
    6.88,
    1.45,
    5.85,
    2.55,
    `Platform Catalog (${snapshot.platforms.length} Sample Platforms)`,
    '• Covers Core Banking, Payments, IAM, Notifications, Treasury, Fraud & Telemetry.\n• Search, multi-faceted filtering, grid/list views, SLA tiers, and CRUD modals.\n• Direct deep-links to linked Capabilities, APIs, and Documentation.',
    C.royal
  );
  addCard(
    s5,
    0.6,
    4.25,
    5.85,
    2.55,
    `API Marketplace (${snapshot.apis.length} Sample APIs)`,
    '• Displays versioning, HTTP methods, base URLs, rate limits, and auth profiles (FAPI 2.0 OAuth + mTLS, JWT Bearer).\n• One-click "Test in Explorer" pre-loads headers, query params, and JSON payloads.',
    C.electric
  );
  addCard(
    s5,
    6.88,
    4.25,
    5.85,
    2.55,
    'API Explorer & Safe Sandbox Proxy',
    '• Supports GET, POST, PUT, PATCH, DELETE requests with live latency metrics.\n• Requests route through server-side /api/explorer/proxy to simulated /api/sandbox/* banking routes with cURL export.',
    C.green
  );
  s5.addNotes(
    'These four modules form the Developer Consumption experience. A developer lands on Overview, discovers a platform in Platform Catalog, inspects its endpoints in API Marketplace, and tests a live call in API Explorer in under 60 seconds.'
  );

  // ---------------- SLIDE 6: MODULES PART 2 ----------------
  const s6 = pptx.addSlide();
  addSlideChrome(s6, 'Core Modules (Part 2)', 'Self-Service Producer Onboarding, Documentation & Capabilities', 6);
  addCard(
    s6,
    0.6,
    1.45,
    3.85,
    5.25,
    '5-Step Producer Workspace',
    'Structured onboarding workflow:\n\n1. Platform Info (domain, owner, email)\n2. Capability Mapping & Dependencies\n3. API Config & Auth Profile\n4. Markdown Documentation\n5. Review & Publish\n\nIncludes Zod step validation, localStorage draft recovery, Admin Approve/Reject gates, and atomic publishing to the live catalog.',
    C.royal
  );
  addCard(
    s6,
    4.74,
    1.45,
    3.85,
    5.25,
    `Documentation Hub (${snapshot.documents.length} Guides)`,
    'Enterprise technical writing suite:\n\n• Full Markdown CRUD + split Live Preview\n• Auto-generated Table of Contents\n• Copyable syntax-styled cURL & JSON blocks\n• Immutable Version History snapshots\n• Draft -> Published governance toggle\n• Confirmation dialogs on deletion',
    C.green
  );
  addCard(
    s6,
    8.88,
    1.45,
    3.85,
    5.25,
    `Capability Management (${snapshot.capabilities.length} Nodes)`,
    'Architectural dependency control:\n\n• Tracks core services like FAPI 2.0 OAuth, Zero-Trust mTLS, KYC, Consent Ledger, and Fraud Scoring\n• Interactive React Flow dependency graph showing upstream/downstream impact\n• Create, edit, and map services to platforms',
    C.navy
  );
  s6.addNotes(
    'Focus on how Producer Workspace solves governance: instead of bypassing architecture review, every new platform goes through Zod validation and a Pending Review -> Approved -> Published gate, automatically creating the Platform, Capability, API, and Doc records.'
  );

  // ---------------- SLIDE 7: AI ASSISTANT & AGENT WORKFLOWS ----------------
  const s7 = pptx.addSlide();
  addSlideChrome(s7, 'AI & Agentic Orchestration', 'Gemini Streaming Assistant & LangGraph / A2A Workflows', 7);
  addCard(
    s7,
    0.6,
    1.45,
    5.85,
    5.2,
    'Enterprise AI Assistant (@google/genai)',
    '• Server-Side Grounding: Queries live catalog platforms, APIs, capabilities, and docs via SSE streaming (/api/ai/chat) using gemini-4-hydrogen.\n\n• A2UI Contextual Actions: Replies include interactive buttons that navigate straight to Producer Workspace, API Explorer, or Docs.\n\n• Transparent Demo Mode: Automatically falls back to deterministic, clearly labeled Demo Mode when GEMINI_API_KEY is unconfigured.',
    C.electric
  );
  addCard(
    s7,
    6.88,
    1.45,
    5.85,
    5.2,
    'Agent Workflows (LangGraph · DeepAgents · A2A)',
    '• Conditional Graph Routing: Executes multi-step pipelines (Request -> Input Validation -> Intent Classification -> Conditional Router -> Discovery / DocGen / Capability Validation -> Approval Gate).\n\n• Deep Inspection: Click any node to view Agent-to-Agent (A2A/1.0) JSON payloads, durations, and execution logs.\n\n• Resilience & Performance: Supports simulated timeout injection + one-click Retry recovery; reference architecture reported ~30% speedup via parallelization & Redis caching.',
    C.royal
  );
  s7.addNotes(
    'Highlight that IPP AI is grounded in actual internal catalog metadata—not a generic chatbot. Also demonstrate transparency: when running without a Gemini key, it clearly labels Demo Mode rather than fabricating external actions, and Agent Workflows include simulated failure + retry recovery.'
  );

  // ---------------- SLIDE 8: SECURITY & RBAC ----------------
  const s8 = pptx.addSlide();
  addSlideChrome(s8, 'Security & Governance', 'HTTP-Only JWT Authentication, RBAC Matrix & Audit Trail', 8);
  const rbacRows: PptxGenJS.TableRow[] = [
    [
      { text: 'Role', options: { bold: true, fill: { color: C.navy }, color: C.white } },
      { text: 'Catalog & Capabilities', options: { bold: true, fill: { color: C.navy }, color: C.white } },
      { text: 'Docs & Producer Journey', options: { bold: true, fill: { color: C.navy }, color: C.white } },
      { text: 'Admin & Audit Logs', options: { bold: true, fill: { color: C.navy }, color: C.white } },
    ],
    ...[
      ['Administrator', 'Create, Edit, Delete', 'Create, Edit, Publish, Approve/Reject', 'Full user role updates, settings, audit logs'],
      ['Platform Producer', 'Create & Edit', 'Create, Edit, Publish Docs & Journeys', 'Read-only admin view; actions audited'],
      ['Developer', 'Read-only discovery', 'Author/Edit Doc drafts; API Explorer', 'Blocked from admin & approval gates'],
      ['Viewer', 'Read-only discovery', 'Read-only docs; Explorer read tests', 'HTTP 403 Denied + logged to Audit Trail'],
    ].map((row, idx): PptxGenJS.TableRow =>
      row.map((cell, cIdx) => ({
        text: cell,
        options: {
          bold: cIdx === 0,
          color: cIdx === 0 ? C.navy : C.ink,
          fill: { color: idx % 2 === 0 ? C.white : C.cloud },
        },
      }))
    ),
  ];
  s8.addTable(
    rbacRows,
    {
      x: 0.6,
      y: 1.45,
      w: 12.13,
      colW: [2.2, 3.1, 3.4, 3.43],
      fontFace: 'Segoe UI',
      fontSize: 10.5,
      border: { type: 'solid', color: C.border, pt: 0.75 },
      rowH: 0.58,
      valign: 'middle',
    }
  );
  addCard(
    s8,
    0.6,
    4.65,
    12.13,
    2.05,
    'Banking-Grade Security Controls',
    '• HTTP-Only Cookies: Access (2h) and Refresh (7d) JWT tokens stored in httpOnly, sameSite=lax cookies—inaccessible to XSS scripts.\n• API Security Profiles: Catalog enforces FAPI 2.0 OAuth + mTLS, JWT Bearer, and HMAC signatures for Tier-1 endpoints.\n• Immutable Audit Logging: Every login, role switch, write action, and HTTP 403 denial is recorded with actor, role, resource, and timestamp.',
    C.navy
  );
  s8.addNotes(
    'Walk through the 4-role RBAC table. In the live client demo, switch to the Viewer role and try creating or deleting an item—IPP immediately returns HTTP 403 and records a Denied entry in Administration -> Audit Logs.'
  );

  // ---------------- SLIDE 9: DATABASE ARCHITECTURE ----------------
  const s9 = pptx.addSlide();
  addSlideChrome(s9, 'Data Architecture', 'PostgreSQL 16 Schema (17 Tables) & pgAdmin 4 Compatibility', 9);
  addCard(
    s9,
    0.6,
    1.45,
    7.45,
    5.2,
    'Normalized 17-Table Relational Model (/database/migrations/001_initial_schema.sql)',
    '• Identity & RBAC: roles, permissions, users (UUID PKs, role checks)\n• Platform Registry: platforms, platform_owners, capabilities, platform_capabilities\n• API Marketplace: api_catalog, platform_apis\n• Documentation: documents, document_versions (full immutable history)\n• Onboarding & Agents: producer_journeys (JSONB + 5-step CHECK), workflow_executions, workflow_nodes, agent_sessions\n• Operations: integrations, audit_logs\n\nIncludes composite B-Tree indexes and standard PostgreSQL Row Level Security (RLS) policies compatible with pgAdmin 4.',
    C.royal
  );
  addCard(
    s9,
    8.35,
    1.45,
    4.38,
    5.2,
    'Docker & pgAdmin 4 Stack',
    'docker-compose.yml runs 5 coordinated services:\n\n1. ipp-portal (Express + Vite :3000)\n2. ipp-fastapi (Python API :8000)\n3. redis (Redis 7 cache :6379)\n4. postgres (PostgreSQL 16 :5432)\n5. pgadmin (pgAdmin 4 Web UI :5050)\n\nAuto-initializes 01_schema.sql and 02_seed.sql on first boot.',
    C.green
  );
  s9.addNotes(
    'Explain that the database design is fully portable: it works cleanly with local Windows PostgreSQL + pgAdmin 4 as well as containerized Docker Compose deployments, with zero vendor lock-in.'
  );

  // ---------------- SLIDE 10: INTEGRATIONS ----------------
  const s10 = pptx.addSlide();
  addSlideChrome(s10, 'Runtime Observability', 'Honest Integration Health Checks & Infrastructure Readiness', 10);
  const intRows: PptxGenJS.TableRow[] = [
    [
      { text: 'Integration', options: { bold: true, fill: { color: C.navy }, color: C.white } },
      { text: 'Category', options: { bold: true, fill: { color: C.navy }, color: C.white } },
      { text: 'Runtime Check & Role', options: { bold: true, fill: { color: C.navy }, color: C.white } },
    ],
    ...snapshot.integrations.slice(0, 9).map((i, idx): PptxGenJS.TableRow => [
      {
        text: i.name,
        options: { bold: true, color: C.navy, fill: { color: idx % 2 === 0 ? C.white : C.cloud } },
      },
      {
        text: i.category,
        options: { color: C.ink, fill: { color: idx % 2 === 0 ? C.white : C.cloud } },
      },
      {
        text: `${i.connectionState} — ${i.endpointHint}`,
        options: { color: C.ink, fill: { color: idx % 2 === 0 ? C.white : C.cloud } },
      },
    ]),
  ];
  s10.addTable(intRows, {
    x: 0.6,
    y: 1.4,
    w: 12.13,
    colW: [3.2, 2.2, 6.73],
    fontFace: 'Segoe UI',
    fontSize: 9.8,
    border: { type: 'solid', color: C.border, pt: 0.75 },
    rowH: 0.48,
    valign: 'middle',
  });
  s10.addNotes(
    'Point out IPP’s honesty principle: instead of showing fake green checkmarks for unconfigured external systems, the Integrations view reports exact runtime states (Connected, Demo Sandbox, or Not Configured) and runs live PostgreSQL SELECT version() probes on demand.'
  );

  // ---------------- SLIDE 11: CLIENT DEMO WALKTHROUGH ----------------
  const s11 = pptx.addSlide();
  addSlideChrome(s11, 'Live Demonstration Plan', 'Recommended 5-Minute Client Walkthrough Script', 11);
  const steps = [
    ['1. Overview (45s)', 'Show the Midnight Navy hero, switch Tech Stack pillars, inspect a live node in Ecosystem Topology, and run a Quick Sandbox call.'],
    ['2. Catalog & Explorer (60s)', 'Filter Platform Catalog, open Payment Processing Platform, jump to Instant Payment Initiation API, and execute POST in API Explorer.'],
    ['3. Producer Onboarding (75s)', 'Start a 5-step Producer Journey, advance with Zod validation, submit for review, approve as Administrator, and publish live to the catalog.'],
    ['4. Docs & Capabilities (45s)', 'Open Documentation Hub to preview Markdown + version history, then inspect upstream FAPI/mTLS dependencies in Capability Management.'],
    ['5. AI, Workflows & RBAC (75s)', 'Ask the AI Assistant a platform question, run & retry a LangGraph/A2A workflow, switch role to Viewer to trigger a 403, and show the Audit Log.'],
  ];
  steps.forEach((st, idx) => {
    const y = 1.42 + idx * 1.08;
    s11.addShape(pptx.ShapeType.roundRect, {
      x: 0.6,
      y,
      w: 12.13,
      h: 0.9,
      rectRadius: 0.08,
      fill: { color: C.white },
      line: { color: C.border, width: 1 },
    });
    s11.addShape(pptx.ShapeType.roundRect, {
      x: 0.75,
      y: y + 0.17,
      w: 2.35,
      h: 0.56,
      rectRadius: 0.06,
      fill: { color: C.royal },
      line: { type: 'none' },
    });
    s11.addText(st[0], {
      x: 0.75,
      y: y + 0.25,
      w: 2.35,
      h: 0.4,
      fontFace: 'Segoe UI',
      fontSize: 11,
      bold: true,
      align: 'center',
      color: C.white,
    });
    s11.addText(st[1], {
      x: 3.3,
      y: y + 0.16,
      w: 9.2,
      h: 0.58,
      fontFace: 'Segoe UI',
      fontSize: 11,
      color: C.ink,
      valign: 'middle',
    });
  });
  s11.addNotes(
    'Use this exact 5-step sequence during your client presentation so every key value proposition—discovery, API testing, governance, AI, and security—is demonstrated smoothly in five minutes.'
  );

  // ---------------- SLIDE 12: SUMMARY & NEXT STEPS ----------------
  const s12 = pptx.addSlide();
  s12.background = { color: C.navy };
  s12.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.333,
    h: 0.14,
    fill: { color: C.electric },
    line: { type: 'none' },
  });
  s12.addText('SUMMARY & PRODUCTION ROADMAP', {
    x: 0.8,
    y: 0.9,
    w: 11,
    h: 0.35,
    fontFace: 'Segoe UI',
    fontSize: 11,
    bold: true,
    color: C.electric,
  });
  s12.addText('Ready to Accelerate Internal Engineering', {
    x: 0.8,
    y: 1.35,
    w: 11.5,
    h: 0.7,
    fontFace: 'Segoe UI',
    fontSize: 30,
    bold: true,
    color: C.white,
  });
  const nextBoxes = [
    {
      title: '1. Connect Enterprise IdP',
      body: 'Swap demo session switcher with corporate OIDC / SAML 2.0 SSO while preserving existing JWT RBAC middleware.',
    },
    {
      title: '2. Wire Full PostgreSQL CRUD',
      body: 'Point server.ts routes directly at the 17-table PostgreSQL 16 schema with Redis 7 read caching.',
    },
    {
      title: '3. Enable Live Gateway & Gemini',
      body: 'Connect GEMINI_API_KEY and corporate API Gateway discovery feeds for real-time OpenAPI ingestion.',
    },
  ];
  nextBoxes.forEach((b, idx) => {
    const x = 0.8 + idx * 4.0;
    s12.addShape(pptx.ShapeType.roundRect, {
      x,
      y: 2.45,
      w: 3.7,
      h: 2.8,
      rectRadius: 0.08,
      fill: { color: C.navySoft },
      line: { color: C.royal, width: 1 },
    });
    s12.addText(b.title, {
      x: x + 0.22,
      y: 2.7,
      w: 3.26,
      h: 0.45,
      fontFace: 'Segoe UI',
      fontSize: 14,
      bold: true,
      color: C.electric,
    });
    s12.addText(b.body, {
      x: x + 0.22,
      y: 3.25,
      w: 3.26,
      h: 1.75,
      fontFace: 'Segoe UI',
      fontSize: 11.5,
      color: 'E2E8F0',
      lineSpacingMultiple: 1.3,
    });
  });
  s12.addText('Thank You — Questions & Live Demo Discussion', {
    x: 0.8,
    y: 5.9,
    w: 11.7,
    h: 0.5,
    fontFace: 'Segoe UI',
    fontSize: 18,
    bold: true,
    color: C.white,
  });
  s12.addText('IPP (Internal Platforms Portal)  |  Discover. Connect. Build. Accelerate.', {
    x: 0.8,
    y: 6.45,
    w: 11.7,
    h: 0.35,
    fontFace: 'Segoe UI',
    fontSize: 11,
    color: '94A3B8',
  });
  s12.addNotes(
    'Conclude with the three concrete production-readiness next steps (Enterprise SSO, full PostgreSQL CRUD persistence, and live API Gateway + Gemini integration), then open the floor for client questions or transition directly into the live walkthrough.'
  );

  const output = await pptx.write({ outputType: 'nodebuffer' });
  return Buffer.isBuffer(output) ? output : Buffer.from(output as Uint8Array);
}
