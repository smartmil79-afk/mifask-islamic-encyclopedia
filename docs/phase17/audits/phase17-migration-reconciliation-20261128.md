# Phase 17 migration-ledger reconciliation — 2026-11-28 14:21 Africa/Lagos

## Scope and method

- Repository: `smartmil79-afk/mifask-islamic-encyclopedia`, branch `main`.
- Main commit before this report: `91d6d1e033a2e3817ede6e10688d265ab8f051ab`.
- The live `supabase/migrations` directory was enumerated from GitHub main: 16 SQL files.
- The Supabase migration-table schema was inspected before querying. `supabase_migrations.schema_migrations` exposes `version text`, `name text`, `statements text[]`, `created_by text`, `idempotency_key text`, and `rollback text[]`.
- The remote migration statements were read and compared with the current local files. Exact byte matches were separated from a conservative comparison that removes full-line `--` comments and trims line whitespace. A normalized match is not claimed as proof of semantic equivalence.
- All SQL checks were SELECT-only. No migration, file rename, history repair, DDL, policy change, or data write was performed.

## Remote ledger verification

Direct Supabase results:

- Remote rows: **18**.
- Distinct versions: **18**.
- Missing/blank names: **0**.
- Empty statement arrays: **0**.
- Null/blank statement entries: **0**.
- Statement-array entries per remote migration: **1 each**.
- Duplicate version groups: **0**.
- Duplicate migration-name groups: **0**.

### Remote statement fingerprints

The MD5 values below fingerprint the stored remote `array_to_string(statements, E'\\n')` value. They are ledger-comparison evidence, not hashes of source datasets or a substitute for local-file review.

| Remote version | Name | Characters | Remote MD5 |
|---|---|---:|---|
| 20261120120305 | mifask_islamic_encyclopedia_content_foundation | 5,367 | 35189301a150a038a5741a6878ee9acf |
| 20261120120348 | encyclopedia_cms_admin_access | 3,342 | cd4b0250865d6526f44831ef4fe39e7a |
| 20261120120834 | article_reference_texts | 101 | 85e09dae1ec0e3dde07e8197f07dab1e |
| 20261120121832 | secure_first_cms_admin_bootstrap | 1,130 | 0cf4eadd47c0889d11c909ee11d3f2ad |
| 20261120123433 | editorial_verification_and_search | 2,717 | fb7c7ca35d9256053b02e0e1a3d73db4 |
| 20261120124043 | privacy_preserving_analytics | 1,639 | dfd7a93307cb86d09b77cd46990259af |
| 20261121184730 | milnoor_independent_datasets | 7,850 | b8e0230ab0118063fe220159a53c5b9b |
| 20261121185153 | temporary_milnoor_dataset_import_rpc | 9,586 | 8393a20accc3cdd56e455c53fc45a4e2 |
| 20261121185541 | remove_temporary_import_rpc | 171 | 4773afcee712bb3eac60e4481e32c30a |
| 20261122154246 | quran_admin_write_rls_policies | 777 | 29dacf449de4543b3b4344f62a6b7883 |
| 20261122180821 | enforce_article_verification_guard | 2,747 | 02a864be7196eb907a9cd8fb94f02339 |
| 20261122192716 | ie_quran_arabic_search_normalization | 1,106 | 6040cdc1e427e35dd2e0ada5b4fcb050 |
| 20261122195422 | quran_prophet_reference_index | 4,438 | 9789a47d6e1ab101eac39d75640fa046 |
| 20261123134449 | daily_whatsapp_reminders | 2,512 | 0ba1c6a7c32423fa6ec9287f0c05633f |
| 20261123135039 | daily_reminder_idempotency | 300 | 3613171c1ad8edc8029a09d8dac95d54 |
| 20261126182351 | harden_ie_admin_rls_roles_and_auth_uid_initplan | 2,789 | cb80049e171ad9d7b9ded86890c72869 |
| 20261126191824 | harden_shared_mifask_function_search_paths | 1,367 | 10a1a7e712d33a00eedf59e7906d7584 |
| 20261127082600 | harden_ie_record_analytics_search_path | 855 | 1caada4f0fa367c569982cfec8e5b723 |

## Local-to-remote mapping

There are 16 local files and 18 remote rows. Fifteen local files map to remote records; one local file has no remote record. Three remote records have no local file.

### Four exact raw SQL matches

| Local file | Remote version |
|---|---|
| `202611200001_mifask_islamic_encyclopedia_content_foundation.sql` | 20261120120305 |
| `202611200002_encyclopedia_cms_admin_access.sql` | 20261120120348 |
| `202611200004_article_reference_texts.sql` | 20261120120834 |
| `20261123100000_daily_whatsapp_reminders.sql` | 20261123134449 |

### Seven comment/formatting-normalized matches

The following match after removing full-line SQL comments and trimming line whitespace. Their applied SQL is not to be replayed; this classification only helps locate their corresponding remote rows.

| Local file | Remote version |
|---|---|
| `20261120_secure_first_admin_bootstrap.sql` | 20261120121832 |
| `20261122180821_enforce_article_verification_guard.sql` | 20261122180821 |
| `20261122192716_ie_quran_arabic_search_normalization.sql` | 20261122192716 |
| `20261123110000_daily_reminder_idempotency.sql` | 20261123135039 |
| `20261126182351_harden_ie_admin_rls_roles_and_auth_uid_initplan.sql` | 20261126182351 |
| `20261126191824_harden_shared_mifask_function_search_paths.sql` | 20261126191824 |
| `20261127082600_harden_ie_record_analytics_search_path.sql` | 20261127082600 |

### Four mapped files with substantive differences requiring review

1. **Editorial verification/search** — local `202611200005_editorial_verification_and_search.sql` maps to remote `20261120123433`. The local and remote statements differ in formatting and query-output/order expressions (including explicit output aliases and `ORDER BY rank` versus ordinal `ORDER BY 16`). Do not assume equivalence or replace either copy without a reviewed diff and schema/function inspection.

2. **Privacy-preserving analytics** — local `202611200006_privacy_preserving_analytics.sql` maps to remote `20261120124043`. The local function adds an `event_kind IS NULL` early-return guard that is absent from the applied remote statement. This is an intentional-looking behavior difference, not a comment-only change. Preserve applied history; assess any desired correction as a separate additive migration after review.

3. **Milnoor independent datasets** — local `202611210001_milnoor_independent_datasets.sql` maps to remote `20261121184730`. The local Quran search-index statement is missing a closing parenthesis around `to_tsvector`/the GIN index expression. The applied remote statement has the balanced closing parentheses. **The local file is not safe to apply as written.** Do not replay it.

4. **Qur'an/Prophet reference index** — local `20261122195422_quran_prophet_reference_index.sql` has the same version as remote `20261122195422`, but differs in import accounting. The remote statement declares `v_inserted` and `v_total`, uses `GET DIAGNOSTICS ... ROW_COUNT`, and calculates totals from `v_total`; the local file lacks that row-count diagnostic. Preserve both for review; do not rewrite applied history.

### One local-only file — keep unapplied

`202611200003_phase2_initial_review_content.sql` has no matching remote migration-history row.

Its 12 article slugs were extracted from the file and queried against `public.ie_articles`. All 12 exist in Supabase:

- 2 are currently `published` and `unverified`: `five-pillars-overview`, `hadith-what-is-hadith`.
- 10 are currently `review` and `unverified`.
- 0 are scholarly verified.

The seed's upsert logic resets status to `review` and overwrites article title, summary, and content. Replaying it would demote the two published-but-unverified articles and overwrite live content. It also includes generic source placeholders. **Do not apply or replay this seed.** No row was changed.

### Three remote-only migration records

| Remote version | Name | Current observation |
|---|---|---|
| 20261121185153 | temporary_milnoor_dataset_import_rpc | No matching local SQL file |
| 20261121185541 | remove_temporary_import_rpc | No matching local SQL file |
| 20261122154246 | quran_admin_write_rls_policies | No matching local SQL file |

A direct public function-catalogue query for names matching `%milnoor%import%` or `%temporary%import%` returned **zero rows**, consistent with the temporary import RPC having been removed. The current Qur'an policy inspection shows public SELECT and authenticated ALL guarded by an active `ie_admins` row with role `admin`; no anonymous write policy was found.

## Safety and content impact

- Current public tables: 35/35 with RLS enabled.
- Current encyclopedia tables: 20/20 with RLS enabled.
- Qur'an and Hadith policy boundaries remain unchanged.
- No migration was applied, renamed, deleted, or marked repaired.
- No migration history row was modified.
- No article, scripture, Hadith, or source data was changed.
- The historical Qur'an-import RLS issue remains blocked; no weakening or bypass was attempted.

## Next actions

1. Reconcile the editorial-search and Prophet-reference SQL differences against the live function/schema behavior.
2. Treat the analytics null guard as a candidate for a separate additive migration only if approved and tested in isolated QA.
3. Correct the local Milnoor syntax defect only after preserving the exact applied remote statement and reviewing the full migration diff; never replay the local file.
4. Decide whether the three remote-only migration source files can be recovered from the original authoring branch/history. Do not fabricate replacements from hashes alone.
5. Keep the Phase 2 seed unapplied and preserve the two published-but-unverified articles.
6. Do not rename or re-version local migration files until the complete map and any intended local-only changes are reviewed.

**Conclusion:** The migration discrepancy is now classified more precisely: 4 exact matches, 7 conservative formatting-normalized matches, 4 mapped divergences, 1 unsafe local-only seed, and 3 remote-only history entries. The remote ledger itself is internally complete (18 unique rows with non-empty statements). No migration repair or application is authorized by this audit.
