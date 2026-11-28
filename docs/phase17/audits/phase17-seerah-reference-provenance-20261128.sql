-- Phase 17: Seerah reference-index provenance audit
-- Date: 2026-11-28
-- Scope: public.ie_seerah_events, public.ie_source_imports,
--        public.ie_quran_verses
-- READ ONLY. No INSERT, UPDATE, DELETE, DDL, grants, or policy changes.
--
-- Important provenance rule:
-- A QuranEnc import_id identifies imported Quran verse/translation data.
-- It must not be assigned to a Seerah reference-index row merely because
-- that row points at a local Quran verse. Seerah record provenance belongs
-- to the MIFASK Seerah reference-index import, where one exists.

-- 1. Event classification, narrative/chronology completeness, and review state.
SELECT
  count(*) AS seerah_event_rows,
  count(*) FILTER (WHERE source_import_id IS NOT NULL) AS linked_source_imports,
  count(*) FILTER (WHERE source_import_id IS NULL) AS unlinked_source_imports,
  count(*) FILTER (WHERE metadata->>'entry_type' = 'quranic_event_reference_index_only') AS reference_index_only_rows,
  count(*) FILTER (WHERE metadata->>'narrative_status' = 'not_provided') AS narrative_not_provided_rows,
  count(*) FILTER (WHERE metadata->>'chronology_status' = 'not_provided') AS chronology_not_provided_rows,
  count(*) FILTER (WHERE metadata->>'editorial_status' = 'needs_editorial_review') AS editorial_review_rows,
  count(*) FILTER (WHERE metadata->>'verification_status' = 'not_scholarly_verified') AS not_scholarly_verified_rows
FROM public.ie_seerah_events;

-- 2. Resolve every non-null Seerah source_import_id to its exact manifest.
SELECT
  count(*) AS linked_event_rows,
  count(*) FILTER (WHERE i.id IS NULL) AS dangling_import_references,
  count(*) FILTER (
    WHERE i.dataset_key = 'seerah-quran-reference-index-v1'
      AND i.status = 'completed'
      AND i.records_imported = 3
  ) AS linked_to_completed_seerah_index_manifest,
  count(*) FILTER (
    WHERE i.dataset_key = 'quran-english-saheeh'
  ) AS incorrectly_linked_directly_to_quranenc_batches,
  count(*) FILTER (
    WHERE i.id IS NOT NULL
      AND i.dataset_key <> 'seerah-quran-reference-index-v1'
  ) AS linked_to_other_dataset
FROM public.ie_seerah_events e
LEFT JOIN public.ie_source_imports i ON i.id = e.source_import_id
WHERE e.source_import_id IS NOT NULL;

-- 3. Validate each Quran-kind reference against the canonical local verse
--    and the stored local-reader route. Non-Quran references are excluded.
WITH quran_refs AS (
  SELECT
    e.id AS event_id,
    r.ref,
    CASE WHEN (r.ref->>'surah') ~ '^[0-9]+$'
      THEN (r.ref->>'surah')::integer END AS surah_number,
    CASE WHEN (r.ref->>'ayah') ~ '^[0-9]+$'
      THEN (r.ref->>'ayah')::integer END AS ayah_number
  FROM public.ie_seerah_events e
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(e.source_refs) = 'array'
      THEN e.source_refs ELSE '[]'::jsonb END
  ) AS r(ref)
  WHERE r.ref->>'kind' = 'quran'
)
SELECT
  count(*) AS quran_reference_rows,
  count(*) FILTER (WHERE surah_number IS NULL OR ayah_number IS NULL) AS invalid_numeric_reference_rows,
  count(*) FILTER (WHERE v.surah_number IS NULL) AS missing_local_quran_verses,
  count(*) FILTER (
    WHERE coalesce(ref->>'local_reader','') <>
      '/quran?surah=' || surah_number::text || '&ayah=' || ayah_number::text
  ) AS local_reader_route_mismatches,
  count(*) FILTER (
    WHERE coalesce(ref->>'url','') !~
      '^https://quran[.]com/[0-9]+/[0-9]+/?$'
  ) AS noncanonical_quran_url_shapes
FROM quran_refs r
LEFT JOIN public.ie_quran_verses v
  ON v.surah_number = r.surah_number
 AND v.ayah_number = r.ayah_number;

-- 4. Per-event evidence inventory. This makes unlinked rows explicit without
--    manufacturing or assigning source provenance.
SELECT
  e.id,
  e.title,
  count(*) FILTER (WHERE r.ref->>'kind' = 'quran') AS quran_reference_count,
  count(*) FILTER (WHERE r.ref->>'kind' = 'tafsir') AS tafsir_reference_count,
  e.source_import_id,
  i.dataset_key AS linked_dataset_key,
  i.import_version AS linked_import_version,
  e.metadata->>'narrative_status' AS narrative_status,
  e.metadata->>'chronology_status' AS chronology_status,
  e.metadata->>'editorial_status' AS editorial_status,
  e.metadata->>'verification_status' AS verification_status
FROM public.ie_seerah_events e
LEFT JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(e.source_refs) = 'array'
    THEN e.source_refs ELSE '[]'::jsonb END
) AS r(ref) ON true
LEFT JOIN public.ie_source_imports i ON i.id = e.source_import_id
GROUP BY e.id, e.title, e.source_import_id, i.dataset_key, i.import_version,
         e.metadata
ORDER BY e.id;

-- 5. Source-reference kind inventory; reference counts are not narrative counts.
SELECT
  r.ref->>'kind' AS reference_kind,
  count(*) AS reference_rows
FROM public.ie_seerah_events e
CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(e.source_refs) = 'array'
    THEN e.source_refs ELSE '[]'::jsonb END
) AS r(ref)
GROUP BY r.ref->>'kind'
ORDER BY r.ref->>'kind';
