-- Phase 17 read-only content coverage and provenance audit.
-- Schema inspected directly on 2026-11-27 in Supabase project honsqapwikfghoubwhcf.
-- Verified columns:
-- ie_quran_verses.translations JSONB (English text at translations->'en'->>'text')
-- ie_hadiths.translations JSONB (English string at translations->>'en')
-- ie_source_imports.source_manifest JSONB; ie_seerah_events.source_refs JSONB.
-- This script contains SELECT statements only. It does not write content,
-- alter provenance, change policies, or apply migrations.

WITH
q AS (
  SELECT count(*) AS total,
         count(*) FILTER (WHERE nullif(btrim(arabic), '') IS NULL) AS arabic_gaps,
         count(*) FILTER (WHERE nullif(btrim(translations->'en'->>'text'), '') IS NULL) AS english_gaps,
         count(*) FILTER (
           WHERE nullif(btrim(translations->'en'->>'edition'), '') IS NULL
              OR nullif(btrim(translations->'en'->>'version'), '') IS NULL
              OR nullif(btrim(translations->'en'->>'publisher'), '') IS NULL
              OR nullif(btrim(translations->'en'->>'source_url'), '') IS NULL
         ) AS edition_metadata_gaps,
         count(*) FILTER (WHERE nullif(btrim(transliteration), '') IS NULL) AS transliteration_gaps,
         count(*) FILTER (WHERE audio_urls IS NULL OR audio_urls = '{}'::jsonb) AS empty_audio_objects,
         count(*) FILTER (WHERE source_import_id IS NULL) AS missing_import_links
  FROM public.ie_quran_verses
),
s AS (
  SELECT count(*) AS total, coalesce(sum(ayah_count), 0) AS ayah_sum,
         count(*) FILTER (WHERE source_import_id IS NULL) AS missing_import_links
  FROM public.ie_quran_surahs
),
p AS (
  SELECT count(*) AS total,
         count(*) FILTER (WHERE nullif(btrim(story), '') IS NULL) AS story_gaps,
         count(*) FILTER (WHERE lessons IS NULL OR lessons = '[]'::jsonb) AS lesson_gaps,
         count(*) FILTER (WHERE source_import_id IS NULL) AS missing_import_links,
         coalesce(sum(jsonb_array_length(
           CASE WHEN jsonb_typeof(quran_references) = 'array'
                THEN quran_references ELSE '[]'::jsonb END
         )), 0) AS reference_entries
  FROM public.ie_prophets
),
se AS (
  SELECT count(*) AS total,
         count(*) FILTER (WHERE nullif(btrim(description), '') IS NULL) AS description_gaps,
         count(*) FILTER (WHERE source_import_id IS NULL) AS missing_import_links
  FROM public.ie_seerah_events
),
d AS (
  SELECT count(*) AS total,
         count(*) FILTER (WHERE nullif(btrim(transliteration), '') IS NULL) AS transliteration_gaps,
         count(*) FILTER (WHERE source_import_id IS NULL) AS missing_import_links
  FROM public.ie_duas
),
a AS (
  SELECT count(*) AS total,
         count(*) FILTER (WHERE source_import_id IS NULL) AS missing_import_links,
         count(*) FILTER (WHERE metadata->>'type' IS NULL) AS type_gaps,
         count(*) FILTER (
           WHERE metadata->>'explanation_of_hadith_vocabulary' IS NULL
         ) AS vocabulary_gaps
  FROM public.ie_adhkar
),
n AS (
  SELECT count(*) AS total,
         count(*) FILTER (WHERE source_import_id IS NULL) AS missing_import_links,
         count(*) FILTER (
           WHERE metadata->>'source_commit' IS NULL
             AND metadata->>'source_version' IS NULL
         ) AS missing_source_markers
  FROM public.ie_names_of_allah
),
h AS (
  SELECT collection_key, count(*) AS total,
         count(*) FILTER (WHERE nullif(btrim(arabic), '') IS NULL) AS arabic_gaps,
         count(*) FILTER (WHERE nullif(btrim(translations->>'en'), '') IS NULL) AS english_gaps,
         count(*) FILTER (WHERE nullif(btrim(narrator), '') IS NULL) AS narrator_gaps,
         count(*) FILTER (WHERE book_number IS NULL) AS book_number_gaps
  FROM public.ie_hadiths
  GROUP BY collection_key
),
m AS (
  SELECT count(*) AS total,
         count(*) FILTER (WHERE content_hash IS NULL) AS missing_content_hashes,
         count(*) FILTER (
           WHERE nullif(source_manifest->>'source_hash', '') IS NULL
         ) AS missing_source_hashes,
         coalesce(sum(records_imported), 0) AS records_imported
  FROM public.ie_source_imports
),
seerah_manifest AS (
  SELECT id, source_manifest
  FROM public.ie_source_imports
  WHERE dataset_key = 'seerah-quran-reference-index-v1'
    AND import_version = '1.0'
  ORDER BY created_at DESC
  LIMIT 1
),
manifest_urls AS (
  SELECT DISTINCT btrim(item->>'url') AS url
  FROM seerah_manifest sm
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(sm.source_manifest->'external_sources') = 'array'
         THEN sm.source_manifest->'external_sources'
         ELSE '[]'::jsonb END
  ) AS item
  WHERE nullif(btrim(item->>'url'), '') IS NOT NULL
),
event_urls AS (
  SELECT e.title, btrim(item->>'url') AS url
  FROM public.ie_seerah_events e
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(e.source_refs) = 'array'
         THEN e.source_refs ELSE '[]'::jsonb END
  ) AS item
  WHERE lower(coalesce(item->>'kind', '')) = 'tafsir'
    AND nullif(btrim(item->>'url'), '') IS NOT NULL
)
SELECT 'quran'::text AS metric, to_jsonb(q) AS value FROM q
UNION ALL SELECT 'surahs', to_jsonb(s) FROM s
UNION ALL SELECT 'prophets', to_jsonb(p) FROM p
UNION ALL SELECT 'seerah', to_jsonb(se) FROM se
UNION ALL SELECT 'duas', to_jsonb(d) FROM d
UNION ALL SELECT 'adhkar', to_jsonb(a) FROM a
UNION ALL SELECT 'names_of_allah', to_jsonb(n) FROM n
UNION ALL SELECT 'hadith_' || collection_key, to_jsonb(h) FROM h
UNION ALL SELECT 'imports', to_jsonb(m) FROM m
UNION ALL
SELECT 'seerah_manifest_reconciliation',
       jsonb_build_object(
         'manifest_external_url_count', (SELECT count(*) FROM manifest_urls),
         'event_tafsir_url_count', (SELECT count(*) FROM event_urls),
         'event_urls_missing_from_manifest',
           (SELECT count(*) FROM event_urls e
            WHERE NOT EXISTS (SELECT 1 FROM manifest_urls u WHERE u.url = e.url)),
         'manifest_urls_not_in_events',
           (SELECT count(*) FROM manifest_urls u
            WHERE NOT EXISTS (SELECT 1 FROM event_urls e WHERE e.url = u.url)),
         'missing_urls',
           (SELECT coalesce(jsonb_agg(jsonb_build_object('event', e.title, 'url', e.url)), '[]'::jsonb)
            FROM event_urls e
            WHERE NOT EXISTS (SELECT 1 FROM manifest_urls u WHERE u.url = e.url))
       );


-- Editorial source-link, revision-snapshot, and collection-catalogue integrity.
-- These checks are read-only and intentionally do not promote verification status.
WITH article_state AS (
  SELECT count(*) AS total,
         count(*) FILTER (WHERE status = 'published') AS published,
         count(*) FILTER (WHERE status = 'review') AS review,
         count(*) FILTER (WHERE verification_status = 'verified') AS verified,
         count(*) FILTER (WHERE verification_status = 'unverified') AS unverified
  FROM public.ie_articles
),
source_state AS (
  SELECT count(*) AS total,
         count(*) FILTER (WHERE url ~ '^https://') AS https_urls,
         count(*) FILTER (WHERE url IS NULL) AS intentional_or_other_null_urls,
         count(*) FILTER (WHERE nullif(btrim(citation), '') IS NULL) AS citation_gaps,
         count(*) FILTER (WHERE nullif(btrim(reliability_note), '') IS NULL) AS reliability_gaps,
         (SELECT count(*) FROM (
           SELECT lower(url) AS normalized_url
           FROM public.ie_sources WHERE url IS NOT NULL
           GROUP BY lower(url) HAVING count(*) > 1
         ) duplicates) AS duplicate_urls
  FROM public.ie_sources
),
link_state AS (
  SELECT count(*) AS total,
         count(*) FILTER (WHERE a.id IS NULL) AS orphan_article_links,
         count(*) FILTER (WHERE s.id IS NULL) AS orphan_source_links,
         (SELECT count(*) FROM (
           SELECT article_id, source_id
           FROM public.ie_article_sources
           GROUP BY article_id, source_id HAVING count(*) > 1
         ) duplicates) AS duplicate_pairs
  FROM public.ie_article_sources l
  LEFT JOIN public.ie_articles a ON a.id = l.article_id
  LEFT JOIN public.ie_sources s ON s.id = l.source_id
),
revision_state AS (
  SELECT count(*) AS total,
         count(*) FILTER (
           WHERE snapshot IS NULL OR jsonb_typeof(snapshot) <> 'object' OR snapshot = '{}'::jsonb
         ) AS invalid_snapshots,
         count(*) FILTER (WHERE a.id IS NULL) AS orphan_article_revisions
  FROM public.ie_article_revisions r
  LEFT JOIN public.ie_articles a ON a.id = r.article_id
),
hadith_catalogue AS (
  SELECT
    (SELECT count(*) FROM public.ie_hadith_collections) AS collections,
    (SELECT count(*) FROM public.ie_hadith_collections WHERE source_import_id IS NULL) AS collections_missing_import_links,
    (SELECT count(*) FROM public.ie_hadith_books) AS books,
    (SELECT count(*) FROM public.ie_hadith_books WHERE source_import_id IS NULL) AS books_missing_import_links,
    (SELECT count(*) FROM public.ie_hadiths) AS hadith_records
)
SELECT 'editorial_state' AS metric, to_jsonb(article_state) AS value FROM article_state
UNION ALL SELECT 'source_state', to_jsonb(source_state) FROM source_state
UNION ALL SELECT 'article_source_links', to_jsonb(link_state) FROM link_state
UNION ALL SELECT 'revision_state', to_jsonb(revision_state) FROM revision_state
UNION ALL SELECT 'hadith_catalogue', to_jsonb(hadith_catalogue) FROM hadith_catalogue;
