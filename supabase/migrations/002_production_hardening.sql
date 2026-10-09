-- Production hardening additions for Ludhiana Ad Service CRM.
alter table leads add column if not exists owner_name text;

-- Helpful indexes for tenant dashboards and source reporting.
create index if not exists leads_org_status_idx on leads(organization_id, status, created_at desc);
create index if not exists messages_conversation_idx on messages(conversation_id, created_at);
create index if not exists integration_events_unprocessed_idx on integration_events(provider, processed_at) where processed_at is null;
