-- Phase 17: read-only content-to-source-import linkage audit.
-- Schema was inspected from information_schema.columns and Supabase verbose table metadata
-- before this query was run. This audit performs SELECTs only; it does not change data,
-- source manifests, revision snapshots, policies, grants, or migration history.
--
-- The QuranEnc dataset intentionally has 13 manifest rows for one dataset/version:
-- 12 completed batches plus one historical failed zero-row attempt. That is not a
-- duplicate content import. The duplicate-version group is surfaced for review, not
-- treated as an error.
--
-- Content records without source_import_id remain unlinked. Do not infer or assign
-- provenance from matching text, display names, or record order alone.

WITH imports AS (
  SELECT id, dataset_key, import_version, status, records_imported,
         source_manifest, source_name, source_site, source_path, created_at
  FROM public.ie_source_imports
),
content_links AS (
  SELECT 'quran_verses'::text AS content_type, source_import_id FROM public.ie_quran_verses
  UNION ALL SELECT 'quran_surahs', source_import_id FROM public.ie_quran_surahs
  UNION ALL SELECT 'prophets', source_import_id FROM public.ie_prophets
  UNION ALL SELECT 'seerah_events', source_import_id FROM public.ie_seerah_events
  UNION ALL SELECT 'hadith_collections', source_import_id FROM public.ie_hadith_collections
  UNION ALL SELECT 'hadith_books', source_import_id FROM public.ie_hadith_books
  UNION ALL SELECT 'hadiths', source_import_id FROM public.ie_hadiths
  UNION ALL SELECT 'duas', source_import_id FROM public.ie_duas
  UNION ALL SELECT 'adhkar', source_import_id FROM public.ie_adhkar
  UNION ALL SELECT 'names_of_allah', source_import_id FROM public.ie_names_of_allah
),
linkage AS (
  SELECT c.content_type,
         count(*) AS records,
         count(*) FILTER (WHERE c.source_import_id IS NULL) AS missing_source_import_id,
         count(*) FILTER (WHERE c.source_import_id IS NOT NULL) AS linked_records,
         count(DISTINCT c.source_import_id) FILTER (WHERE c.source_import_id IS NOT NULL) AS distinct_manifest_ids,
         count(*) FILTER (
           WHERE c.source_import_id IS NOT NULL
             AND NOT EXISTS (SELECT 1 FROM imports i WHERE i.id = c.source_import_id)
         ) AS dangling_manifest_ids
  FROM content_links c
  GROUP BY c.content_type
),
duplicate_versions AS (
  SELECT dataset_key, import_version, count(*) AS rows
  FROM imports
  GROUP BY dataset_key, import_version
  HAVING count(*) > 1
)
SELECT jsonb_pretty(jsonb_build_object(
  'import_ledger', (
    SELECT jsonb_build_object(
      'rows', count(*),
      'completed', count(*) FILTER (WHERE status = 'completed'),
      'failed', count(*) FILTER (WHERE status = 'failed'),
      'records_imported', coalesce(sum(records_imported),0),
      'duplicate_dataset_version_groups', (SELECT count(*) FROM duplicate_versions)
    )
    FROM imports
  ),
  'duplicate_dataset_versions', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'dataset_key', dataset_key,
      'import_version', import_version,
      'manifest_rows', rows
    ) ORDER BY dataset_key, import_version), '[]'::jsonb)
    FROM duplicate_versions
  ),
  'content_linkage', (
    SELECT coalesce(jsonb_agg(to_jsonb(l) ORDER BY content_type), '[]'::jsonb)
    FROM linkage l
  ),
  'manifest_catalog', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'dataset_key', dataset_key,
      'import_version', import_version,
      'status', status,
      'records_imported', records_imported,
      'source_name', source_name,
      'source_site', source_site,
      'source_path', source_path,
      'manifest_keys', (
        SELECT coalesce(jsonb_agg(k.key ORDER BY k.key), '[]'::jsonb)
        FROM jsonb_object_keys(coalesce(source_manifest,'{}'::jsonb)) AS k(key)
      )
    ) ORDER BY dataset_key, import_version, created_at), '[]'::jsonb)
    FROM imports
  )
)) AS phase17_content_source_linkage;
