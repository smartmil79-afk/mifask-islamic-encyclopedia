-- Privacy-preserving aggregated analytics for Mifask Islamic Encyclopedia
create table if not exists public.ie_analytics_daily (
  day date not null default current_date,
  event_type text not null check (event_type in ('article_view','search')),
  article_slug text,
  event_count bigint not null default 0 check (event_count >= 0),
  primary key(day,event_type,article_slug)
);
alter table public.ie_analytics_daily enable row level security;
drop policy if exists "IE admins read analytics" on public.ie_analytics_daily;
create policy "IE admins read analytics" on public.ie_analytics_daily
for select to authenticated using (
  exists(select 1 from public.ie_admins x where x.user_id=(select auth.uid()) and x.active)
);
grant select on public.ie_analytics_daily to authenticated;
revoke all on public.ie_analytics_daily from anon;

create or replace function public.ie_record_analytics(event_kind text, article_slug text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if event_kind not in ('article_view','search') then return; end if;
  if event_kind='article_view' then
    if article_slug is null or not exists(select 1 from public.ie_articles a where a.slug=article_slug and a.status='published') then return; end if;
  else
    article_slug := null;
  end if;
  insert into public.ie_analytics_daily(day,event_type,article_slug,event_count)
  values(current_date,event_kind,article_slug,1)
  on conflict(day,event_type,article_slug)
  do update set event_count=public.ie_analytics_daily.event_count+1;
end;
$$;
revoke all on function public.ie_record_analytics(text,text) from public;
grant execute on function public.ie_record_analytics(text,text) to anon,authenticated;
