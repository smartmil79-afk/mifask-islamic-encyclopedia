-- Phase 17: Qur'an audio storage and source-manifest provenance audit.
-- Read-only. Schema inspected on 2026-11-28:
-- ie_quran_verses.audio_urls jsonb NOT NULL;
-- ie_quran_verses.translations jsonb NOT NULL;
-- ie_quran_verses.transliteration text NULL;
-- ie_source_imports.source_manifest jsonb NOT NULL;
-- ie_source_imports.content_hash text NULL.
-- Correct QuranEnc English path: translations->'en'->>'text'.

with quran as (
  select
    count(*) as verse_count,
    count(*) filter (where nullif(btrim(transliteration), '') is null) as transliteration_gaps,
    count(*) filter (where jsonb_typeof(audio_urls) is distinct from 'object') as audio_non_object_rows,
    count(*) filter (where jsonb_typeof(audio_urls) = 'object' and audio_urls = '{}'::jsonb) as audio_empty_object_rows,
    count(*) filter (where jsonb_typeof(audio_urls) = 'object' and audio_urls <> '{}'::jsonb) as audio_populated_object_rows,
    count(*) filter (where jsonb_typeof(translations->'en') is distinct from 'object') as english_shape_gaps,
    count(*) filter (where nullif(btrim(translations->'en'->>'text'), '') is null) as english_text_gaps,
    count(*) filter (
      where nullif(btrim(translations->'en'->>'edition'), '') is null
         or nullif(btrim(translations->'en'->>'version'), '') is null
         or nullif(btrim(translations->'en'->>'publisher'), '') is null
         or nullif(btrim(translations->'en'->>'source_url'), '') is null
    ) as english_provenance_gaps
  from public.ie_quran_verses
),
imports as (
  select
    count(*) as quran_related_import_manifests,
    count(*) filter (where nullif(btrim(content_hash), '') is not null) as manifests_with_content_hash,
    count(*) filter (where nullif(source_manifest->>'source_url','') is not null) as manifests_with_source_url,
    count(*) filter (where nullif(source_manifest->>'license_terms_url','') is not null) as manifests_with_license_terms_url,
    count(*) filter (where nullif(source_manifest->>'republishing_terms','') is not null) as manifests_with_republishing_terms,
    count(*) filter (where nullif(source_manifest->>'terms','') is not null) as manifests_with_generic_terms,
    jsonb_agg(jsonb_build_object(
      'dataset_key', dataset_key,
      'import_version', import_version,
      'status', status,
      'records_total', records_total,
      'records_imported', records_imported,
      'records_skipped', records_skipped
    ) order by created_at) as manifest_rows
  from public.ie_source_imports
  where dataset_key ilike '%quran%' or source_name ilike '%quran%'
)
select jsonb_build_object(
  'quran_verse_audio_translation_audit', (select to_jsonb(quran) from quran),
  'quran_source_import_audit', (select to_jsonb(imports) from imports)
) as audit;
