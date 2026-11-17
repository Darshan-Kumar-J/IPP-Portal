-- IPP (Internal Platforms Portal) — Initial PostgreSQL Migration (pgAdmin 4 Compatible)
-- Includes UUID primary keys, foreign key constraints, indexes, and standard PostgreSQL Row Level Security (RLS).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL CHECK (name IN ('Administrator', 'Platform Producer', 'Developer', 'Viewer')),
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    scope TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (role_id, scope)
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role_id UUID NOT NULL REFERENCES roles(id),
    department TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended')),
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE platforms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    domain TEXT NOT NULL,
    lifecycle_status TEXT NOT NULL DEFAULT 'Draft' CHECK (lifecycle_status IN ('Published', 'In Review', 'Approved', 'Draft', 'Deprecated')),
    tier TEXT NOT NULL DEFAULT 'Tier 2' CHECK (tier IN ('Tier 1', 'Tier 2', 'Tier 3')),
    sla_target TEXT NOT NULL DEFAULT '99.95%',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE platform_owners (
    platform_id UUID NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ownership_type TEXT NOT NULL DEFAULT 'Primary',
    PRIMARY KEY (platform_id, user_id)
);

CREATE TABLE capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    owner_id UUID REFERENCES users(id),
    lifecycle_status TEXT NOT NULL DEFAULT 'Draft',
    dependency_ids UUID[] NOT NULL DEFAULT '{}',
    associated_services TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE platform_capabilities (
    platform_id UUID NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
    capability_id UUID NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE,
    PRIMARY KEY (platform_id, capability_id)
);

CREATE TABLE api_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    base_url TEXT NOT NULL,
    methods TEXT[] NOT NULL,
    auth_type TEXT NOT NULL,
    rate_limit TEXT NOT NULL,
    lifecycle_status TEXT NOT NULL DEFAULT 'Draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE platform_apis (
    platform_id UUID NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
    api_id UUID NOT NULL REFERENCES api_catalog(id) ON DELETE CASCADE,
    PRIMARY KEY (platform_id, api_id)
);

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    platform_id UUID NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
    api_id UUID REFERENCES api_catalog(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Published')),
    current_version TEXT NOT NULL DEFAULT '1.0.0',
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    summary TEXT NOT NULL,
    content TEXT NOT NULL,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE producer_journeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_name TEXT NOT NULL,
    description TEXT NOT NULL,
    business_domain TEXT NOT NULL,
    technical_owner_id UUID REFERENCES users(id),
    contact_email TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::JSONB,
    current_step INT NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 5),
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'In Progress', 'Pending Review', 'Approved', 'Published', 'Rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    intent TEXT NOT NULL,
    prompt TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Running', 'Completed', 'Failed')),
    selected_branch TEXT NOT NULL,
    total_duration_ms INT NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE workflow_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    node_key TEXT NOT NULL,
    label TEXT NOT NULL,
    agent_type TEXT NOT NULL,
    status TEXT NOT NULL,
    duration_ms INT NOT NULL DEFAULT 0,
    output_summary TEXT NOT NULL,
    a2a_payload JSONB
);

CREATE TABLE agent_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    model_provider TEXT NOT NULL,
    messages JSONB NOT NULL DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    connection_state TEXT NOT NULL,
    last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    outcome TEXT NOT NULL CHECK (outcome IN ('Allowed', 'Denied')),
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_platforms_category_status ON platforms(category, lifecycle_status);
CREATE INDEX idx_documents_platform_status ON documents(platform_id, status);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_producer_journeys_status ON producer_journeys(status);

-- Row Level Security (Standard PostgreSQL 16 / pgAdmin 4 Compatible)
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY platforms_read_all ON platforms FOR SELECT USING (true);
CREATE POLICY documents_read_published ON documents FOR SELECT
  USING (status = 'Published' OR NULLIF(current_setting('app.current_user_id', true), '') IS NOT NULL);
CREATE POLICY audit_admin_only ON audit_logs FOR SELECT
  USING (COALESCE(current_setting('app.current_role', true), 'Administrator') IN ('Administrator', 'Viewer'));
