-- Phase 17 import provenance metadata audit (2026-11-27).
-- Read-only. Inspect public.ie_source_imports schema before execution.
-- This reports manifest-field coverage; it does not infer corpus rights from
-- a repository/package license and does not modify source manifests or content.

WITH manifests AS (
  SELECT
    dataset_key,
    status,
    content_hash,
    coalesce(source_manifest, '{}'::jsonb) AS source_manifest,
    source_name,
    source_site,
    source_path,
    import_version,
    records_total,
    records_imported,
    records_skipped
  FROM public.ie_source_imports
),
field_coverage AS (
  SELECT
    count(*) AS manifests,
    count(*) FILTER (WHERE nullif(btrim(content_hash), '') IS NOT NULL) AS nonempty_content_hashes,
    count(*) FILTER (WHERE nullif(btrim(source_manifest->>'source_hash'), '') IS NOT NULL) AS nonempty_source_hashes,
    count(*) FILTER (WHERE nullif(btrim(source_manifest->>'license'), '') IS NOT NULL) AS nonempty_license_values,
    count(*) FILTER (WHERE nullif(btrim(source_manifest->>'license_url'), '') IS NOT NULL) AS nonempty_license_urls,
    count(*) FILTER (WHERE nullif(btrim(source_manifest->>'license_terms_url'), '') IS NOT NULL) AS nonempty_license_terms_urls,
    count(*) FILTER (WHERE nullif(btrim(source_manifest->>'republishing_terms'), '') IS NOT NULL) AS nonempty_republishing_terms,
    count(*) FILTER (WHERE nullif(btrim(source_manifest->>'terms'), '') IS NOT NULL) AS nonempty_terms,
    count(*) FILTER (WHERE nullif(btrim(source_manifest->>'version'), '') IS NOT NULL) AS nonempty_manifest_versions,
    count(*) FILTER (WHERE nullif(btrim(source_manifest->>'source_url'), '') IS NOT NULL) AS nonempty_source_urls,
    count(*) FILTER (WHERE nullif(btrim(source_manifest->>'source_revision'), '') IS NOT NULL) AS nonempty_source_revisions,
    count(*) FILTER (WHERE nullif(btrim(source_manifest->>'source_commit'), '') IS NOT NULL) AS nonempty_source_commits,
    count(*) FILTER (WHERE jsonb_typeof(source_manifest) = 'object') AS object_manifests
  FROM manifests
),
dataset_status AS (
  SELECT
    dataset_key,
    status,
    count(*) AS manifest_count,
    coalesce(sum(records_total), 0) AS records_total,
    coalesce(sum(records_imported), 0) AS records_imported,
    coalesce(sum(records_skipped), 0) AS records_skipped
  FROM manifests
  GROUP BY dataset_key, status
),
source_types AS (
  SELECT
    source_type,
    count(*) AS source_records,
    count(*) FILTER (WHERE url IS NULL) AS null_url_records,
    count(*) FILTER (WHERE url IS NOT NULL AND url !~* '^https://') AS non_https_records
  FROM public.ie_sources
  GROUP BY source_type
)
SELECT
  'manifest_field_coverage' AS metric,
  to_jsonb(field_coverage) AS evidence
FROM field_coverage
UNION ALL
SELECT
  'dataset_status_coverage',
  coalesce(jsonb_agg(to_jsonb(dataset_status) ORDER BY dataset_key, status), '[]'::jsonb)
FROM dataset_status
UNION ALL
SELECT
  'source_type_coverage',
  coalesce(jsonb_agg(to_jsonb(source_types) ORDER BY source_type), '[]'::jsonb)
FROM source_types;
