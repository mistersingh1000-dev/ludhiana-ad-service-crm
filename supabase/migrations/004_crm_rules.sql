-- Persistent CRM rules + automatic lead assignment.
alter table organizations add column if not exists warning_minutes integer not null default 30;
alter table organizations add column if not exists red_alert_minutes integer not null default 120;
alter table organizations add column if not exists assignment_rule text not null default 'round_robin';
alter table organizations add column if not exists timezone text not null default 'Asia/Kolkata';
alter table organizations add column if not exists round_robin_cursor integer not null default 0;
alter table profiles add column if not exists is_active boolean not null default true;

do $$ begin
  alter table organizations add constraint organizations_assignment_rule_check check (assignment_rule in ('round_robin','least_active','manual'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table organizations add constraint organizations_warning_minutes_check check (warning_minutes between 1 and 1440);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table organizations add constraint organizations_red_alert_minutes_check check (red_alert_minutes between 1 and 10080);
exception when duplicate_object then null; end $$;

create or replace function public.current_user_role() returns text
language sql stable security definer set search_path=public as $$
  select role from profiles where id = auth.uid() limit 1;
$$;

create policy "organizations_manager_update" on organizations for update
using (id = public.current_org_id() and public.current_user_role() in ('owner','manager','super_admin'))
with check (id = public.current_org_id() and public.current_user_role() in ('owner','manager','super_admin'));

create policy "profiles_manager_update" on profiles for update
using (organization_id = public.current_org_id() and public.current_user_role() in ('owner','manager','super_admin'))
with check (organization_id = public.current_org_id() and public.current_user_role() in ('owner','manager','super_admin'));

create or replace function public.assign_new_lead() returns trigger
language plpgsql security definer set search_path=public as $$
declare
  rule text;
  cursor_value integer;
  member_count integer;
  selected_id uuid;
  selected_name text;
begin
  if new.assigned_to is not null then return new; end if;

  select assignment_rule, round_robin_cursor into rule, cursor_value
  from organizations where id=new.organization_id for update;

  if rule='manual' then return new; end if;

  if rule='least_active' then
    select p.id,p.full_name into selected_id,selected_name
    from profiles p
    left join leads l on l.assigned_to=p.id and l.status not in ('converted','lost')
    where p.organization_id=new.organization_id and p.is_active=true and p.role in ('manager','agent')
    group by p.id,p.full_name,p.created_at
    order by count(l.id) asc,p.created_at asc
    limit 1;
  else
    select count(*) into member_count from profiles
    where organization_id=new.organization_id and is_active=true and role in ('manager','agent');
    if member_count>0 then
      select id,full_name into selected_id,selected_name from profiles
      where organization_id=new.organization_id and is_active=true and role in ('manager','agent')
      order by created_at asc
      offset (cursor_value % member_count) limit 1;
      update organizations set round_robin_cursor=cursor_value+1 where id=new.organization_id;
    end if;
  end if;

  if selected_id is not null then
    new.assigned_to:=selected_id;
    new.owner_name:=coalesce(selected_name,'Assigned');
  end if;
  return new;
end;
$$;

drop trigger if exists leads_auto_assign on leads;
create trigger leads_auto_assign before insert on leads for each row execute function public.assign_new_lead();
