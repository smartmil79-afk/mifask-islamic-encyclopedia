-- Phase 17: Hadith source_refs JSON-object integrity audit
-- Schema-first inspection confirmed source_refs and translations are JSONB.
-- This audit deliberately treats source_refs as an object, not an array.
-- Read-only: no content, source, grading, catalogue, RLS, or permission writes.

-- AUDIT 1: actual JSON shape and collection-level content/metadata coverage.
SELECT
  collection_key,
  count(*) AS records,
  count(*) FILTER (WHERE jsonb_typeof(source_refs) = 'object') AS source_refs_objects,
  count(*) FILTER (WHERE jsonb_typeof(source_refs) <> 'object') AS source_refs_non_objects,
  count(*) FILTER (
    WHERE jsonb_typeof(translations) = 'object'
      AND jsonb_typeof(translations->'en') = 'string'
  ) AS translations_object_with_english_string,
  count(*) FILTER (WHERE jsonb_typeof(metadata) = 'object') AS metadata_objects,
  count(*) FILTER (WHERE grading = '{}'::jsonb) AS empty_grading_objects,
  count(*) FILTER (WHERE book_number IS NULL) AS missing_book_number,
  count(*) FILTER (WHERE chapter_number IS NULL) AS missing_chapter_number,
  count(*) FILTER (WHERE narrator IS NULL OR btrim(narrator) = '') AS missing_narrator,
  count(*) FILTER (WHERE arabic IS NULL OR btrim(arabic) = '') AS missing_arabic,
  count(*) FILTER (
    WHERE translations->>'en' IS NULL OR btrim(translations->>'en') = ''
  ) AS missing_english
FROM public.ie_hadiths
GROUP BY collection_key
ORDER BY collection_key;

-- AUDIT 2: verify the expected upstream repository identity, edition,
-- record number, source URL, collection manifest and source-import link.
-- dataset_key is the local MIFASK collection key; source_refs.dataset is
-- the upstream repository identifier. They are intentionally different namespaces.
SELECT
  h.collection_key,
  count(*) AS records,
  count(*) FILTER (WHERE jsonb_typeof(h.source_refs) <> 'object') AS source_refs_shape_mismatches,
  count(*) FILTER (
    WHERE h.source_refs->>'dataset' IS DISTINCT FROM
      CASE h.collection_key
        WHEN 'malik' THEN 'fawazahmed0/hadith-api'
        WHEN 'riyad' THEN 'AhmedBaset/hadith-json'
      END
  ) AS upstream_dataset_mismatches,
  count(*) FILTER (
    WHERE h.metadata->>'source_dataset' IS DISTINCT FROM
      CASE h.collection_key
        WHEN 'malik' THEN 'Fawaz Ahmed Hadith API'
        WHEN 'riyad' THEN 'AhmedBaset hadith-json'
      END
  ) AS metadata_source_label_mismatches,
  count(*) FILTER (
    WHERE h.source_refs->>'number' IS DISTINCT FROM h.hadith_number
  ) AS source_number_mismatches,
  count(*) FILTER (
    WHERE h.source_refs->>'edition' IS NULL OR btrim(h.source_refs->>'edition') = ''
  ) AS missing_record_edition,
  count(*) FILTER (
    WHERE h.source_refs->>'source_url' IS DISTINCT FROM i.source_path
  ) AS source_url_manifest_mismatches,
  count(*) FILTER (
    WHERE h.metadata->>'imported_from' IS DISTINCT FROM i.source_path
  ) AS metadata_import_url_mismatches,
  count(*) FILTER (
    WHERE h.source_import_id IS DISTINCT FROM c.source_import_id
  ) AS collection_import_link_mismatches,
  count(*) FILTER (
    WHERE h.source_refs->>'source_url' !~ '^https://'
  ) AS non_https_source_urls,
  count(DISTINCT h.source_refs->>'edition') AS distinct_editions,
  count(DISTINCT h.source_refs->>'source_url') AS distinct_source_urls
FROM public.ie_hadiths AS h
JOIN public.ie_hadith_collections AS c USING (collection_key)
LEFT JOIN public.ie_source_imports AS i ON i.id = h.source_import_id
GROUP BY h.collection_key
ORDER BY h.collection_key;

-- AUDIT 3: observed source_refs object keys and upstream chapter-id coverage.
SELECT
  h.collection_key,
  k.key AS source_ref_key,
  count(*) AS records_with_key
FROM public.ie_hadiths AS h
CROSS JOIN LATERAL jsonb_object_keys(
  CASE
    WHEN jsonb_typeof(h.source_refs) = 'object' THEN h.source_refs
    ELSE '{}'::jsonb
  END
) AS k(key)
GROUP BY h.collection_key, k.key
ORDER BY h.collection_key, k.key;

SELECT
  collection_key,
  count(*) FILTER (WHERE source_refs ? 'chapter_id') AS chapter_id_present,
  count(DISTINCT source_refs->>'chapter_id')
    FILTER (WHERE source_refs ? 'chapter_id') AS distinct_upstream_chapter_ids
FROM public.ie_hadiths
GROUP BY collection_key
ORDER BY collection_key;

-- AUDIT 4: collection and book catalogue coverage.
SELECT
  (SELECT count(*) FROM public.ie_hadith_collections) AS collection_catalogue_rows,
  (SELECT count(DISTINCT collection_key) FROM public.ie_hadiths) AS collections_with_records,
  (SELECT count(*) FROM public.ie_hadith_books) AS hadith_book_catalogue_rows,
  (SELECT count(*) FROM public.ie_hadiths WHERE book_number IS NOT NULL) AS records_with_book_number;
