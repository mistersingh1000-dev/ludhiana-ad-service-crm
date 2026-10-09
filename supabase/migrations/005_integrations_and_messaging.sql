-- Secure provider credentials, normalized phones and idempotent conversations/messages.
create table if not exists integration_secrets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  provider text not null check (provider in ('meta','whatsapp')),
  access_token_encrypted text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, provider)
);

alter table integration_secrets enable row level security;
-- No browser policies by design. Only service-role server routes may access provider secrets.

drop trigger if exists integration_secrets_set_updated_at on integration_secrets;
create trigger integration_secrets_set_updated_at before update on integration_secrets
for each row execute function public.set_updated_at();

alter table leads add column if not exists phone_normalized text;

create or replace function public.normalize_phone_text(value text) returns text
language sql immutable as $$
  select regexp_replace(coalesce(value,''), '[^0-9]', '', 'g');
$$;

update leads set phone_normalized=public.normalize_phone_text(phone)
where phone_normalized is null or phone_normalized='';

create or replace function public.set_lead_phone_normalized() returns trigger
language plpgsql as $$
begin
  new.phone_normalized := public.normalize_phone_text(new.phone);
  return new;
end;
$$;

drop trigger if exists leads_phone_normalized on leads;
create trigger leads_phone_normalized before insert or update of phone on leads
for each row execute function public.set_lead_phone_normalized();

create index if not exists leads_org_phone_idx on leads(organization_id, phone_normalized);

-- Nullable values remain allowed, while real provider IDs are unique and therefore idempotent.
do $$ begin
  alter table conversations add constraint conversations_external_unique unique (organization_id, channel, external_contact_id);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table messages add constraint messages_provider_message_unique unique (provider_message_id);
exception when duplicate_object then null; end $$;
