-- Phase 17: post-hoc devotional source lineage coverage audit
-- Read-only. Exact upstream file comparisons are documented in the companion
-- provenance report; this SQL verifies current Supabase state only.
-- No INSERT, UPDATE, DELETE, DDL, policy, grant, or import operation is present.

-- AUDIT: Adhkar table completeness and source-import linkage
SELECT
  count(*) AS total_records,
  count(DISTINCT id) AS distinct_ids,
  count(*) FILTER (WHERE source_import_id IS NOT NULL) AS source_import_linked,
  count(*) FILTER (WHERE source_import_id IS NULL) AS source_import_unlinked,
  count(*) FILTER (WHERE NULLIF(btrim(arabic), '') IS NULL) AS arabic_gaps,
  count(*) FILTER (WHERE NULLIF(btrim(translations ->> 'en'), '') IS NULL) AS english_gaps,
  count(*) FILTER (WHERE NULLIF(btrim(transliteration), '') IS NULL) AS transliteration_gaps,
  count(*) FILTER (WHERE repetition IS NULL OR repetition < 1) AS invalid_repetition,
  count(*) FILTER (WHERE jsonb_typeof(source_refs) <> 'array') AS source_refs_shape_gaps
FROM public.ie_adhkar;

-- AUDIT: Names of Allah completeness, numbering, and source-import linkage
SELECT
  count(*) AS total_records,
  count(DISTINCT number) AS distinct_numbers,
  min(number) AS minimum_number,
  max(number) AS maximum_number,
  count(*) FILTER (WHERE source_import_id IS NOT NULL) AS source_import_linked,
  count(*) FILTER (WHERE source_import_id IS NULL) AS source_import_unlinked,
  count(*) FILTER (WHERE NULLIF(btrim(arabic), '') IS NULL) AS arabic_gaps,
  count(*) FILTER (WHERE NULLIF(btrim(transliteration), '') IS NULL) AS transliteration_gaps,
  count(*) FILTER (WHERE NULLIF(btrim(meanings ->> 'en'), '') IS NULL) AS english_meaning_gaps,
  count(*) FILTER (WHERE jsonb_typeof(meanings) <> 'object') AS meanings_shape_gaps
FROM public.ie_names_of_allah;

-- AUDIT: Identify whether a formal source-import manifest already exists
-- for either pinned devotional dataset. An empty result is a provenance gap,
-- not permission to fabricate an import record.
SELECT
  id,
  source_name,
  source_site,
  source_path,
  dataset_key,
  import_version,
  status,
  records_total,
  records_imported,
  records_skipped,
  content_hash,
  source_manifest
FROM public.ie_source_imports
WHERE lower(dataset_key) IN (
  'adhkar',
  'seen-arabic-adhkar',
  'asma',
  'names-of-allah',
  'allah-names'
)
ORDER BY dataset_key, import_version, id;

-- AUDIT: Confirm current import-ledger coverage without inventing hashes
SELECT
  count(*) AS manifest_count,
  count(*) FILTER (WHERE status = 'completed') AS completed_manifests,
  count(*) FILTER (WHERE status = 'failed') AS failed_manifests,
  count(*) FILTER (WHERE content_hash IS NULL) AS missing_content_hashes,
  count(*) FILTER (WHERE NULLIF(source_manifest ->> 'source_hash', '') IS NULL) AS missing_manifest_source_hashes
FROM public.ie_source_imports;
