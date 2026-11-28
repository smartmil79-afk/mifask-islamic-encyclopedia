-- Phase 17: source-manifest and editorial revision integrity audit
-- Created 2026-11-28. Read-only. Schema was inspected before execution.
-- No content, provenance, revision, migration, RLS, or permission writes are performed.

-- AUDIT 1: top-level source_manifest key coverage across all import manifests.
SELECT key, count(*) AS manifests_with_key
FROM public.ie_source_imports AS i
CROSS JOIN LATERAL jsonb_object_keys(i.source_manifest) AS k(key)
GROUP BY key
ORDER BY key;

-- AUDIT 2: dataset-level manifest, checksum, URL, and rights-field coverage.
SELECT
  dataset_key,
  import_version,
  status,
  count(*) AS manifest_rows,
  sum(records_total) AS records_total,
  sum(records_imported) AS records_imported,
  sum(records_skipped) AS records_skipped,
  count(*) FILTER (WHERE content_hash IS NULL) AS content_hash_nulls,
  count(*) FILTER (WHERE source_manifest ? 'source_hash') AS source_hash_key_rows,
  count(*) FILTER (WHERE source_manifest->>'source_hash' IS NOT NULL) AS source_hash_value_rows,
  count(*) FILTER (WHERE source_manifest ? 'source_url') AS source_url_key_rows,
  count(*) FILTER (WHERE source_manifest->>'source_url' IS NOT NULL) AS source_url_value_rows,
  count(*) FILTER (WHERE source_manifest ? 'license_terms_url') AS license_terms_url_key_rows,
  count(*) FILTER (WHERE source_manifest->>'license_terms_url' IS NOT NULL) AS license_terms_url_value_rows,
  count(*) FILTER (WHERE source_manifest ? 'republishing_terms') AS republishing_terms_key_rows,
  count(*) FILTER (WHERE source_manifest->>'republishing_terms' IS NOT NULL) AS republishing_terms_value_rows,
  count(*) FILTER (WHERE source_manifest ? 'terms') AS generic_terms_key_rows
FROM public.ie_source_imports
GROUP BY dataset_key, import_version, status
ORDER BY dataset_key, import_version, status;

-- AUDIT 3: revision snapshot coverage and audit metadata.
WITH per_article AS (
  SELECT
    a.id,
    a.slug,
    count(r.id)::integer AS revision_rows,
    count(DISTINCT r.revision_number)::integer AS distinct_revision_numbers,
    min(r.revision_number) AS min_revision,
    max(r.revision_number) AS max_revision,
    count(*) FILTER (
      WHERE r.id IS NOT NULL AND jsonb_typeof(r.snapshot) <> 'object'
    )::integer AS non_object_snapshots,
    count(*) FILTER (
      WHERE r.id IS NOT NULL AND (r.snapshot = '{}'::jsonb OR r.snapshot = 'null'::jsonb)
    )::integer AS empty_snapshots
  FROM public.ie_articles AS a
  LEFT JOIN public.ie_article_revisions AS r ON r.article_id = a.id
  GROUP BY a.id, a.slug
)
SELECT
  count(*) AS articles_total,
  count(*) FILTER (WHERE revision_rows = 0) AS articles_without_revisions,
  count(*) FILTER (WHERE revision_rows > 0) AS articles_with_revisions,
  sum(revision_rows) AS revision_rows_total,
  count(*) FILTER (WHERE revision_rows <> distinct_revision_numbers) AS duplicate_revision_number_articles,
  count(*) FILTER (
    WHERE revision_rows > 0 AND max_revision - min_revision + 1 <> distinct_revision_numbers
  ) AS revision_sequence_gap_articles,
  sum(non_object_snapshots) AS non_object_snapshots,
  sum(empty_snapshots) AS empty_snapshots
FROM per_article;

-- AUDIT 4: revision authorship and change-note completeness.
SELECT
  count(*) AS revisions_total,
  count(DISTINCT article_id) AS articles_covered,
  count(*) FILTER (WHERE changed_by IS NULL OR btrim(changed_by) = '') AS missing_changed_by,
  count(*) FILTER (WHERE change_note IS NULL OR btrim(change_note) = '') AS missing_change_note,
  count(*) FILTER (WHERE jsonb_typeof(snapshot) = 'object') AS object_snapshots,
  count(*) FILTER (WHERE jsonb_typeof(snapshot) <> 'object') AS non_object_snapshots
FROM public.ie_article_revisions;

-- AUDIT 5: remote migration-history structural integrity (read-only).
SELECT
  count(*) AS migration_rows,
  count(DISTINCT version) AS distinct_versions,
  count(*) FILTER (WHERE statements IS NULL) AS null_statement_arrays,
  count(*) FILTER (WHERE statements IS NOT NULL AND cardinality(statements) = 0) AS empty_statement_arrays,
  sum(cardinality(statements)) AS total_statements,
  count(*) FILTER (WHERE name IS NULL OR btrim(name) = '') AS missing_names
FROM supabase_migrations.schema_migrations;
