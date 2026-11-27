-- Phase 17: read-only migration-history and security-invariant audit.
-- Baseline: GitHub main 22ce6fae33c75c9dc6c6c18801265b8a49b7bb21.
-- The local migration directory at this baseline contains 16 SQL files; the remote
-- Supabase history contains 18 rows. This query audits the remote catalog and the
-- three known remote-only history entries; it does not read the Git working tree.
-- No DDL, data writes, grants, policies, or migration-history changes are performed.

WITH
remote_history AS (
  SELECT version, name, statements,
         cardinality(statements) AS statement_count
  FROM supabase_migrations.schema_migrations
),
history_summary AS (
  SELECT count(*) AS remote_rows,
         count(DISTINCT version) AS distinct_versions,
         count(*) FILTER (
           WHERE statements IS NULL OR cardinality(statements) = 0
         ) AS empty_statement_rows,
         count(*) FILTER (
           WHERE cardinality(statements) > 1
         ) AS multi_statement_rows
  FROM remote_history
),
known_remote_only(version, expected_name) AS (
  VALUES
    ('20261121185153'::text, 'temporary_milnoor_dataset_import_rpc'::text),
    ('20261121185541'::text, 'remove_temporary_import_rpc'::text),
    ('20261122154246'::text, 'quran_admin_write_rls_policies'::text)
),
remote_only_check AS (
  SELECT k.version, k.expected_name,
         (r.version IS NOT NULL) AS present,
         r.name AS actual_name,
         r.statement_count
  FROM known_remote_only k
  LEFT JOIN remote_history r ON r.version = k.version
),
hardened_functions AS (
  SELECT p.proname AS function_name,
         p.oid::regprocedure::text AS signature,
         p.prosecdef AS security_definer,
         coalesce(array_to_string(p.proconfig, ','), '') AS settings,
         position('search_path=""' IN coalesce(array_to_string(p.proconfig, ','), '')) > 0
           AS empty_search_path
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'ie_record_analytics',
      'ads_guard',
      'category_counts',
      'fuzzy_ads'
    )
),
policy_snapshot AS (
  SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN (
      'ie_quran_verses',
      'ie_quran_surahs',
      'ie_hadiths',
      'ie_hadith_collections',
      'ie_source_imports',
      'ie_analytics_daily',
      'ie_article_revisions',
      'ie_reminder_delivery_logs'
    )
),
rls_summary AS (
  SELECT
    count(*) FILTER (WHERE c.relrowsecurity) AS public_tables_with_rls,
    count(*) AS public_base_tables,
    count(*) FILTER (
      WHERE c.relname LIKE 'ie\_%' ESCAPE '\'
        AND c.relrowsecurity
    ) AS ie_tables_with_rls,
    count(*) FILTER (
      WHERE c.relname LIKE 'ie\_%' ESCAPE '\'
    ) AS ie_base_tables
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
),
reminder_policy AS (
  SELECT count(*) AS policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'ie_reminder_delivery_logs'
),
admin_write_policies AS (
  SELECT count(*) AS policy_count
  FROM policy_snapshot
  WHERE tablename IN (
      'ie_quran_verses',
      'ie_quran_surahs',
      'ie_hadiths',
      'ie_hadith_collections',
      'ie_source_imports'
    )
    AND cmd = 'ALL'
    AND roles::text[] @> ARRAY['authenticated']::text[]
    AND coalesce(qual, '') ILIKE '%ie_admins%'
    AND coalesce(qual, '') ILIKE '%active%'
    AND coalesce(qual, '') ILIKE '%admin%'
    AND coalesce(with_check, '') ILIKE '%ie_admins%'
    AND coalesce(with_check, '') ILIKE '%active%'
    AND coalesce(with_check, '') ILIKE '%admin%'
),
public_read_policies AS (
  SELECT count(*) AS policy_count
  FROM policy_snapshot
  WHERE tablename IN ('ie_quran_verses', 'ie_quran_surahs', 'ie_hadiths')
    AND cmd = 'SELECT'
    AND roles::text[] @> ARRAY['anon','authenticated']::text[]
    AND coalesce(qual, '') = 'true'
)
SELECT jsonb_pretty(jsonb_build_object(
  'remote_migration_history', (SELECT to_jsonb(h) FROM history_summary h),
  'known_remote_only_migrations',
    (SELECT jsonb_agg(to_jsonb(r) ORDER BY r.version) FROM remote_only_check r),
  'hardened_functions',
    (SELECT jsonb_agg(to_jsonb(f) ORDER BY f.function_name) FROM hardened_functions f),
  'rls_summary', (SELECT to_jsonb(r) FROM rls_summary r),
  'admin_only_write_policy_count', (SELECT policy_count FROM admin_write_policies),
  'public_read_policy_count', (SELECT policy_count FROM public_read_policies),
  'reminder_delivery_log_policy_count', (SELECT policy_count FROM reminder_policy),
  'policy_snapshot',
    (SELECT jsonb_agg(to_jsonb(p) ORDER BY p.tablename, p.policyname) FROM policy_snapshot p)
)) AS phase17_migration_security_audit;
