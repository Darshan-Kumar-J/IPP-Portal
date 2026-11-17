# IPP — Internal Platforms Portal

**Tagline:** *Discover. Connect. Build. Accelerate.*

IPP (Internal Platforms Portal) is an enterprise developer experience platform modeled around an internal banking technology ecosystem (contextualized for U.S. Bancorp engineering workflows). It unifies internal platforms, API discovery, Markdown documentation management, 5-step producer onboarding, capability dependency mapping, AI-assisted guidance, and LangGraph/A2A agent workflow orchestration.

> **Demonstration Notice:** All pre-populated platforms, APIs, capabilities, documents, user profiles, and workflow logs in this environment are illustrative demonstration data rather than live proprietary banking systems.

---

## Core Modules

1. **Overview Dashboard** — KPI metrics, interactive React Flow platform/AI ecosystem topology, domain coverage charts, quick API prototyping sandbox, producer workflows, and service health indicators.
2. **Platform Catalog** — Search, multi-faceted filtering (category, owner, lifecycle), sorting, grid/list views, platform detail pages, and platform creation/editing.
3. **API Marketplace & API Explorer** — Browse 12 illustrative internal banking APIs and test `GET`/`POST`/`PUT`/`PATCH`/`DELETE` requests via a secure backend proxy (`/api/explorer/proxy`) with simulated sandbox endpoints.
4. **Producer Workspace** — Guided 5-step onboarding journey (`Platform Info` -> `Capabilities` -> `API Config` -> `Documentation` -> `Review & Publish`) with Zod validation, local draft persistence, approval gates, and live catalog publishing.
5. **Documentation Hub** — Full CRUD Markdown authoring, live preview, automatic Table of Contents, copyable syntax-styled code blocks, version history, and publish workflow.
6. **Capability Management** — Capability registry with an interactive React Flow dependency topology graph.
7. **AI Assistant** — Streaming SSE assistant powered by server-side `@google/genai` (`gemini-4-hydrogen`) when `GEMINI_API_KEY` is configured, with a clearly labeled deterministic demo fallback when unconfigured.
8. **Agent Workflows** — Interactive React Flow orchestration visualizer inspired by LangGraph, DeepAgents, and Agent-to-Agent (A2A) protocols, featuring conditional routing, node inspection, execution logs, and retry recovery.
9. **Integrations & Architecture** — Honest runtime connection states and live health checks across FastAPI, PostgreSQL & pgAdmin 4, API Gateway, Redis, LangGraph, DeepAgents, A2A, A2UI, and Docker.
10. **Administration & Security** — HTTP-only JWT cookie authentication, RBAC enforcement (`Administrator`, `Platform Producer`, `Developer`, `Viewer`), live audit logs, and governance settings.

---

## Architecture & Project Structure

- `server.ts` & `server/*` — Full-stack Express + Vite server running on port `3000` with JWT HTTP-only cookies, RBAC middleware, PostgreSQL (`pg`) health checks, API Explorer proxy, and Gemini SSE streaming.
- `src/*` — React 19, TypeScript, Tailwind CSS v4, Recharts, React Flow (`@xyflow/react`), Zod, and Lucide React frontend.
- `backend-fastapi/` — Modular Python FastAPI reference microservice with Pydantic v2 schemas and LangGraph hooks.
- `database/` — Normalized 17-table PostgreSQL 16 migration (`001_initial_schema.sql`) compatible with **pgAdmin 4**, including UUIDs, foreign keys, indexes, standard PostgreSQL RLS policies, and seed data (`seed.sql`).
- `docker-compose.yml` — Containerized stack combining the web portal, FastAPI service, Redis 7, PostgreSQL 16, and **pgAdmin 4** (on port `5050`).

*(Reported project benchmark: The original reference implementation reported approximately 30% improvement in documentation-generation and AI workflow execution speed through parallel processing, multithreading, and Redis caching.)*

---

## Connecting to PostgreSQL & pgAdmin 4

### Option A: Local PostgreSQL + Desktop pgAdmin 4 (Windows / macOS)
1. **Register your local server in pgAdmin 4**:
   - In **General -> Name**: `IPP Local Postgres`
   - In **Connection -> Host name/address**: enter `127.0.0.1` or `localhost` *(do NOT enter `postgres`, `postgresql://...`, or `:5432` in the Host field)*
   - **Port**: `5432`
   - **Maintenance database**: `postgres` (first connect to `postgres`, then create `ipp_portal`)
   - **Username**: `postgres`
   - **Password**: your local PostgreSQL password
2. **Create the database in pgAdmin 4**:
   - Right-click **Databases** -> **Create** -> **Database...** and name it `ipp_portal`.
3. **Run the schema & seed scripts**:
   - Right-click `ipp_portal` -> **Query Tool**.
   - Open and execute `database/migrations/001_initial_schema.sql`.
   - Open and execute `database/seed.sql`.
4. **Configure environment variables**:
   - Copy `.env.example` to `.env` and set your PostgreSQL credentials:
     ```env
     DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/ipp_portal"
     PGHOST="127.0.0.1"
     PGPORT="5432"
     PGDATABASE="ipp_portal"
     PGUSER="postgres"
     PGPASSWORD="YOUR_PASSWORD"
     ```
5. **Verify in IPP**:
   - Start the server (`npm run dev`), open **Integrations**, and click **Check** on **PostgreSQL & pgAdmin 4**.

### Option B: Docker Compose (PostgreSQL + pgAdmin 4 Web UI)
```bash
docker compose up -d postgres pgadmin
```
- **pgAdmin 4 Web UI (`http://localhost:5050`):** Login with `admin@enterprise-ipp.example` / `admin`, then click **Register -> Server** with Host **`postgres`** (or use **`127.0.0.1`** if connecting from Windows Desktop pgAdmin 4 to the Docker Postgres container on port `5432`).

> **Troubleshooting `[Errno 11001] getaddrinfo failed`:** This Windows socket error occurs when pgAdmin 4 cannot resolve the **Host name/address**. Ensure you entered `127.0.0.1` (or `localhost`) in the Host field—without `postgresql://`, without `:5432`, and without using the Docker-only hostname `postgres` inside the Windows desktop pgAdmin 4 app.

---

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.
