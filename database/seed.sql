-- IPP Illustrative Demonstration Seed Script
INSERT INTO roles (name, description) VALUES
  ('Administrator', 'Full governance over platforms, RBAC, approvals, and audit logs'),
  ('Platform Producer', 'Onboard platforms, configure capabilities and APIs, and publish docs'),
  ('Developer', 'Discover APIs, run sandbox requests, and execute AI discovery'),
  ('Viewer', 'Read-only access to catalog, docs, and compliance audit views')
ON CONFLICT (name) DO NOTHING;

INSERT INTO platforms (name, slug, description, category, domain, lifecycle_status, tier, sla_target) VALUES
  ('Customer Data Platform', 'customer-data-platform', 'Unified master customer profile, KYC identity graph, and consent ledger.', 'Core Banking Data', 'Customer & Party Domain', 'Published', 'Tier 1', '99.99%'),
  ('Payment Processing Platform', 'payment-processing-platform', 'High-throughput FedNow, RTP, ACH, and ISO 20022 payment orchestration rail.', 'Payments & Settlement', 'Money Movement', 'Published', 'Tier 1', '99.995%'),
  ('Identity and Access Platform', 'identity-and-access-platform', 'Centralized FAPI 2.0 OAuth, OIDC, and mTLS workload identity.', 'Security & IAM', 'Enterprise Trust', 'Published', 'Tier 1', '99.999%'),
  ('Enterprise Notification Platform', 'enterprise-notification-platform', 'Multi-channel transactional alert dispatcher with template governance.', 'Messaging & Alerts', 'Customer Engagement', 'Published', 'Tier 2', '99.95%'),
  ('Account Services Platform', 'account-services-platform', 'Real-time checking, savings, and commercial DDA balance and ledger streaming.', 'Retail & Commercial Accounts', 'Core Ledger', 'Published', 'Tier 1', '99.99%'),
  ('Treasury Liquidity Platform', 'treasury-liquidity-platform', 'Automated cash sweeping and commercial liquidity forecasting engine.', 'Capital & Liquidity', 'Commercial Treasury', 'In Review', 'Tier 2', '99.95%'),
  ('Fraud Risk Telemetry Platform', 'fraud-risk-telemetry-platform', 'Sub-25ms transaction risk scoring and sanctions screening decision engine.', 'Risk & Compliance', 'Financial Crimes', 'Published', 'Tier 1', '99.99%'),
  ('Developer Telemetry & Gateway Platform', 'developer-telemetry-gateway', 'Unified edge API gateway control plane and OpenTelemetry aggregation.', 'Platform Infrastructure', 'Developer Experience', 'Draft', 'Tier 1', '99.99%')
ON CONFLICT (slug) DO NOTHING;
