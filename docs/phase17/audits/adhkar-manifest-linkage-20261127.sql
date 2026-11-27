-- Phase 17 Adhkar manifest-linkage and RLS audit (read-only).
-- Schema inspected 2026-11-27 with verbose public table inventory:
-- public.ie_adhkar has id, category, repetition, source_refs JSONB,
-- metadata JSONB, source_import_id UUID; public.ie_source_imports has
-- source_name, source_site, source_path, dataset_key, source_manifest JSONB.
-- Do not insert a manifest or alter source_import_id based on this audit alone.

WITH adhkar_rows AS (
  SELECT id, metadata->>'source_dataset' AS source_dataset,
         metadata->>'source_order' AS source_order, source_import_id
  FROM public.ie_adhkar
),
candidate_manifests AS (
  SELECT id, source_name, source_site, source_path, dataset_key,
         import_version, status
  FROM public.ie_source_imports
  WHERE source_name ILIKE '%adhkar%'
     OR dataset_key ILIKE '%adhkar%'
     OR source_site ILIKE '%Seen-Arabic%'
     OR source_path ILIKE '%Seen-Arabic%'
     OR coalesce(source_manifest::text, '') ILIKE '%Seen-Arabic/Morning-And-Evening-Adhkar-DB%'
),
source_import_fk AS (
  SELECT conname, pg_get_constraintdef(oid) AS definition
  FROM pg_constraint
  WHERE conrelid = 'public.ie_adhkar'::regclass AND contype = 'f'
),
relevant_policies AS (
  SELECT tablename, policyname, roles, cmd, qual, with_check
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('ie_adhkar', 'ie_source_imports')
)
SELECT jsonb_build_object(
  'adhkar_records', (
    SELECT jsonb_build_object(
      'records', count(*),
      'distinct_source_orders', count(DISTINCT source_order),
      'missing_source_order', count(*) FILTER (WHERE nullif(btrim(source_order), '') IS NULL),
      'source_datasets', coalesce(
        (SELECT jsonb_agg(dataset ORDER BY dataset)
         FROM (SELECT DISTINCT source_dataset AS dataset FROM adhkar_rows WHERE source_dataset IS NOT NULL) d),
        '[]'::jsonb
      ),
      'linked_records', count(*) FILTER (WHERE source_import_id IS NOT NULL),
      'unlinked_records', count(*) FILTER (WHERE source_import_id IS NULL)
    )
    FROM adhkar_rows
  ),
  'candidate_manifest_count', (SELECT count(*) FROM candidate_manifests),
  'candidate_manifests', coalesce(
    (SELECT jsonb_agg(to_jsonb(m) ORDER BY m.dataset_key, m.import_version) FROM candidate_manifests m),
    '[]'::jsonb
  ),
  'source_import_foreign_keys', coalesce(
    (SELECT jsonb_agg(to_jsonb(f) ORDER BY f.conname) FROM source_import_fk f),
    '[]'::jsonb
  ),
  'rls_policies', coalesce(
    (SELECT jsonb_agg(to_jsonb(p) ORDER BY p.tablename, p.policyname) FROM relevant_policies p),
    '[]'::jsonb
  )
) AS adhkar_manifest_linkage_evidence;
