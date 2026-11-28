-- Phase 17: article content and reference-text quality audit
-- Read-only. Schema was inspected before execution:
-- ie_articles.content is jsonb, reference_texts is text[],
-- ie_article_sources links article_id/source_id/citation_detail,
-- ie_categories.slug identifies editorial categories.
-- No religious content is changed or adjudicated by this audit.

-- 1. Content-array element types and blank paragraphs by category.
with article_blocks as (
  select a.id, a.slug, c.slug as category_slug, e.value,
         jsonb_typeof(e.value) as value_type,
         case when jsonb_typeof(e.value)='string'
              then btrim(e.value #>> '{}') end as paragraph
  from public.ie_articles a
  left join public.ie_categories c on c.id=a.category_id
  cross join lateral jsonb_array_elements(a.content) as e(value)
)
select coalesce(category_slug,'uncategorized') as category,
       count(distinct id)::bigint as articles,
       count(*)::bigint as content_items,
       count(*) filter (where value_type <> 'string')::bigint as non_string_items,
       count(*) filter (where value_type='string' and paragraph='')::bigint as blank_string_items
from article_blocks
group by category_slug
order by category;

-- 2. Exact paragraph duplication within an article and paragraph reuse
-- across different articles. Identical text is flagged, never deleted.
with article_blocks as (
  select a.id, a.slug, e.value,
         jsonb_typeof(e.value) as value_type,
         case when jsonb_typeof(e.value)='string'
              then btrim(e.value #>> '{}') end as paragraph
  from public.ie_articles a
  cross join lateral jsonb_array_elements(a.content) as e(value)
), within_duplicates as (
  select id, value, count(*) as occurrences
  from article_blocks
  where value_type='string' and paragraph <> ''
  group by id, value
  having count(*) > 1
), shared_across_articles as (
  select value, count(distinct id) as article_count
  from article_blocks
  where value_type='string' and paragraph <> ''
  group by value
  having count(distinct id) > 1
)
select
  (select count(*) from within_duplicates)::bigint as within_article_duplicate_groups,
  (select coalesce(sum(occurrences-1),0) from within_duplicates)::bigint as within_article_excess_entries,
  (select count(*) from shared_across_articles)::bigint as exact_paragraphs_shared_across_articles,
  (select coalesce(sum(article_count),0) from shared_across_articles)::bigint as affected_article_memberships;

-- 3. Reference-text completeness and exact duplicates within each article.
with reference_rows as (
  select a.id, a.slug, c.slug as category_slug, r.reference_text,
         btrim(r.reference_text) as trimmed_reference
  from public.ie_articles a
  left join public.ie_categories c on c.id=a.category_id
  cross join lateral unnest(a.reference_texts) as r(reference_text)
), duplicate_references as (
  select id, reference_text, count(*) as occurrences
  from reference_rows
  where trimmed_reference <> ''
  group by id, reference_text
  having count(*) > 1
)
select coalesce(category_slug,'uncategorized') as category,
       count(distinct id)::bigint as articles,
       count(*)::bigint as reference_entries,
       count(*) filter (where reference_text is null or trimmed_reference='')::bigint as blank_reference_entries,
       (select count(*) from duplicate_references d
        join public.ie_articles a2 on a2.id=d.id
        left join public.ie_categories c2 on c2.id=a2.category_id
        where coalesce(c2.slug,'uncategorized')=coalesce(reference_rows.category_slug,'uncategorized'))::bigint
        as within_article_duplicate_reference_groups
from reference_rows
group by category_slug
order by category;

-- 4. Companion-specific summary; content remains review/unverified.
select a.slug, a.status, a.verification_status,
       jsonb_array_length(a.content)::bigint as content_paragraphs,
       cardinality(a.reference_texts)::bigint as reference_text_entries,
       (select count(*) from public.ie_article_sources s where s.article_id=a.id)::bigint as linked_sources,
       (select count(*) from public.ie_article_revisions r where r.article_id=a.id)::bigint as revision_snapshots
from public.ie_articles a
join public.ie_categories c on c.id=a.category_id
where c.slug='companions'
order by a.slug;
