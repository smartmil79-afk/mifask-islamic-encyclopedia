-- Phase 17 live content and provenance integrity audit.
-- Read-only SELECT; no DDL, DML, policy or grant changes.
-- Schema was inspected through Supabase verbose table inventory on 2026-11-27.
-- Important JSON shapes:
--   Qur'an English: translations->'en'->>'text' (nested object)
--   Hadith English: translations->>'en' (string)
--   Prophet references: JSON array objects with surah, ayah, url, local_reader
--   Seerah source_refs: JSON array
-- Do not infer source hashes or repair provenance from this audit alone.

WITH q AS (
  SELECT count(*) AS verses,
         count(*) FILTER (WHERE nullif(btrim(arabic), '') IS NULL) AS arabic_gaps,
         count(*) FILTER (WHERE nullif(btrim(translations->'en'->>'text'), '') IS NULL) AS english_gaps,
         count(*) FILTER (WHERE nullif(btrim(transliteration), '') IS NULL) AS transliteration_gaps,
         count(*) FILTER (WHERE audio_urls = '{}'::jsonb) AS empty_audio_objects,
         count(*) FILTER (WHERE source_import_id IS NULL) AS missing_import_links
  FROM public.ie_quran_verses
),
s AS (
  SELECT count(*) AS surahs, coalesce(sum(ayah_count), 0) AS declared_ayahs,
         count(*) FILTER (WHERE source_import_id IS NULL) AS missing_import_links
  FROM public.ie_quran_surahs
),
prophet_refs AS (
  SELECT p.id, x.value AS ref
  FROM public.ie_prophets p
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(p.quran_references) = 'array'
         THEN p.quran_references ELSE '[]'::jsonb END
  ) x(value)
),
parsed_refs AS (
  SELECT id, ref,
         CASE WHEN ref->>'surah' ~ '^[0-9]+$' THEN (ref->>'surah')::integer END AS surah_number,
         CASE WHEN ref->>'ayah' ~ '^[0-9]+$' THEN (ref->>'ayah')::integer END AS ayah_number
  FROM prophet_refs
),
checked_refs AS (
  SELECT p.*, v.surah_number AS matched_surah,
         ref->>'local_reader' AS local_reader,
         ref->>'url' AS external_url
  FROM parsed_refs p
  LEFT JOIN public.ie_quran_verses v
    ON v.surah_number = p.surah_number AND v.ayah_number = p.ayah_number
),
p AS (
  SELECT count(*) AS prophets,
         count(*) FILTER (WHERE source_import_id IS NULL) AS missing_import_links,
         coalesce(sum(CASE WHEN jsonb_typeof(quran_references) = 'array'
                           THEN jsonb_array_length(quran_references) ELSE 0 END), 0) AS reference_entries
  FROM public.ie_prophets
),
se AS (
  SELECT count(*) AS events,
         count(*) FILTER (WHERE source_import_id IS NULL) AS missing_import_links,
         count(*) FILTER (WHERE source_refs IS NULL OR jsonb_typeof(source_refs) <> 'array') AS invalid_source_ref_shapes
  FROM public.ie_seerah_events
),
h AS (
  SELECT collection_key, count(*) AS records,
         count(*) FILTER (WHERE nullif(btrim(arabic), '') IS NULL) AS arabic_gaps,
         count(*) FILTER (WHERE nullif(btrim(translations->>'en'), '') IS NULL) AS english_gaps,
         count(*) FILTER (WHERE nullif(btrim(narrator), '') IS NULL) AS narrator_gaps,
         count(*) FILTER (WHERE book_number IS NULL) AS book_number_gaps,
         count(*) FILTER (WHERE chapter_number IS NULL) AS chapter_number_gaps,
         count(*) FILTER (WHERE chapter_title IS NULL OR btrim(chapter_title) = '') AS chapter_title_gaps,
         count(*) FILTER (WHERE source_import_id IS NULL) AS missing_import_links
  FROM public.ie_hadiths
  GROUP BY collection_key
),
d AS (
  SELECT count(*) AS records,
         count(*) FILTER (WHERE nullif(btrim(transliteration), '') IS NULL) AS transliteration_gaps,
         count(*) FILTER (WHERE source_import_id IS NULL) AS missing_import_links
  FROM public.ie_duas
),
a AS (
  SELECT count(*) AS records,
         count(*) FILTER (WHERE source_import_id IS NULL) AS missing_import_links,
         count(*) FILTER (WHERE NOT (metadata ? 'type')) AS missing_type,
         count(*) FILTER (WHERE NOT (metadata ? 'explanation_of_hadith_vocabulary')) AS missing_vocabulary_field,
         count(*) FILTER (WHERE metadata->'audio_url' = 'null'::jsonb) AS audio_json_null,
         count(*) FILTER (WHERE metadata->>'audio_url' = '') AS audio_empty_string
  FROM public.ie_adhkar
),
n AS (
  SELECT count(*) AS records,
         count(*) FILTER (WHERE source_import_id IS NULL) AS missing_import_links
  FROM public.ie_names_of_allah
),
i AS (
  SELECT count(*) AS manifests,
         count(*) FILTER (WHERE status = 'completed') AS completed,
         count(*) FILTER (WHERE status = 'failed') AS failed,
         sum(coalesce(records_imported, 0)) AS imported_records,
         count(*) FILTER (WHERE content_hash IS NULL) AS missing_content_hash,
         count(*) FILTER (WHERE source_manifest->>'source_hash' IS NULL) AS missing_manifest_source_hash
  FROM public.ie_source_imports
),
ar AS (
  SELECT count(*) AS articles,
         count(*) FILTER (WHERE status = 'published') AS published,
         count(*) FILTER (WHERE verification_status = 'verified') AS verified,
         count(*) FILTER (WHERE verification_status = 'unverified') AS unverified
  FROM public.ie_articles
),
rev AS (
  SELECT count(*) AS revisions,
         count(*) FILTER (WHERE snapshot IS NULL
                           OR jsonb_typeof(snapshot) <> 'object'
                           OR snapshot = '{}'::jsonb) AS invalid_snapshots
  FROM public.ie_article_revisions
),
src AS (
  SELECT count(*) AS sources,
         count(*) FILTER (WHERE url IS NULL) AS url_less,
         count(*) FILTER (WHERE url IS NOT NULL AND url !~ '^https://') AS non_https
  FROM public.ie_sources
),
links AS (
  SELECT count(*) AS links,
         count(*) FILTER (WHERE a.id IS NULL OR s.id IS NULL) AS orphan_links
  FROM public.ie_article_sources x
  LEFT JOIN public.ie_articles a ON a.id = x.article_id
  LEFT JOIN public.ie_sources s ON s.id = x.source_id
)
SELECT jsonb_build_object(
  'quran', (SELECT to_jsonb(q) FROM q),
  'surahs', (SELECT to_jsonb(s) FROM s),
  'prophets', (SELECT to_jsonb(p) FROM p),
  'prophet_reference_integrity', jsonb_build_object(
    'reference_entries', (SELECT count(*) FROM checked_refs),
    'malformed_numeric_references', (SELECT count(*) FROM checked_refs
      WHERE surah_number IS NULL OR ayah_number IS NULL
         OR surah_number NOT BETWEEN 1 AND 114 OR ayah_number < 1),
    'missing_local_verses', (SELECT count(*) FROM checked_refs WHERE matched_surah IS NULL),
    'local_reader_path_mismatches', (SELECT count(*) FROM checked_refs
      WHERE local_reader IS DISTINCT FROM '/quran?surah=' || surah_number || '&ayah=' || ayah_number),
    'quran_url_mismatches', (SELECT count(*) FROM checked_refs
      WHERE external_url IS DISTINCT FROM 'https://quran.com/' || surah_number || '/' || ayah_number)
  ),
  'seerah', (SELECT to_jsonb(se) FROM se),
  'hadith', (SELECT jsonb_agg(to_jsonb(h) ORDER BY collection_key) FROM h),
  'duas', (SELECT to_jsonb(d) FROM d),
  'adhkar', (SELECT to_jsonb(a) FROM a),
  'names_of_allah', (SELECT to_jsonb(n) FROM n),
  'imports', (SELECT to_jsonb(i) FROM i),
  'articles', (SELECT to_jsonb(ar) FROM ar),
  'revisions', (SELECT to_jsonb(rev) FROM rev),
  'sources', (SELECT to_jsonb(src) FROM src),
  'article_source_links', (SELECT to_jsonb(links) FROM links),
  'public_rls_coverage', jsonb_build_object(
    'public_tables', (SELECT count(*) FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
      WHERE ns.nspname = 'public' AND c.relkind = 'r'),
    'public_tables_rls', (SELECT count(*) FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
      WHERE ns.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity),
    'ie_tables', (SELECT count(*) FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
      WHERE ns.nspname = 'public' AND c.relkind = 'r' AND c.relname LIKE 'ie_%'),
    'ie_tables_rls', (SELECT count(*) FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
      WHERE ns.nspname = 'public' AND c.relkind = 'r' AND c.relname LIKE 'ie_%' AND c.relrowsecurity)
  ),
  'adhkar_and_import_policies', jsonb_build_object(
    'ie_adhkar', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'name', policyname, 'roles', roles, 'command', cmd, 'using', qual, 'with_check', with_check
    ) ORDER BY policyname), '[]'::jsonb) FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'ie_adhkar'),
    'ie_source_imports', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'name', policyname, 'roles', roles, 'command', cmd, 'using', qual, 'with_check', with_check
    ) ORDER BY policyname), '[]'::jsonb) FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'ie_source_imports')
  )
) AS phase17_live_integrity_audit;
