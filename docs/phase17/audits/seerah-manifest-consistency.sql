-- Phase 17 read-only Seerah source-manifest consistency audit.
-- Schema inspected on 2026-11-27:
--   public.ie_source_imports(id, dataset_key, import_version, source_manifest, created_at)
--   public.ie_seerah_events(title, source_refs, source_import_id)
-- This script performs SELECTs only. It does not modify event records or manifests.
--
-- For the current seerah-quran-reference-index-v1 manifest, external_sources
-- contains the Tafsir source URLs. Compare those with event source_refs entries
-- whose kind is "tafsir"; Qur'an verse URLs (kind="quran") are intentionally
-- excluded from this comparison.

WITH selected_manifest AS (
  SELECT id, dataset_key, import_version, source_manifest
  FROM public.ie_source_imports
  WHERE dataset_key = 'seerah-quran-reference-index-v1'
    AND import_version = '1.0'
  ORDER BY created_at DESC
  LIMIT 1
),
manifest_external_urls AS (
  SELECT DISTINCT btrim(item->>'url') AS url
  FROM selected_manifest m
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(m.source_manifest->'external_sources') = 'array'
        THEN m.source_manifest->'external_sources'
      ELSE '[]'::jsonb
    END
  ) AS item
  WHERE nullif(btrim(item->>'url'), '') IS NOT NULL
),
event_tafsir_urls AS (
  SELECT e.title AS event_title, btrim(item->>'url') AS url
  FROM public.ie_seerah_events e
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(e.source_refs) = 'array' THEN e.source_refs
      ELSE '[]'::jsonb
    END
  ) AS item
  WHERE lower(coalesce(item->>'kind', '')) = 'tafsir'
    AND nullif(btrim(item->>'url'), '') IS NOT NULL
),
summary AS (
  SELECT jsonb_build_object(
    'manifest_external_sources', (SELECT count(*) FROM manifest_external_urls),
    'event_tafsir_references', (SELECT count(*) FROM event_tafsir_urls),
    'events_linked_to_manifest',
      (SELECT count(*) FROM public.ie_seerah_events e
       JOIN selected_manifest m ON e.source_import_id = m.id),
    'total_seerah_events', (SELECT count(*) FROM public.ie_seerah_events),
    'event_urls_missing_from_manifest',
      (SELECT count(*) FROM event_tafsir_urls e
       WHERE NOT EXISTS (SELECT 1 FROM manifest_external_urls m WHERE m.url = e.url)),
    'manifest_urls_not_linked_to_events',
      (SELECT count(*) FROM manifest_external_urls m
       WHERE NOT EXISTS (SELECT 1 FROM event_tafsir_urls e WHERE e.url = m.url))
  ) AS details
)
SELECT
  'summary'::text AS finding,
  NULL::text AS event_title,
  NULL::text AS url,
  details
FROM summary
UNION ALL
SELECT
  'event_tafsir_missing_from_manifest'::text AS finding,
  e.event_title,
  e.url,
  jsonb_build_object(
    'note', 'Tafsir-kind event reference is absent from the manifest external_sources array.'
  ) AS details
FROM event_tafsir_urls e
WHERE NOT EXISTS (
  SELECT 1 FROM manifest_external_urls m WHERE m.url = e.url
)
UNION ALL
SELECT
  'manifest_external_source_not_linked_to_event'::text AS finding,
  NULL::text AS event_title,
  m.url,
  jsonb_build_object(
    'note', 'Manifest external source URL is not present in any Tafsir-kind event reference.'
  ) AS details
FROM manifest_external_urls m
WHERE NOT EXISTS (
  SELECT 1 FROM event_tafsir_urls e WHERE e.url = m.url
)
ORDER BY finding, event_title NULLS FIRST, url NULLS FIRST;
