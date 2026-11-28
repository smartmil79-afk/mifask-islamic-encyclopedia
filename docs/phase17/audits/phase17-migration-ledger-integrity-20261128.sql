-- Phase 17: read-only reconciliation of local migration history against Supabase's applied ledger.
-- Schema was inspected before authoring: supabase_migrations.schema_migrations
-- exposes version text, name text, statements text[], created_by, idempotency_key, rollback text[].
-- This file contains SELECT statements only. It does not apply, repair, rename, or replay migrations.

-- 1. Remote ledger completeness and uniqueness.
SELECT
  count(*)::bigint AS remote_migration_rows,
  count(DISTINCT version)::bigint AS distinct_versions,
  count(*) FILTER (WHERE name IS NULL OR btrim(name) = '')::bigint AS missing_names,
  count(*) FILTER (WHERE coalesce(cardinality(statements), 0) = 0)::bigint AS empty_statement_arrays,
  count(*) FILTER (
    WHERE EXISTS (
      SELECT 1
      FROM unnest(coalesce(statements, ARRAY[]::text[])) AS s(statement)
      WHERE statement IS NULL OR btrim(statement) = ''
    )
  )::bigint AS null_or_blank_statements
FROM supabase_migrations.schema_migrations;

-- 2. Per-migration statement fingerprints and lengths.
-- These fingerprints describe the stored remote statement array; they are not hashes of
-- local files unless an independently computed local fingerprint is compared to them.
SELECT
  version,
  name,
  coalesce(cardinality(statements), 0) AS statement_count,
  coalesce((
    SELECT sum(length(s.statement))
    FROM unnest(coalesce(m.statements, ARRAY[]::text[])) AS s(statement)
  ), 0)::bigint AS statement_characters,
  md5(coalesce(array_to_string(statements, E'\n'), '')) AS remote_statements_md5,
  coalesce(cardinality(rollback), 0) AS rollback_statement_count
FROM supabase_migrations.schema_migrations AS m
ORDER BY version;

-- 3. Duplicate version or migration-name groups.
SELECT 'version' AS duplicate_key, version AS key_value, count(*)::bigint AS row_count
FROM supabase_migrations.schema_migrations
GROUP BY version
HAVING count(*) > 1
UNION ALL
SELECT 'name' AS duplicate_key, name AS key_value, count(*)::bigint AS row_count
FROM supabase_migrations.schema_migrations
WHERE name IS NOT NULL
GROUP BY name
HAVING count(*) > 1
ORDER BY duplicate_key, key_value;

-- 4. Confirm the current public function catalogue does not expose temporary MilNoor import RPCs.
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  p.prosecdef AS security_definer,
  p.proconfig AS function_settings
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (
    p.proname ILIKE '%milnoor%import%'
    OR p.proname ILIKE '%temporary%import%'
  )
ORDER BY p.proname, identity_arguments;

-- 5. Preserve the Quran/Hadith read/admin-write policy boundary during reconciliation.
SELECT
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('ie_quran_verses', 'ie_quran_surahs', 'ie_hadiths')
ORDER BY tablename, policyname;
