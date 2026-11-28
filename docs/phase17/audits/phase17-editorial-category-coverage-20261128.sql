-- Phase 17: editorial category coverage, workflow, source-link and revision integrity.
-- Read-only audit. No content, status, revision, source, policy or schema changes.
-- Schema inspected on 2026-11-28: ie_categories, ie_articles,
-- ie_article_sources and ie_article_revisions.

-- 1) Per-category content and editorial coverage. Includes active empty categories.
WITH source_counts AS (
  SELECT article_id, count(*) AS source_count
  FROM public.ie_article_sources
  GROUP BY article_id
),
revision_counts AS (
  SELECT article_id, count(*) AS revision_count
  FROM public.ie_article_revisions
  GROUP BY article_id
)
SELECT
  c.slug AS category_slug,
  c.name AS category_name,
  c.is_active,
  count(a.id) AS article_count,
  count(a.id) FILTER (WHERE a.status = 'published') AS published_count,
  count(a.id) FILTER (WHERE a.status = 'review') AS review_count,
  count(a.id) FILTER (WHERE a.verification_status = 'verified') AS verified_count,
  count(a.id) FILTER (WHERE a.verification_status = 'unverified') AS unverified_count,
  count(a.id) FILTER (
    WHERE a.id IS NOT NULL AND coalesce(sc.source_count, 0) = 0
  ) AS articles_without_sources,
  count(a.id) FILTER (
    WHERE a.id IS NOT NULL AND coalesce(rc.revision_count, 0) = 0
  ) AS articles_without_revision_snapshots,
  coalesce(sum(coalesce(rc.revision_count, 0)), 0) AS revision_snapshot_count
FROM public.ie_categories c
LEFT JOIN public.ie_articles a ON a.category_id = c.id
LEFT JOIN source_counts sc ON sc.article_id = a.id
LEFT JOIN revision_counts rc ON rc.article_id = a.id
GROUP BY c.id, c.slug, c.name, c.is_active, c.sort_order
ORDER BY c.sort_order, c.slug;

-- 2) Editorial workflow consistency. A published/unverified article is
-- intentionally not treated as scholarly verified.
SELECT
  status,
  verification_status,
  count(*) AS article_count,
  count(*) FILTER (WHERE published_at IS NOT NULL) AS with_published_at,
  count(*) FILTER (
    WHERE verified_by IS NOT NULL OR verified_at IS NOT NULL
  ) AS with_verifier_fields
FROM public.ie_articles
GROUP BY status, verification_status
ORDER BY status, verification_status;

-- 3) Article structural coverage, without assuming a particular content JSON
-- schema beyond the observed JSONB column.
SELECT
  count(*) AS total_articles,
  count(*) FILTER (WHERE category_id IS NULL) AS uncategorized_articles,
  count(*) FILTER (
    WHERE cardinality(reference_texts) = 0
  ) AS articles_without_reference_texts,
  count(*) FILTER (
    WHERE content = '{}'::jsonb OR content = '[]'::jsonb
  ) AS empty_content_json
FROM public.ie_articles;

SELECT
  jsonb_typeof(content) AS content_json_type,
  count(*) AS article_count
FROM public.ie_articles
GROUP BY jsonb_typeof(content)
ORDER BY jsonb_typeof(content);

-- 4) Revision snapshot integrity and coverage.
SELECT
  count(*) AS total_snapshots,
  count(DISTINCT article_id) AS articles_with_snapshots,
  count(*) FILTER (
    WHERE jsonb_typeof(snapshot) <> 'object'
       OR snapshot = '{}'::jsonb
  ) AS invalid_or_empty_snapshots,
  count(*) FILTER (WHERE a.id IS NULL) AS orphan_snapshots
FROM public.ie_article_revisions r
LEFT JOIN public.ie_articles a ON a.id = r.article_id;

-- 5) Companion editorial coverage, explicitly retaining review/unverified.
WITH source_counts AS (
  SELECT article_id, count(*) AS source_count
  FROM public.ie_article_sources
  GROUP BY article_id
),
revision_counts AS (
  SELECT article_id, count(*) AS revision_count
  FROM public.ie_article_revisions
  GROUP BY article_id
)
SELECT
  count(*) AS companion_articles,
  count(*) FILTER (WHERE a.status = 'published') AS published_articles,
  count(*) FILTER (WHERE a.status = 'review') AS review_articles,
  count(*) FILTER (WHERE a.verification_status = 'verified') AS verified_articles,
  count(*) FILTER (WHERE a.verification_status = 'unverified') AS unverified_articles,
  count(*) FILTER (WHERE coalesce(sc.source_count, 0) > 0) AS with_source_links,
  count(*) FILTER (WHERE coalesce(rc.revision_count, 0) > 0) AS with_revision_snapshots,
  count(*) FILTER (WHERE coalesce(rc.revision_count, 0) = 0) AS without_revision_snapshots
FROM public.ie_articles a
JOIN public.ie_categories c ON c.id = a.category_id
LEFT JOIN source_counts sc ON sc.article_id = a.id
LEFT JOIN revision_counts rc ON rc.article_id = a.id
WHERE c.slug = 'companions';

-- 6) Duplicate article/source pairs and dangling relationship checks.
SELECT
  (
    SELECT count(*)
    FROM (
      SELECT article_id, source_id
      FROM public.ie_article_sources
      GROUP BY article_id, source_id
      HAVING count(*) > 1
    ) duplicate_pairs
  ) AS duplicate_article_source_pairs,
  (
    SELECT count(*)
    FROM public.ie_article_sources x
    LEFT JOIN public.ie_articles a ON a.id = x.article_id
    WHERE a.id IS NULL
  ) AS orphan_article_links,
  (
    SELECT count(*)
    FROM public.ie_article_sources x
    LEFT JOIN public.ie_sources s ON s.id = x.source_id
    WHERE s.id IS NULL
  ) AS orphan_source_links;
