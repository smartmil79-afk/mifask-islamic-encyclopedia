-- Phase 17 source-manifest and Hadith collection-key audit.
-- Read-only SELECT statements; no DDL, DML, policy or grant changes.
-- Schema was re-inspected on 2026-11-27 with Supabase verbose table inventory.
-- Important actual shapes:
--   ie_source_imports.source_manifest is jsonb object.
--   ie_hadiths.translations->>'en' is a string.
--   Hadith collection keys must be read from ie_hadith_collections;
--   current keys are not inferred from display names.

WITH imports AS (
  SELECT id, source_name, source_site, source_path, dataset_key, import_version,
         status, records_total, records_imported, records_skipped, content_hash,
         source_manifest
  FROM public.ie_source_imports
),
by_dataset AS (
  SELECT dataset_key,
         count(*) AS manifest_rows,
         count(*) FILTER (WHERE status = 'completed') AS completed_rows,
         count(*) FILTER (WHERE status = 'failed') AS failed_rows,
         coalesce(sum(records_imported), 0) AS records_imported,
         coalesce(sum(records_skipped), 0) AS records_skipped,
         count(*) FILTER (WHERE content_hash IS NULL) AS missing_content_hash,
         count(*) FILTER (WHERE source_manifest->>'source_hash' IS NULL
                            OR btrim(coalesce(source_manifest->>'source_hash','')) = '') AS missing_manifest_source_hash,
         count(*) FILTER (WHERE source_manifest ? 'source_url') AS source_url_rows,
         count(*) FILTER (WHERE source_manifest ? 'license_terms_url') AS license_terms_url_rows,
         count(*) FILTER (WHERE source_manifest ? 'terms') AS terms_rows,
         count(*) FILTER (WHERE source_manifest ? 'republishing_terms') AS republishing_terms_rows,
         count(*) FILTER (WHERE source_manifest->>'source_url' ~ '[0-9a-f]{40}') AS immutable_sha_in_source_url_rows,
         count(*) FILTER (WHERE source_manifest ? 'batch') AS batch_rows,
         count(*) FILTER (WHERE source_manifest ? 'publisher') AS publisher_rows
  FROM imports
  GROUP BY dataset_key
),
hadith_by_collection AS (
  SELECT c.collection_key,
         c.name AS collection_name,
         count(h.collection_key) AS records,
         count(h.collection_key) FILTER (WHERE nullif(btrim(h.arabic),'') IS NULL) AS arabic_gaps,
         count(h.collection_key) FILTER (WHERE nullif(btrim(h.translations->>'en'),'') IS NULL) AS english_gaps,
         count(h.collection_key) FILTER (WHERE nullif(btrim(h.narrator),'') IS NULL) AS narrator_gaps,
         count(h.collection_key) FILTER (WHERE h.book_number IS NULL) AS book_number_gaps,
         count(h.collection_key) FILTER (WHERE h.chapter_number IS NULL) AS chapter_number_gaps,
         count(h.collection_key) FILTER (WHERE nullif(btrim(h.chapter_title),'') IS NULL) AS chapter_title_gaps,
         (c.source_import_id IS NULL) AS collection_import_link_missing
  FROM public.ie_hadith_collections c
  LEFT JOIN public.ie_hadiths h ON h.collection_key = c.collection_key
  GROUP BY c.collection_key, c.name, c.source_import_id
),
manifest_details AS (
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'dataset_key', dataset_key,
    'source_name', source_name,
    'import_version', import_version,
    'status', status,
    'records_imported', records_imported,
    'manifest_keys', (
      SELECT coalesce(jsonb_agg(k ORDER BY k), '[]'::jsonb)
      FROM jsonb_object_keys(source_manifest) AS k
    ),
    'source_url', source_manifest->>'source_url',
    'source_hash', source_manifest->>'source_hash',
    'license_terms_url', source_manifest->>'license_terms_url',
    'terms_present', nullif(btrim(source_manifest->>'terms'),'') IS NOT NULL,
    'republishing_terms_present', nullif(btrim(source_manifest->>'republishing_terms'),'') IS NOT NULL,
    'nested_arabic_audit_commit', source_manifest->'arabic_completeness_audit'->>'source_commit',
    'nested_english_audit_commit', source_manifest->'english_completeness_audit'->>'source_commit'
  ) ORDER BY dataset_key, import_version, status), '[]'::jsonb) AS rows
  FROM imports
),
duplicate_hadith_keys AS (
  SELECT count(*) AS duplicate_keys
  FROM (
    SELECT collection_key, hadith_number
    FROM public.ie_hadiths
    GROUP BY collection_key, hadith_number
    HAVING count(*) > 1
  ) d
)
SELECT jsonb_build_object(
  'import_totals', (
    SELECT jsonb_build_object(
      'manifest_rows', count(*),
      'completed_rows', count(*) FILTER (WHERE status='completed'),
      'failed_rows', count(*) FILTER (WHERE status='failed'),
      'records_imported', coalesce(sum(records_imported),0),
      'records_skipped', coalesce(sum(records_skipped),0),
      'missing_content_hash', count(*) FILTER (WHERE content_hash IS NULL),
      'missing_manifest_source_hash', count(*) FILTER (
        WHERE source_manifest->>'source_hash' IS NULL
           OR btrim(coalesce(source_manifest->>'source_hash','')) = ''
      )
    ) FROM imports
  ),
  'by_dataset', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY dataset_key),'[]'::jsonb) FROM by_dataset x),
  'manifest_details', (SELECT rows FROM manifest_details),
  'hadith_collections', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY collection_key),'[]'::jsonb) FROM hadith_by_collection x),
  'hadith_books', (SELECT count(*) FROM public.ie_hadith_books),
  'duplicate_hadith_keys', (SELECT duplicate_keys FROM duplicate_hadith_keys)
) AS phase17_source_manifest_and_hadith_audit;
