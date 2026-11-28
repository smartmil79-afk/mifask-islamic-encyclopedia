-- Phase 17: read-only SECURITY DEFINER privilege and execution-surface audit.
-- Run only after confirming the public schema/function catalogue. This file performs SELECTs only.
-- Definition MD5 values fingerprint the live database definitions; they are not source-file hashes.

WITH security_definers AS (
  SELECT
    p.oid,
    p.proname,
    pg_get_function_identity_arguments(p.oid) AS identity_arguments,
    pg_get_userbyid(p.proowner) AS function_owner,
    p.proacl,
    p.proconfig,
    p.proowner
  FROM pg_proc AS p
  JOIN pg_namespace AS n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef
)
SELECT
  proname,
  identity_arguments,
  function_owner,
  has_function_privilege('anon', oid, 'EXECUTE') AS anon_execute,
  has_function_privilege('authenticated', oid, 'EXECUTE') AS authenticated_execute,
  EXISTS (
    SELECT 1
    FROM aclexplode(COALESCE(proacl, acldefault('f', proowner))) AS acl
    WHERE acl.grantee = 0
      AND acl.privilege_type = 'EXECUTE'
  ) AS public_execute,
  COALESCE(array_to_string(proconfig, ','), '(database default)') AS function_settings,
  md5(pg_get_functiondef(oid)) AS live_definition_md5
FROM security_definers
ORDER BY proname, identity_arguments;

WITH security_definers AS (
  SELECT p.oid, p.proowner, p.proacl, p.proconfig
  FROM pg_proc AS p
  JOIN pg_namespace AS n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef
)
SELECT
  count(*) AS security_definer_functions,
  count(*) FILTER (WHERE has_function_privilege('anon', oid, 'EXECUTE')) AS anon_executable,
  count(*) FILTER (WHERE has_function_privilege('authenticated', oid, 'EXECUTE')) AS authenticated_executable,
  count(*) FILTER (
    WHERE EXISTS (
      SELECT 1
      FROM aclexplode(COALESCE(proacl, acldefault('f', proowner))) AS acl
      WHERE acl.grantee = 0
        AND acl.privilege_type = 'EXECUTE'
    )
  ) AS public_executable,
  count(*) FILTER (
    WHERE COALESCE(array_to_string(proconfig, ','), '') NOT LIKE '%search_path%'
  ) AS without_explicit_search_path
FROM security_definers;

SELECT
  has_schema_privilege('anon', 'public', 'CREATE') AS anon_can_create_public_objects,
  has_schema_privilege('authenticated', 'public', 'CREATE') AS authenticated_can_create_public_objects,
  has_schema_privilege('public', 'public', 'CREATE') AS public_role_can_create_public_objects;

SELECT
  evtname,
  evtevent,
  evtenabled,
  evtfoid::regprocedure::text AS event_trigger_function
FROM pg_event_trigger
WHERE evtfoid IN (
  SELECT p.oid
  FROM pg_proc AS p
  JOIN pg_namespace AS n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef
)
ORDER BY evtname;
