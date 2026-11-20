-- Editorial verification metadata and full-text search for Mifask Islamic Encyclopedia
alter table public.ie_articles
  add column if not exists verification_status text not null default 'unverified',
  add column if not exists verified_by text,
  add column if not exists verified_at timestamptz,
  add column if not exists verification_notes text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ie_articles_verification_status_check') then
    alter table public.ie_articles add constraint ie_articles_verification_status_check
      check (verification_status in ('unverified','sources_checked','reviewed','verified'));
  end if;
end $$;

create index if not exists ie_articles_tags_gin_idx on public.ie_articles using gin(tags);
create index if not exists ie_articles_title_lower_idx on public.ie_articles using btree(lower(title));
create index if not exists ie_articles_summary_lower_idx on public.ie_articles using btree(lower(summary));

create or replace function public.ie_search_published_articles(search_query text, result_limit integer default 25)
returns table (
  id uuid, slug text, title text, summary text, content jsonb, arabic_text text,
  reading_minutes integer, tags text[], featured boolean, reference_texts text[],
  verification_status text, reviewer_name text, verified_at timestamptz,
  category_name text, category_slug text, rank real
)
language sql stable set search_path = public
as $$
  with q as (
    select nullif(trim(search_query),'') as query,
      case when nullif(trim(search_query),'') is not null
        then websearch_to_tsquery('simple', trim(search_query)) else null end as tsq
  )
  select a.id,a.slug,a.title,a.summary,a.content,a.arabic_text,a.reading_minutes,a.tags,
    a.featured,a.reference_texts,a.verification_status,a.reviewer_name,a.verified_at,
    c.name,c.slug,
    case when q.tsq is not null then ts_rank(
      to_tsvector('simple', coalesce(a.title,'') || ' ' || coalesce(a.summary,'') || ' ' || coalesce(a.content::text,'') || ' ' || coalesce(a.arabic_text,'') || ' ' || array_to_string(a.tags,' ')),
      q.tsq
    ) else 0 end::real as rank
  from public.ie_articles a
  left join public.ie_categories c on c.id=a.category_id
  cross join q
  where a.status='published'
    and (q.query is null or
      to_tsvector('simple', coalesce(a.title,'') || ' ' || coalesce(a.summary,'') || ' ' || coalesce(a.content::text,'') || ' ' || coalesce(a.arabic_text,'') || ' ' || array_to_string(a.tags,' ')) @@ q.tsq
      or a.title ilike '%'||q.query||'%'
      or coalesce(a.summary,'') ilike '%'||q.query||'%'
      or coalesce(a.arabic_text,'') ilike '%'||q.query||'%'
      or array_to_string(a.tags,' ') ilike '%'||q.query||'%'
      or array_to_string(a.reference_texts,' ') ilike '%'||q.query||'%'
    )
  order by rank desc, a.published_at desc nulls last
  limit greatest(1,least(coalesce(result_limit,25),100));
$$;
grant execute on function public.ie_search_published_articles(text,integer) to anon, authenticated;
