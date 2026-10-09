-- Admin + team invitation support.
alter table organizations add column if not exists status text not null default 'active';

do $$ begin
  alter table organizations add constraint organizations_status_check check (status in ('active','trial','suspended'));
exception when duplicate_object then null; end $$;

create table if not exists team_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role text not null default 'agent' check (role in ('owner','manager','agent')),
  invited_by uuid references profiles(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists team_invites_email_idx on team_invites(lower(email), accepted_at, expires_at desc);

alter table team_invites enable row level security;
-- Invites are intentionally server-only. Service-role API routes manage them.

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
declare
  org_id uuid;
  business_name text;
  org_slug text;
  invited_role text;
  invite_id uuid;
begin
  select id, organization_id, role into invite_id, org_id, invited_role
  from team_invites
  where lower(email)=lower(new.email)
    and accepted_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  if org_id is null then
    business_name := coalesce(nullif(new.raw_user_meta_data->>'business_name',''), 'My Business');
    org_slug := trim(both '-' from regexp_replace(lower(business_name), '[^a-z0-9]+', '-', 'g')) || '-' || substr(new.id::text,1,8);
    insert into organizations(name,slug,plan,status) values (business_name,org_slug,'trial','trial') returning id into org_id;
    invited_role := 'owner';
  else
    update team_invites set accepted_at=now() where id=invite_id;
  end if;

  insert into profiles(id,organization_id,full_name,role,phone)
  values(new.id,org_id,coalesce(new.raw_user_meta_data->>'full_name','User'),coalesce(invited_role,'agent'),new.raw_user_meta_data->>'phone');
  return new;
end;
$$;
