-- Phase 17: editorial revision snapshot drift and source-link reconciliation audit
-- Read-only. Schema inspected on 2026-11-28:
-- ie_articles.content is jsonb; reference_texts and tags are text[];
-- ie_article_revisions.snapshot is jsonb with revision_number, changed_by,
-- change_note, created_at; ie_article_sources stores article_id/source_id.
-- Missing snapshot keys are reported separately from value differences.
-- No snapshots, authorship, citations, or editorial states are changed.

-- 1. Latest-snapshot coverage and field-presence/value-difference totals.
with latest_revision as (
  select distinct on (r.article_id)
         r.article_id, r.id as revision_id, r.revision_number,
         r.created_at, r.changed_by, r.change_note, r.snapshot
  from public.ie_article_revisions r
  order by r.article_id, r.created_at desc, r.revision_number desc, r.id
),
current_sources as (
  select s.article_id,
         coalesce(jsonb_agg(distinct s.source_id::text order by s.source_id::text),'[]'::jsonb) as source_ids
  from public.ie_article_sources s
  group by s.article_id
),
comparison as (
  select a.id, a.updated_at, r.revision_id, r.revision_number,
         r.created_at, r.changed_by, r.change_note, r.snapshot,
         coalesce(cs.source_ids,'[]'::jsonb) as current_source_ids,
         a.content, a.summary, a.reference_texts, a.tags, a.category_id,
         a.status, a.verification_status
  from public.ie_articles a
  left join latest_revision r on r.article_id=a.id
  left join current_sources cs on cs.article_id=a.id
)
select
  count(*)::bigint as total_articles,
  count(*) filter (where revision_id is not null)::bigint as articles_with_latest_snapshot,
  count(*) filter (where revision_id is null)::bigint as articles_without_snapshot,
  count(*) filter (where revision_id is not null and changed_by is null)::bigint as latest_snapshots_missing_author,
  count(*) filter (where revision_id is not null and change_note is null)::bigint as latest_snapshots_missing_change_note,
  count(*) filter (where revision_id is not null and not (snapshot ? 'source_ids'))::bigint as snapshots_without_source_ids_key,
  count(*) filter (where snapshot ? 'source_ids' and jsonb_typeof(snapshot->'source_ids') <> 'array')::bigint as source_ids_wrong_shape,
  count(*) filter (where snapshot ? 'source_ids'
    and jsonb_typeof(snapshot->'source_ids')='array'
    and coalesce((select jsonb_agg(x order by x) from jsonb_array_elements_text(snapshot->'source_ids') x),'[]'::jsonb)
        is distinct from current_source_ids)::bigint as source_id_set_differences_when_recorded,
  count(*) filter (where revision_id is not null and not (snapshot ? 'content'))::bigint as snapshots_missing_content_key,
  count(*) filter (where snapshot ? 'content' and snapshot->'content' is distinct from to_jsonb(content))::bigint as content_value_differences,
  count(*) filter (where revision_id is not null and not (snapshot ? 'summary'))::bigint as snapshots_missing_summary_key,
  count(*) filter (where snapshot ? 'summary' and snapshot->'summary' is distinct from to_jsonb(summary))::bigint as summary_value_differences,
  count(*) filter (where revision_id is not null and not (snapshot ? 'reference_texts'))::bigint as snapshots_missing_reference_texts_key,
  count(*) filter (where snapshot ? 'reference_texts' and snapshot->'reference_texts' is distinct from to_jsonb(reference_texts))::bigint as reference_text_value_differences,
  count(*) filter (where revision_id is not null and not (snapshot ? 'tags'))::bigint as snapshots_missing_tags_key,
  count(*) filter (where snapshot ? 'tags' and snapshot->'tags' is distinct from to_jsonb(tags))::bigint as tag_value_differences,
  count(*) filter (where revision_id is not null and not (snapshot ? 'category_id'))::bigint as snapshots_missing_category_key,
  count(*) filter (where snapshot ? 'category_id' and snapshot->>'category_id' is distinct from category_id::text)::bigint as category_value_differences,
  count(*) filter (where revision_id is not null and not (snapshot ? 'status'))::bigint as snapshots_missing_status_key,
  count(*) filter (where snapshot ? 'status' and snapshot->>'status' is distinct from status)::bigint as status_value_differences,
  count(*) filter (where revision_id is not null and not (snapshot ? 'verification_status'))::bigint as snapshots_missing_verification_key,
  count(*) filter (where snapshot ? 'verification_status'
    and snapshot->>'verification_status' is distinct from verification_status)::bigint as verification_value_differences,
  count(*) filter (where revision_id is not null and updated_at > created_at)::bigint as articles_updated_after_latest_snapshot
from comparison;

-- 2. Per-article drift flags. This deliberately omits article text and source IDs.
with latest_revision as (
  select distinct on (r.article_id)
         r.article_id, r.revision_number, r.created_at, r.snapshot
  from public.ie_article_revisions r
  order by r.article_id, r.created_at desc, r.revision_number desc, r.id
),
current_sources as (
  select s.article_id,
         coalesce(jsonb_agg(distinct s.source_id::text order by s.source_id::text),'[]'::jsonb) as source_ids
  from public.ie_article_sources s
  group by s.article_id
)
select a.slug, a.status, a.verification_status,
       r.revision_number, r.created_at as snapshot_created_at, a.updated_at,
       not (r.snapshot ? 'source_ids') as source_ids_not_captured,
       case when r.snapshot ? 'source_ids' and jsonb_typeof(r.snapshot->'source_ids')='array'
            then coalesce((select jsonb_agg(x order by x) from jsonb_array_elements_text(r.snapshot->'source_ids') x),'[]'::jsonb)
                 is distinct from coalesce(cs.source_ids,'[]'::jsonb)
            else null end as source_id_set_differs,
       (r.snapshot ? 'content' and r.snapshot->'content' is distinct from to_jsonb(a.content)) as content_differs,
       (r.snapshot ? 'summary' and r.snapshot->'summary' is distinct from to_jsonb(a.summary)) as summary_differs,
       (r.snapshot ? 'reference_texts' and r.snapshot->'reference_texts' is distinct from to_jsonb(a.reference_texts)) as reference_texts_differ,
       (r.snapshot ? 'tags' and r.snapshot->'tags' is distinct from to_jsonb(a.tags)) as tags_differ,
       (r.snapshot ? 'category_id' and r.snapshot->>'category_id' is distinct from a.category_id::text) as category_differs,
       (r.snapshot ? 'status' and r.snapshot->>'status' is distinct from a.status) as status_differs,
       (r.snapshot ? 'verification_status'
          and r.snapshot->>'verification_status' is distinct from a.verification_status) as verification_status_differs
from public.ie_articles a
join latest_revision r on r.article_id=a.id
left join current_sources cs on cs.article_id=a.id
where not (r.snapshot ? 'source_ids')
   or (r.snapshot ? 'source_ids' and jsonb_typeof(r.snapshot->'source_ids')='array'
       and coalesce((select jsonb_agg(x order by x) from jsonb_array_elements_text(r.snapshot->'source_ids') x),'[]'::jsonb)
           is distinct from coalesce(cs.source_ids,'[]'::jsonb))
   or (r.snapshot ? 'content' and r.snapshot->'content' is distinct from to_jsonb(a.content))
   or (r.snapshot ? 'summary' and r.snapshot->'summary' is distinct from to_jsonb(a.summary))
   or (r.snapshot ? 'reference_texts' and r.snapshot->'reference_texts' is distinct from to_jsonb(a.reference_texts))
   or (r.snapshot ? 'tags' and r.snapshot->'tags' is distinct from to_jsonb(a.tags))
   or (r.snapshot ? 'category_id' and r.snapshot->>'category_id' is distinct from a.category_id::text)
   or (r.snapshot ? 'status' and r.snapshot->>'status' is distinct from a.status)
   or (r.snapshot ? 'verification_status' and r.snapshot->>'verification_status' is distinct from a.verification_status)
order by a.slug;

-- 3. Full revision-ledger integrity, including missing authors and sequence gaps.
with per_article as (
  select article_id, count(*)::bigint as revision_count,
         count(distinct revision_number)::bigint as distinct_revision_count,
         min(revision_number) as min_revision_number,
         max(revision_number) as max_revision_number
  from public.ie_article_revisions
  group by article_id
)
select
  (select count(*) from public.ie_article_revisions)::bigint as total_revision_rows,
  (select count(*) filter (where changed_by is null) from public.ie_article_revisions)::bigint as revisions_missing_author,
  (select count(*) filter (where change_note is null) from public.ie_article_revisions)::bigint as revisions_missing_change_note,
  (select count(*) from per_article)::bigint as articles_with_revisions,
  (select count(*) from per_article
    where revision_count <> distinct_revision_count
       or min_revision_number <> 1
       or max_revision_number <> revision_count)::bigint as articles_with_revision_sequence_gaps_or_duplicates,
  (select count(*) from public.ie_articles a
    where not exists (select 1 from public.ie_article_revisions r where r.article_id=a.id))::bigint as articles_without_revisions;

-- 4. Current RLS inventory; preserve all existing policies and default-deny tables.
select count(*)::bigint as public_tables,
       count(*) filter (where rowsecurity)::bigint as public_tables_with_rls,
       count(*) filter (where left(tablename,3)='ie_')::bigint as encyclopedia_tables,
       count(*) filter (where left(tablename,3)='ie_' and rowsecurity)::bigint as encyclopedia_tables_with_rls
from pg_tables
where schemaname='public';
