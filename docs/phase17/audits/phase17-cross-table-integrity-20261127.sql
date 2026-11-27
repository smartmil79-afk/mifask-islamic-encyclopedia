-- Phase 17 cross-table integrity regression audit (2026-11-27).
-- Read-only. Run after schema inspection. Does not mutate religious content,
-- source manifests, verification status, policies, grants, or migrations.

WITH hadith_key_groups AS (
  SELECT collection_key, hadith_number, count(*) AS row_count
  FROM public.ie_hadiths
  GROUP BY collection_key, hadith_number
),
hadith_keys AS (
  SELECT count(*) FILTER (WHERE row_count > 1) AS duplicate_key_groups,
         coalesce(sum(row_count - 1) FILTER (WHERE row_count > 1), 0) AS duplicate_rows
  FROM hadith_key_groups
),
prophet_refs AS (
  SELECT p.id AS prophet_id, r.ref
  FROM public.ie_prophets p
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(p.quran_references) = 'array'
         THEN p.quran_references ELSE '[]'::jsonb END
  ) AS r(ref)
),
prophet_ref_integrity AS (
  SELECT count(DISTINCT prophet_id) AS prophets,
         count(ref) AS reference_entries,
         count(ref) FILTER (
           WHERE coalesce(ref->>'surah', '') !~ '^[0-9]+$'
              OR coalesce(ref->>'ayah', '') !~ '^[0-9]+$'
         ) AS malformed_numeric_references,
         count(ref) FILTER (WHERE v.surah_number IS NULL) AS missing_local_verses
  FROM prophet_refs r
  LEFT JOIN public.ie_quran_verses v
    ON v.surah_number = CASE
         WHEN coalesce(r.ref->>'surah', '') ~ '^[0-9]+$'
         THEN (r.ref->>'surah')::integer ELSE -1 END
   AND v.ayah_number = CASE
         WHEN coalesce(r.ref->>'ayah', '') ~ '^[0-9]+$'
         THEN (r.ref->>'ayah')::integer ELSE -1 END
),
seerah_integrity AS (
  SELECT count(*) AS events,
         count(*) FILTER (WHERE source_import_id IS NOT NULL) AS linked_events,
         count(*) FILTER (WHERE source_import_id IS NULL) AS unlinked_events,
         count(*) FILTER (WHERE jsonb_typeof(source_refs) = 'array') AS source_refs_arrays,
         count(*) FILTER (
           WHERE source_refs IS NOT NULL AND jsonb_typeof(source_refs) <> 'array'
         ) AS malformed_source_refs
  FROM public.ie_seerah_events
),
manifest_integrity AS (
  SELECT count(*) AS manifests,
         count(*) FILTER (WHERE jsonb_typeof(source_manifest) = 'object') AS object_manifests,
         count(*) FILTER (WHERE source_manifest IS NULL) AS null_manifests,
         count(*) FILTER (
           WHERE source_manifest IS NOT NULL
             AND jsonb_typeof(source_manifest) <> 'object'
         ) AS non_object_manifests
  FROM public.ie_source_imports
),
article_link_integrity AS (
  SELECT count(*) AS links,
         count(*) FILTER (WHERE a.id IS NULL) AS orphan_article_links,
         count(*) FILTER (WHERE s.id IS NULL) AS orphan_source_links,
         (SELECT count(*) FROM (
            SELECT article_id, source_id
            FROM public.ie_article_sources
            GROUP BY article_id, source_id
            HAVING count(*) > 1
          ) d) AS duplicate_pairs
  FROM public.ie_article_sources l
  LEFT JOIN public.ie_articles a ON a.id = l.article_id
  LEFT JOIN public.ie_sources s ON s.id = l.source_id
),
revision_integrity AS (
  SELECT count(*) AS snapshots,
         count(*) FILTER (
           WHERE snapshot IS NULL
              OR jsonb_typeof(snapshot) <> 'object'
              OR snapshot = '{}'::jsonb
         ) AS invalid_snapshots,
         count(*) FILTER (WHERE a.id IS NULL) AS orphan_revisions
  FROM public.ie_article_revisions r
  LEFT JOIN public.ie_articles a ON a.id = r.article_id
),
rls_integrity AS (
  SELECT count(*) AS public_tables,
         count(*) FILTER (WHERE c.relrowsecurity) AS public_rls_enabled,
         count(*) FILTER (WHERE c.relname LIKE 'ie\_%' ESCAPE '\') AS ie_tables,
         count(*) FILTER (
           WHERE c.relname LIKE 'ie\_%' ESCAPE '\' AND c.relrowsecurity
         ) AS ie_rls_enabled
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
)
SELECT 'hadith_key_integrity' AS metric, to_jsonb(hadith_keys) AS value FROM hadith_keys
UNION ALL SELECT 'prophet_reference_integrity', to_jsonb(prophet_ref_integrity) FROM prophet_ref_integrity
UNION ALL SELECT 'seerah_integrity', to_jsonb(seerah_integrity) FROM seerah_integrity
UNION ALL SELECT 'source_manifest_integrity', to_jsonb(manifest_integrity) FROM manifest_integrity
UNION ALL SELECT 'article_source_integrity', to_jsonb(article_link_integrity) FROM article_link_integrity
UNION ALL SELECT 'revision_integrity', to_jsonb(revision_integrity) FROM revision_integrity
UNION ALL SELECT 'rls_integrity', to_jsonb(rls_integrity) FROM rls_integrity;
