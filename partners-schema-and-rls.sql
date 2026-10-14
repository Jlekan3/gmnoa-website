-- GMNOA partners table and RLS policies.
-- Run this in the Supabase SQL editor before managing partners in the admin dashboard.

grant usage on schema public to anon, authenticated;

create table if not exists public.partners (
    id uuid not null default gen_random_uuid(),
    name text not null,
    website_url text,
    logo_url text,
    display_order integer not null default 10,
    is_active boolean not null default true,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint partners_pkey primary key (id),
    constraint partners_name_check check (char_length(trim(name)) between 2 and 160),
    constraint partners_display_order_check check (display_order > 0),
    constraint partners_website_url_check check (
        website_url is null
        or website_url ~* '^https?://'
    )
);

grant select on public.partners to anon, authenticated;
grant select, insert, update, delete on public.partners to authenticated;

create or replace function public.is_dashboard_user()
returns boolean
language sql
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.profiles
        where id = auth.uid()
          and role in ('super_admin', 'admin', 'editor')
    );
$$;

alter table public.partners enable row level security;

drop policy if exists "Public can read active partners" on public.partners;
drop policy if exists "Dashboard users manage partners" on public.partners;

create policy "Public can read active partners"
on public.partners
for select
to anon, authenticated
using (is_active = true);

create policy "Dashboard users manage partners"
on public.partners
for all
to authenticated
using (public.is_dashboard_user())
with check (public.is_dashboard_user());
