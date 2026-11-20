-- Mifask Encyclopedia CMS administrator access layer
create table if not exists public.ie_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'editor' check (role in ('admin','editor','reviewer')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.ie_admins enable row level security;
drop policy if exists "IE admins may view own access record" on public.ie_admins;
create policy "IE admins may view own access record" on public.ie_admins for select to authenticated using (user_id = (select auth.uid()));
grant select on public.ie_admins to authenticated;
grant all on public.ie_admins to service_role;

drop policy if exists "IE admin manage categories" on public.ie_categories;
create policy "IE admin manage categories" on public.ie_categories for all to authenticated
using (exists (select 1 from public.ie_admins x where x.user_id=(select auth.uid()) and x.active and x.role in ('admin','editor')))
with check (exists (select 1 from public.ie_admins x where x.user_id=(select auth.uid()) and x.active and x.role in ('admin','editor')));

drop policy if exists "IE admin manage articles" on public.ie_articles;
create policy "IE admin manage articles" on public.ie_articles for all to authenticated
using (exists (select 1 from public.ie_admins x where x.user_id=(select auth.uid()) and x.active and x.role in ('admin','editor','reviewer')))
with check (exists (select 1 from public.ie_admins x where x.user_id=(select auth.uid()) and x.active and x.role in ('admin','editor','reviewer')));

drop policy if exists "IE admin manage sources" on public.ie_sources;
create policy "IE admin manage sources" on public.ie_sources for all to authenticated
using (exists (select 1 from public.ie_admins x where x.user_id=(select auth.uid()) and x.active and x.role in ('admin','editor','reviewer')))
with check (exists (select 1 from public.ie_admins x where x.user_id=(select auth.uid()) and x.active and x.role in ('admin','editor','reviewer')));

drop policy if exists "IE admin manage source links" on public.ie_article_sources;
create policy "IE admin manage source links" on public.ie_article_sources for all to authenticated
using (exists (select 1 from public.ie_admins x where x.user_id=(select auth.uid()) and x.active and x.role in ('admin','editor','reviewer')))
with check (exists (select 1 from public.ie_admins x where x.user_id=(select auth.uid()) and x.active and x.role in ('admin','editor','reviewer')));

drop policy if exists "IE admins read revisions" on public.ie_article_revisions;
create policy "IE admins read revisions" on public.ie_article_revisions for select to authenticated
using (exists (select 1 from public.ie_admins x where x.user_id=(select auth.uid()) and x.active));
drop policy if exists "IE admins add revisions" on public.ie_article_revisions;
create policy "IE admins add revisions" on public.ie_article_revisions for insert to authenticated
with check (exists (select 1 from public.ie_admins x where x.user_id=(select auth.uid()) and x.active));
grant select, insert, update, delete on public.ie_categories, public.ie_articles, public.ie_sources, public.ie_article_sources to authenticated;
grant select, insert on public.ie_article_revisions to authenticated;
