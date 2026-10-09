-- Ludhiana Ad Service CRM initial multi-tenant schema
create extension if not exists pgcrypto;

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  plan text not null default 'trial' check (plan in ('trial','free','growth','pro','agency')),
  trial_ends_at timestamptz default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  full_name text,
  role text not null default 'agent' check (role in ('owner','manager','agent','super_admin')),
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  assigned_to uuid references profiles(id) on delete set null,
  name text not null,
  phone text,
  email text,
  source text default 'manual',
  campaign text,
  adset text,
  ad_name text,
  status text not null default 'new' check (status in ('new','contacted','interested','follow_up','converted','lost')),
  pipeline_value numeric(12,2) default 0,
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  meta_lead_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists leads_org_idx on leads(organization_id, created_at desc);
create index if not exists leads_followup_idx on leads(organization_id, next_follow_up_at);
create unique index if not exists leads_meta_lead_unique on leads(meta_lead_id) where meta_lead_id is not null;

create table if not exists lead_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  kind text not null,
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  channel text not null default 'whatsapp',
  external_contact_id text,
  last_message_at timestamptz default now(),
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  direction text not null check (direction in ('inbound','outbound')),
  body text,
  provider_message_id text,
  status text,
  created_at timestamptz not null default now()
);

create table if not exists integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  provider text not null,
  config jsonb default '{}'::jsonb,
  is_active boolean default false,
  created_at timestamptz not null default now(),
  unique(organization_id,provider)
);

create table if not exists integration_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  provider text not null,
  event_type text not null,
  external_id text,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(provider, external_id)
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  provider text,
  external_subscription_id text,
  plan text not null,
  status text not null default 'active',
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists organizations_set_updated_at on organizations;
create trigger organizations_set_updated_at before update on organizations for each row execute function public.set_updated_at();
drop trigger if exists leads_set_updated_at on leads;
create trigger leads_set_updated_at before update on leads for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
declare
  org_id uuid;
  business_name text;
  org_slug text;
begin
  business_name := coalesce(nullif(new.raw_user_meta_data->>'business_name',''), 'My Business');
  org_slug := trim(both '-' from regexp_replace(lower(business_name), '[^a-z0-9]+', '-', 'g')) || '-' || substr(new.id::text,1,8);
  insert into organizations(name,slug) values (business_name,org_slug) returning id into org_id;
  insert into profiles(id,organization_id,full_name,role,phone)
  values(new.id,org_id,coalesce(new.raw_user_meta_data->>'full_name','Owner'),'owner',new.raw_user_meta_data->>'phone');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table leads enable row level security;
alter table lead_activities enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table integrations enable row level security;
alter table integration_events enable row level security;
alter table subscriptions enable row level security;

create or replace function public.current_org_id() returns uuid language sql stable security definer set search_path=public as $$
  select organization_id from profiles where id = auth.uid() limit 1;
$$;

create policy "organizations_same_org" on organizations for select using (id = public.current_org_id());
create policy "profiles_same_org" on profiles for select using (organization_id = public.current_org_id() or id = auth.uid());
create policy "leads_same_org" on leads for all using (organization_id = public.current_org_id()) with check (organization_id = public.current_org_id());
create policy "activities_same_org" on lead_activities for all using (organization_id = public.current_org_id()) with check (organization_id = public.current_org_id());
create policy "conversations_same_org" on conversations for all using (organization_id = public.current_org_id()) with check (organization_id = public.current_org_id());
create policy "messages_same_org" on messages for all using (organization_id = public.current_org_id()) with check (organization_id = public.current_org_id());
create policy "integrations_same_org" on integrations for all using (organization_id = public.current_org_id()) with check (organization_id = public.current_org_id());
create policy "integration_events_same_org" on integration_events for select using (organization_id = public.current_org_id());
create policy "subscriptions_same_org" on subscriptions for select using (organization_id = public.current_org_id());
