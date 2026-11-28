# Phase 17 — SECURITY DEFINER execution-surface review

**Evidence date:** 2026-11-28 17:41 Africa/Lagos  
**Supabase project:** `honsqapwikfghoubwhcf`  
**Method:** schema/catalogue inspection and read-only SQL. No function, grant, policy, or data changes.

## Inventory

A schema-first inspection of `pg_proc`, `pg_namespace`, function ACLs, function settings, and `pg_event_trigger` found:

| Measure | Result |
|---|---:|
| Public SECURITY DEFINER functions | 33 |
| Functions executable by `anon` | 30 |
| Functions executable by `authenticated` | 31 |
| Functions with PUBLIC EXECUTE | 29 |
| Functions without explicit function-level `search_path` | 0 |
| Functions owned by `postgres` | 33 |
| Anonymous CREATE privilege on `public` schema | false |
| Authenticated CREATE privilege on `public` schema | false |
| PUBLIC CREATE privilege on `public` schema | false |

The two functions not executable by `anon` or `authenticated` are `fund_wallet` and `log_admin`; their inspected ACLs retain service-role execution. `ie_bootstrap_first_admin` is authenticated-executable but not anonymous-executable. Its body requires an authenticated UID, a single configured allowlisted identity, and an empty `ie_admins` table; it uses an empty search path and schema-qualified writes.

The audit SQL is `docs/phase17/audits/phase17-security-definer-execution-surface-20261128.sql`. Its committed blob was fetched back before execution. The SQL only reads catalogue metadata, ACLs, function settings, schema privileges and event-trigger registrations. Database-definition MD5 values are fingerprints of live function definitions, not source-file hashes.

## Static review of higher-impact routines

The reviewed administrative routines include wallet adjustment, user deletion, user listing/detail, user messaging/renaming/suspension, administrator assignment, complaint response, manual-payment review, withdrawal settlement, and administrator listing. Their inspected bodies call `is_admin()` or `is_super_admin()` before privileged operations. Financial/user operations such as promotion purchase, ad purchase, withdrawal requests, order close/release, manual-payment submission, daily-token claim, profile update, conversation messaging and complaint submission check `auth.uid()` and/or user ownership/limits.

Additional observations:

- `is_admin()` and `is_super_admin()` are callable by anon/authenticated, but return a caller-specific boolean based on `auth.uid()`; they do not enumerate other users.
- `list_admins()` checks `is_super_admin()` before returning administrator identities.
- `handle_new_user()` is a trigger-returning function, not a normal RPC entry point.
- `rls_auto_enable()` is registered to the `ensure_rls` DDL event trigger. PostgreSQL event-trigger functions are not callable as ordinary RPC functions.
- `fund_wallet()` and `log_admin()` are not executable by anon/authenticated.
- The encyclopedia's `ie_record_analytics()` is explicitly executable by anon/authenticated and accepts only `article_view` or `search`; article views are restricted to existing published slugs. It has no in-function rate limit, so public analytics counts remain susceptible to automated inflation.
- `increment_views()` is public-executable and permits anonymous requests to increment an ad's view counter. This is an analytics-integrity/abuse surface, not evidence of an account or wallet privilege escalation.

## Items requiring owner/security review

1. **Least-privilege grants:** 29 functions carry PUBLIC EXECUTE; 30 are executable by `anon`, and 31 by `authenticated`. Static review found authorization checks on the inspected privileged routines, but broad grants expand the RPC attack surface. Map the actual PostgREST/client call graph and role requirements before preparing a grant-hardening migration. Do not blanket-revoke grants without regression testing.
2. **MFA policy:** `is_admin()` and `is_super_admin()` require JWT AAL2 when a verified MFA factor exists for the account. If no verified factor exists, their current predicate permits the AAL1 path. This is conditional step-up, not mandatory MFA enrollment for every administrator. Owner decision is required before changing policy.
3. **Public metrics:** consider abuse-resistant rate limiting or aggregation controls for `ie_record_analytics()` and `increment_views()`; do not add client-trusted identity or alter counts without a separate design.
4. **Regression:** authenticated RPC and reader/CMS tests remain SSO-blocked. No bypass was attempted.

## Decision and safety boundary

No confirmed unauthenticated wallet/admin privilege escalation was established by this static review. This is not a penetration test and does not prove all runtime paths safe. No RPC was invoked for testing.

No DDL, grants, function definitions, RLS policies, data, credentials, billing settings, or deployment aliases were changed. The historical Qur'an-import RLS issue remains untouched.
