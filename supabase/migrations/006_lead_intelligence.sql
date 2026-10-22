-- Apply after 005. Automatic outbound WhatsApp replies are disabled by default.
alter table leads add column if not exists qualification_answers jsonb not null default '{}'::jsonb;
alter table leads add column if not exists lead_score integer not null default 0 check(lead_score between 0 and 100);
alter table leads add column if not exists lead_priority text not null default 'Cold' check(lead_priority in ('Hot','Warm','Cold'));
alter table leads add column if not exists lead_intent text not null default 'information';
alter table leads add column if not exists suggested_action text;
alter table leads add column if not exists suggested_reply text;
alter table leads add column if not exists lead_summary text;
alter table leads add column if not exists whatsapp_opt_in boolean not null default false;
alter table leads add column if not exists opted_out_at timestamptz;
create table if not exists lead_tasks(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references organizations(id) on delete cascade,
 lead_id uuid not null references leads(id) on delete cascade,
 task_key text not null,title text not null,due_at timestamptz,
 status text not null default 'pending' check(status in ('pending','done','cancelled')),
 created_at timestamptz not null default now(),
 unique(organization_id,lead_id,task_key)
);
create index if not exists lead_tasks_queue on lead_tasks(organization_id,status,due_at);
alter table lead_tasks enable row level security;
create policy lead_tasks_org on lead_tasks for all
 using(organization_id=public.current_org_id())
 with check(organization_id=public.current_org_id());
create table if not exists automation_settings(
 organization_id uuid primary key references organizations(id) on delete cascade,
 auto_reply_enabled boolean not null default false,
 reply_rules jsonb not null default '[]'::jsonb,
 updated_at timestamptz not null default now()
);
alter table automation_settings enable row level security;
create policy automation_settings_read on automation_settings for select using(organization_id=public.current_org_id());
create policy automation_settings_manager_write on automation_settings for all
 using(organization_id=public.current_org_id() and public.current_user_role() in ('owner','manager','super_admin'))
 with check(organization_id=public.current_org_id() and public.current_user_role() in ('owner','manager','super_admin'));
