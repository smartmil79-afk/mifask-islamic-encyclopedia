-- Phase 17: Seerah, Adhkar, Qur'anic Dua and Names of Allah provenance integrity
-- Read-only audit. No data, schema, policy, grant, or migration changes.
-- Execute each SELECT independently in Supabase SQL editor.

-- 1) Confirm actual JSON shapes before interpreting source references.
SELECT 'seerah' AS library, count(*) AS records,
       count(*) FILTER (WHERE jsonb_typeof(source_refs)='array') AS source_refs_arrays,
       count(*) FILTER (WHERE jsonb_typeof(metadata)='object') AS metadata_objects
FROM public.ie_seerah_events
UNION ALL
SELECT 'adhkar', count(*),
       count(*) FILTER (WHERE jsonb_typeof(source_refs)='array'),
       count(*) FILTER (WHERE jsonb_typeof(metadata)='object')
FROM public.ie_adhkar
UNION ALL
SELECT 'duas', count(*),
       count(*) FILTER (WHERE jsonb_typeof(translations)='object'),
       count(*) FILTER (WHERE jsonb_typeof(metadata)='object')
FROM public.ie_duas
UNION ALL
SELECT 'names_of_allah', count(*),
       count(*) FILTER (WHERE jsonb_typeof(meanings)='object'),
       count(*) FILTER (WHERE jsonb_typeof(metadata)='object')
FROM public.ie_names_of_allah;

-- 2) Seerah reference-index integrity: preserve array order and distinguish Qur'an from tafsir.
WITH refs AS (
  SELECT e.id AS event_id, r.ref, r.ordinality
  FROM public.ie_seerah_events e
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(e.source_refs)='array' THEN e.source_refs ELSE '[]'::jsonb END
  ) WITH ORDINALITY AS r(ref, ordinality)
),
quran_refs AS (
  SELECT event_id, ref, ordinality,
         CASE WHEN (ref->>'surah') ~ '^[0-9]+$' THEN (ref->>'surah')::integer END AS surah_no,
         CASE WHEN (ref->>'ayah') ~ '^[0-9]+$' THEN (ref->>'ayah')::integer END AS ayah_no
  FROM refs
  WHERE jsonb_typeof(ref)='object' AND ref->>'kind'='quran'
)
SELECT
  (SELECT count(*) FROM public.ie_seerah_events) AS events,
  (SELECT count(*) FROM refs) AS total_reference_entries,
  (SELECT count(*) FROM refs WHERE jsonb_typeof(ref)='object') AS object_entries,
  (SELECT count(*) FROM refs WHERE ref->>'kind'='quran') AS quran_entries,
  (SELECT count(*) FROM refs WHERE ref->>'kind'='tafsir') AS tafsir_entries,
  (SELECT count(*) FROM refs WHERE jsonb_typeof(ref)='object' AND (ref->>'url' IS NULL OR btrim(ref->>'url')='')) AS object_entries_without_url,
  (SELECT count(*) FROM quran_refs q
    LEFT JOIN public.ie_quran_verses v
      ON v.surah_number=q.surah_no AND v.ayah_number=q.ayah_no
    WHERE q.surah_no IS NULL OR q.ayah_no IS NULL OR v.surah_number IS NULL) AS quran_refs_without_local_verse,
  (SELECT count(*) FROM quran_refs q
    WHERE q.ref->>'local_reader' IS DISTINCT FROM
      ('/quran?surah='||q.surah_no||'&ayah='||q.ayah_no)) AS quran_local_reader_mismatches,
  (SELECT count(*) FROM (
    SELECT event_id, ref FROM refs GROUP BY event_id, ref HAVING count(*)>1
  ) d) AS duplicate_reference_groups;

-- 3) Adhkar: source_refs are arrays of text quotations, not structured URL objects.
WITH refs AS (
  SELECT a.id, r.ref
  FROM public.ie_adhkar a
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(a.source_refs)='array' THEN a.source_refs ELSE '[]'::jsonb END
  ) AS r(ref)
)
SELECT
  count(*) AS records,
  count(*) FILTER (WHERE jsonb_typeof(source_refs)='array') AS source_ref_arrays,
  count(*) FILTER (WHERE source_import_id IS NULL) AS missing_source_import_links,
  count(*) FILTER (WHERE metadata->>'source_dataset' IS NOT NULL AND btrim(metadata->>'source_dataset')<>'') AS source_dataset_attributed,
  count(*) FILTER (WHERE metadata->>'source_book' IS NOT NULL AND btrim(metadata->>'source_book')<>'') AS source_book_attributed,
  count(*) FILTER (WHERE metadata->>'source_review_status' IS NOT NULL) AS review_status_present,
  (SELECT count(*) FROM refs WHERE jsonb_typeof(ref)='string') AS text_reference_entries,
  (SELECT count(*) FROM refs WHERE jsonb_typeof(ref)='string' AND btrim(ref#>>'{}')='') AS empty_text_reference_entries,
  (SELECT count(*) FROM (
    SELECT id, ref FROM refs GROUP BY id, ref HAVING count(*)>1
  ) d) AS duplicate_reference_groups,
  (SELECT string_agg(DISTINCT metadata->>'source_dataset', '; ' ORDER BY metadata->>'source_dataset')
   FROM public.ie_adhkar) AS source_dataset_labels
FROM public.ie_adhkar;

-- 4) Dua Qur'an-reference integrity and translation provenance.
WITH refs AS (
  SELECT id,
         CASE WHEN (metadata->'quran_reference'->>'surah') ~ '^[0-9]+$'
              THEN (metadata->'quran_reference'->>'surah')::integer END AS surah_no,
         CASE WHEN (metadata->'quran_reference'->>'ayah') ~ '^[0-9]+$'
              THEN (metadata->'quran_reference'->>'ayah')::integer END AS ayah_no
  FROM public.ie_duas
)
SELECT
  count(*) AS records,
  count(*) FILTER (WHERE jsonb_typeof(d.metadata->'quran_reference')='object') AS quran_reference_objects,
  count(*) FILTER (WHERE d.translations->'en'->>'text' IS NOT NULL AND btrim(d.translations->'en'->>'text')<>'') AS english_text_present,
  count(*) FILTER (WHERE d.translations->'en'->>'edition'='english_saheeh'
                    AND d.translations->'en'->>'version'='1.1.2') AS quranenc_edition_tagged,
  count(*) FILTER (WHERE d.transliteration IS NULL OR btrim(d.transliteration)='') AS transliteration_missing,
  count(*) FILTER (WHERE d.source_import_id IS NULL) AS missing_source_import_links,
  (SELECT count(*) FROM refs r
    LEFT JOIN public.ie_quran_verses v
      ON v.surah_number=r.surah_no AND v.ayah_number=r.ayah_no
    WHERE r.surah_no IS NULL OR r.ayah_no IS NULL OR v.surah_number IS NULL) AS unresolved_local_quran_references
FROM public.ie_duas d;

-- 5) Names of Allah: record source attribution is not the same as a source-import manifest link.
SELECT
  count(*) AS records,
  count(*) FILTER (WHERE source_import_id IS NULL) AS missing_source_import_links,
  count(*) FILTER (WHERE metadata->>'source' IS NOT NULL AND btrim(metadata->>'source')<>'') AS source_attributed,
  count(*) FILTER (WHERE metadata->>'review_status' IS NOT NULL) AS review_status_present,
  count(DISTINCT metadata->>'source') AS distinct_source_labels,
  string_agg(DISTINCT metadata->>'source', '; ' ORDER BY metadata->>'source') AS source_labels
FROM public.ie_names_of_allah;

-- 6) Exact manifest identity check for devotional datasets; no fuzzy auto-linking.
WITH labels AS (
  SELECT DISTINCT metadata->>'source_dataset' AS label, 'adhkar' AS library
  FROM public.ie_adhkar
  WHERE metadata->>'source_dataset' IS NOT NULL
  UNION
  SELECT DISTINCT metadata->>'source' AS label, 'names_of_allah' AS library
  FROM public.ie_names_of_allah
  WHERE metadata->>'source' IS NOT NULL
)
SELECT l.library, l.label,
       count(i.id) FILTER (
         WHERE i.dataset_key=l.label OR i.source_name=l.label
            OR i.source_path=l.label OR i.source_site=l.label
       ) AS exact_manifest_matches
FROM labels l
LEFT JOIN public.ie_source_imports i ON (
  i.dataset_key=l.label OR i.source_name=l.label
  OR i.source_path=l.label OR i.source_site=l.label
)
GROUP BY l.library,l.label
ORDER BY l.library,l.label;
