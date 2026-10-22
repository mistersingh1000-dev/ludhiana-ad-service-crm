-- Apply after 006: throttle automated WhatsApp messages per lead.
alter table leads add column if not exists last_auto_reply_at timestamptz;
create index if not exists leads_auto_reply_cooldown_idx on leads(organization_id,last_auto_reply_at);
