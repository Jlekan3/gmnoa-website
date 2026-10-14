-- GMNOA recommended Supabase RLS policies.
-- Review in Supabase SQL editor before running in production.

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

grant select on public.team_members to anon, authenticated;
grant select on public.blog_posts to anon, authenticated;
grant select on public.events to anon, authenticated;
grant select on public.mentorship_programs to anon, authenticated;
grant select on public.site_settings to anon, authenticated;
grant select on public.partners to anon, authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.team_members to authenticated;
grant select, insert, update, delete on public.blog_posts to authenticated;
grant select, insert, update, delete on public.events to authenticated;
grant select, insert, update, delete on public.membership_applications to authenticated;
grant select, insert, update, delete on public.mentorship_programs to authenticated;
grant select, insert, update, delete on public.contact_messages to authenticated;
grant select, insert, update, delete on public.site_settings to authenticated;
grant select, insert, update, delete on public.partners to authenticated;

grant insert on public.membership_applications to anon;
grant insert on public.contact_messages to anon;
create table if not exists public.audit_logs (
    id uuid not null default gen_random_uuid(),
    table_name text not null,
    record_id text,
    action text not null,
    metadata jsonb not null default '{}'::jsonb,
    actor_id uuid,
    created_at timestamp with time zone not null default now(),
    constraint audit_logs_pkey primary key (id),
    constraint audit_logs_actor_id_fkey foreign key (actor_id) references public.profiles(id)
);

grant select, insert on public.audit_logs to authenticated;

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

alter table public.profiles enable row level security;
alter table public.team_members enable row level security;
alter table public.blog_posts enable row level security;
alter table public.events enable row level security;
alter table public.membership_applications enable row level security;
alter table public.mentorship_programs enable row level security;
alter table public.contact_messages enable row level security;
alter table public.site_settings enable row level security;
alter table public.partners enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Dashboard users can manage profiles" on public.profiles;
drop policy if exists "Public can read active team members" on public.team_members;
drop policy if exists "Dashboard users manage team members" on public.team_members;
drop policy if exists "Public can read published blog posts" on public.blog_posts;
drop policy if exists "Dashboard users manage blog posts" on public.blog_posts;
drop policy if exists "Public can read visible events" on public.events;
drop policy if exists "Dashboard users manage events" on public.events;
drop policy if exists "Anyone can submit membership applications" on public.membership_applications;
drop policy if exists "Dashboard users manage membership applications" on public.membership_applications;
drop policy if exists "Public can read active mentorship programs" on public.mentorship_programs;
drop policy if exists "Dashboard users manage mentorship programs" on public.mentorship_programs;
drop policy if exists "Anyone can submit valid contact messages" on public.contact_messages;
drop policy if exists "Dashboard users manage contact messages" on public.contact_messages;
drop policy if exists "Public can read site settings" on public.site_settings;
drop policy if exists "Dashboard users manage site settings" on public.site_settings;
drop policy if exists "Public can read active partners" on public.partners;
drop policy if exists "Dashboard users manage partners" on public.partners;
drop policy if exists "Dashboard users can read audit logs" on public.audit_logs;
drop policy if exists "Dashboard users can create audit logs" on public.audit_logs;
drop policy if exists "Public can view GMNOA images" on storage.objects;
drop policy if exists "Dashboard users can upload GMNOA images" on storage.objects;
drop policy if exists "Dashboard users can update GMNOA images" on storage.objects;
drop policy if exists "Dashboard users can delete GMNOA images" on storage.objects;

create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "Dashboard users can manage profiles"
on public.profiles
for all
to authenticated
using (public.is_dashboard_user())
with check (public.is_dashboard_user());

create policy "Public can read active team members"
on public.team_members
for select
to anon, authenticated
using (is_active = true);

create policy "Dashboard users manage team members"
on public.team_members
for all
to authenticated
using (public.is_dashboard_user())
with check (public.is_dashboard_user());

create policy "Public can read published blog posts"
on public.blog_posts
for select
to anon, authenticated
using (status = 'published');

create policy "Dashboard users manage blog posts"
on public.blog_posts
for all
to authenticated
using (public.is_dashboard_user())
with check (public.is_dashboard_user());

create policy "Public can read visible events"
on public.events
for select
to anon, authenticated
using (status in ('upcoming', 'ongoing', 'completed'));

create policy "Dashboard users manage events"
on public.events
for all
to authenticated
using (public.is_dashboard_user())
with check (public.is_dashboard_user());

create policy "Anyone can submit membership applications"
on public.membership_applications
for insert
to anon, authenticated
with check (true);

create policy "Dashboard users manage membership applications"
on public.membership_applications
for all
to authenticated
using (public.is_dashboard_user())
with check (public.is_dashboard_user());

create policy "Public can read active mentorship programs"
on public.mentorship_programs
for select
to anon, authenticated
using (status = 'active');

create policy "Dashboard users manage mentorship programs"
on public.mentorship_programs
for all
to authenticated
using (public.is_dashboard_user())
with check (public.is_dashboard_user());

create policy "Anyone can submit valid contact messages"
on public.contact_messages
for insert
to anon, authenticated
with check (
    char_length(trim(full_name)) between 2 and 120
    and email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    and char_length(trim(subject)) between 2 and 160
    and char_length(trim(message)) between 10 and 4000
);

create policy "Dashboard users manage contact messages"
on public.contact_messages
for all
to authenticated
using (public.is_dashboard_user())
with check (public.is_dashboard_user());

create policy "Public can read site settings"
on public.site_settings
for select
to anon, authenticated
using (true);

create policy "Dashboard users manage site settings"
on public.site_settings
for all
to authenticated
using (public.is_dashboard_user())
with check (public.is_dashboard_user());

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

create policy "Dashboard users can read audit logs"
on public.audit_logs
for select
to authenticated
using (public.is_dashboard_user());

create policy "Dashboard users can create audit logs"
on public.audit_logs
for insert
to authenticated
with check (public.is_dashboard_user());

create policy "Public can view GMNOA images"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'gmnoa-images');

create policy "Dashboard users can upload GMNOA images"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'gmnoa-images'
    and public.is_dashboard_user()
);

create policy "Dashboard users can update GMNOA images"
on storage.objects
for update
to authenticated
using (
    bucket_id = 'gmnoa-images'
    and public.is_dashboard_user()
)
with check (
    bucket_id = 'gmnoa-images'
    and public.is_dashboard_user()
);

create policy "Dashboard users can delete GMNOA images"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'gmnoa-images'
    and public.is_dashboard_user()
);
