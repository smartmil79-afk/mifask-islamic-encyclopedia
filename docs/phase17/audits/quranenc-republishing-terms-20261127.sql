-- Phase 17: QuranEnc English Saheeh republishing-terms and batch-integrity audit
-- Read-only. Schema inspected 2026-11-27 21:34 Africa/Lagos:
-- public.ie_source_imports.source_manifest is JSONB; record totals are integer columns.
-- Batch start/end represent Surah ranges, not ayah ranges.
-- Official source terms reference: https://quranenc.com/en/browse/english_saheeh
-- This audit does not modify source manifests or Qur'an text.
with scoped as (
  select
    id, status, records_total, records_imported, records_skipped,
    content_hash, source_manifest,
    case when (source_manifest->'batch'->>'start') ~ '^[0-9]+$'
      then (source_manifest->'batch'->>'start')::integer end as batch_start,
    case when (source_manifest->'batch'->>'end') ~ '^[0-9]+$'
      then (source_manifest->'batch'->>'end')::integer end as batch_end
  from public.ie_source_imports
  where dataset_key = 'quran-english-saheeh'
),
completed as (
  select * from scoped where status = 'completed'
),
ordered_batches as (
  select *,
    lag(batch_end) over (order by batch_start, batch_end) as previous_end
  from completed
),
batch_stats as (
  select
    count(*) as completed_batch_rows,
    count(*) filter (where batch_start is null or batch_end is null or batch_start > batch_end) as malformed_batch_ranges,
    count(distinct (batch_start, batch_end)) as distinct_batch_ranges,
    min(batch_start) as first_surah_start,
    max(batch_end) as final_surah_end,
    sum(batch_end - batch_start + 1) as declared_surah_coverage,
    count(*) filter (
      where (previous_end is null and batch_start <> 1)
         or (previous_end is not null and batch_start <> previous_end + 1)
    ) as discontinuous_batch_boundaries,
    jsonb_agg(jsonb_build_object('start_surah', batch_start, 'end_surah', batch_end)
      order by batch_start, batch_end) as ranges
  from ordered_batches
)
select jsonb_build_object(
  'dataset_key', 'quran-english-saheeh',
  'import_version', '1.1.2',
  'manifest_rows', (select count(*) from scoped),
  'completed_manifest_rows', (select count(*) from completed),
  'failed_manifest_rows', (select count(*) from scoped where status = 'failed'),
  'failed_zero_row_attempts', (select count(*) from scoped
    where status = 'failed' and records_total = 0 and records_imported = 0 and records_skipped = 0),
  'completed_records_total', (select coalesce(sum(records_total), 0) from completed),
  'completed_records_imported', (select coalesce(sum(records_imported), 0) from completed),
  'completed_records_skipped', (select coalesce(sum(records_skipped), 0) from completed),
  'publisher_match_rows', (select count(*) from completed
    where source_manifest->>'publisher' = 'English Translation - Noor International Center'),
  'version_match_rows', (select count(*) from completed
    where source_manifest->>'version' = '1.1.2'),
  'translation_key_match_rows', (select count(*) from completed
    where source_manifest->>'translation_key' = 'english_saheeh'),
  'abbreviated_terms', (select jsonb_agg(distinct source_manifest->>'terms') from completed),
  'source_url_present_rows', (select count(*) from completed where source_manifest ? 'source_url'),
  'license_terms_url_present_rows', (select count(*) from completed where source_manifest ? 'license_terms_url'),
  'republishing_terms_present_rows', (select count(*) from completed where source_manifest ? 'republishing_terms'),
  'content_hash_present_rows', (select count(*) from completed where nullif(btrim(content_hash), '') is not null),
  'source_hash_present_rows', (select count(*) from completed
    where nullif(btrim(source_manifest->>'source_hash'), '') is not null),
  'batch_integrity', (select to_jsonb(batch_stats) from batch_stats)
) as quranenc_manifest_audit;
