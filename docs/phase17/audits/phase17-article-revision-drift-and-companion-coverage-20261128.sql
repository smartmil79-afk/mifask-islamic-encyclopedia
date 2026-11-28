-- Phase 17: article revision drift and Companion editorial coverage
-- Read-only audit. Schema was inspected in information_schema.columns on 2026-11-28.
-- No DDL, DML, policy, grant, or migration operations are included.

-- 1. Revision coverage by editorial category.
with revision_counts as (
  select article_id, count(*) as revision_count
  from public.ie_article_revisions
  group by article_id
)
select
  c.slug as category_slug,
  count(a.id) as article_count,
  count(*) filter (where coalesce(rc.revision_count, 0) = 0) as articles_without_revisions,
  count(*) filter (where a.verification_status <> 'verified') as unverified_articles
from public.ie_articles a
left join public.ie_categories c on c.id = a.category_id
left join revision_counts rc on rc.article_id = a.id
group by c.slug
order by c.slug;

-- 2. Latest-snapshot integrity and possible article/snapshot drift.
with latest_revision as (
  select distinct on (r.article_id)
    r.article_id,
    r.id as revision_id,
    r.revision_number,
    r.created_at as revision_created_at,
    r.changed_by,
    r.change_note,
    r.snapshot
  from public.ie_article_revisions r
  order by r.article_id, r.revision_number desc, r.created_at desc
)
select
  count(a.id) as articles,
  count(*) filter (where lr.revision_id is null) as articles_without_revisions,
  count(*) filter (
    where lr.revision_id is not null and a.updated_at > lr.revision_created_at
  ) as articles_updated_after_latest_snapshot,
  count(*) filter (
    where lr.revision_id is not null and lr.changed_by is null
  ) as latest_snapshots_missing_author,
  count(*) filter (
    where lr.revision_id is not null and nullif(btrim(lr.change_note), '') is null
  ) as latest_snapshots_missing_change_note,
  count(*) filter (
    where lr.revision_id is not null and jsonb_typeof(lr.snapshot) <> 'object'
  ) as latest_snapshots_non_object,
  count(*) filter (
    where lr.revision_id is not null and lr.snapshot = '{}'::jsonb
  ) as latest_snapshots_empty
from public.ie_articles a
left join latest_revision lr on lr.article_id = a.id;

-- 3. Field-level differences between each article and its latest snapshot.
-- Differences are review indicators, not proof of an unauthorized change.
with latest_revision as (
  select distinct on (r.article_id)
    r.article_id,
    r.revision_number,
    r.created_at as revision_created_at,
    r.changed_by,
    r.snapshot
  from public.ie_article_revisions r
  order by r.article_id, r.revision_number desc, r.created_at desc
)
select
  a.slug,
  a.status as current_status,
  lr.snapshot ->> 'status' as snapshot_status,
  a.updated_at as current_updated_at,
  lr.revision_created_at as latest_snapshot_at,
  lr.revision_number,
  (lr.snapshot ->> 'title') is distinct from a.title as title_differs,
  (lr.snapshot ->> 'summary') is distinct from a.summary as summary_differs,
  (lr.snapshot -> 'content') is distinct from a.content as content_differs,
  (lr.snapshot ->> 'verification_status') is distinct from a.verification_status
    as verification_status_differs,
  (lr.snapshot -> 'reference_texts') is distinct from to_jsonb(a.reference_texts)
    as reference_texts_differ,
  (lr.snapshot -> 'source_ids') is distinct from coalesce(
    (
      select jsonb_agg(s.source_id::text order by s.source_id::text)
      from public.ie_article_sources s
      where s.article_id = a.id
    ),
    '[]'::jsonb
  ) as source_ids_differ,
  lr.changed_by is not null as latest_snapshot_has_author
from public.ie_articles a
join latest_revision lr on lr.article_id = a.id
where a.updated_at > lr.revision_created_at
   or (lr.snapshot ->> 'status') is distinct from a.status
   or (lr.snapshot -> 'reference_texts') is distinct from to_jsonb(a.reference_texts)
   or (lr.snapshot -> 'source_ids') is distinct from coalesce(
     (
       select jsonb_agg(s.source_id::text order by s.source_id::text)
       from public.ie_article_sources s
       where s.article_id = a.id
     ),
     '[]'::jsonb
   )
order by a.slug;

-- 4. Articles without any revision snapshot, grouped for editorial remediation.
select
  a.slug,
  a.title,
  c.slug as category_slug,
  a.status,
  a.verification_status,
  a.updated_at
from public.ie_articles a
left join public.ie_categories c on c.id = a.category_id
left join public.ie_article_revisions r on r.article_id = a.id
where r.article_id is null
order by c.slug, a.slug;

-- 5. Focused review of the published-but-unverified Hadith overview.
-- This query intentionally does not create or rewrite a revision.
with latest_revision as (
  select distinct on (r.article_id)
    r.article_id,
    r.revision_number,
    r.created_at as revision_created_at,
    r.changed_by,
    r.snapshot
  from public.ie_article_revisions r
  join public.ie_articles a on a.id = r.article_id
  where a.slug = 'hadith-what-is-hadith'
  order by r.article_id, r.revision_number desc, r.created_at desc
)
select
  a.slug,
  a.status as current_status,
  lr.snapshot ->> 'status' as snapshot_status,
  a.verification_status,
  a.updated_at as current_updated_at,
  lr.revision_created_at as latest_snapshot_at,
  lr.revision_number,
  cardinality(a.reference_texts) as current_reference_count,
  case
    when jsonb_typeof(lr.snapshot -> 'reference_texts') = 'array'
    then jsonb_array_length(lr.snapshot -> 'reference_texts')
    else null
  end as snapshot_reference_count,
  (lr.snapshot -> 'content') is distinct from a.content as content_differs,
  lr.snapshot -> 'source_ids' as snapshot_source_ids,
  (
    select jsonb_agg(jsonb_build_object(
      'title', src.title,
      'url', src.url,
      'citation', src.citation,
      'citation_detail', lnk.citation_detail
    ) order by src.title)
    from public.ie_article_sources lnk
    join public.ie_sources src on src.id = lnk.source_id
    where lnk.article_id = a.id
  ) as current_source_links
from public.ie_articles a
join latest_revision lr on lr.article_id = a.id
where a.slug = 'hadith-what-is-hadith';
