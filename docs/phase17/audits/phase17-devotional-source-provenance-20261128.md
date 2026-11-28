# Phase 17 — Devotional dataset provenance and exact-match audit

**Evidence date:** 2026-11-28 10:05 Africa/Lagos  
**Supabase project:** `honsqapwikfghoubwhcf`  
**Scope:** read-only schema/data checks and pinned upstream source-file comparisons. No database writes, imports, policy changes, or editorial status changes.

## 1. Schema-first findings

The live public schemas were inspected before querying the records. Relevant columns are:

- `ie_seerah_events.source_refs` and `metadata`: JSONB.
- `ie_adhkar.source_refs` and `metadata`: JSONB.
- `ie_duas.translations` and `metadata`: JSONB; `source_reference` and `source_import_id` are separate columns.
- `ie_names_of_allah.meanings` and `metadata`: JSONB.
- `ie_source_imports.source_manifest`: JSONB; source identity is held in `dataset_key`, `source_name`, `source_path`, and `source_site`.

Observed JSON shapes:
- Seerah `source_refs`: array of objects (9/9 records).
- Adhkar `source_refs`: array of text strings (34/34 records), not URL objects.
- Dua `translations`: object (40/40 records); `translations->'en'->>'text'` is the English text.
- Names of Allah `meanings` and `metadata`: objects (99/99 records).

## 2. Seerah reference-index integrity

Direct Supabase audit:
- Events: 9.
- Source-reference entries: 14 (all JSON objects).
- Qur'an references: 11.
- Tafsir references: 3.
- Reference objects without URLs: 0.
- Qur'an references that fail to resolve to `ie_quran_verses`: 0.
- Local reader path mismatches: 0.
- Duplicate reference groups within an event: 0.

These checks establish local reference integrity only. They do not independently verify the historical/event association or the scholarly correctness of any tafsir interpretation. Six Seerah records still have no `source_import_id`; no unrelated QuranEnc import IDs were attached.

## 3. Adhkar — exact match to pinned upstream dataset

Upstream:
- Repository: [Seen-Arabic/Morning-And-Evening-Adhkar-DB](https://github.com/Seen-Arabic/Morning-And-Evening-Adhkar-DB)
- Pinned commit: [`39d422fb3e3a6608b47a8f4e1040543220bfd215`](https://github.com/Seen-Arabic/Morning-And-Evening-Adhkar-DB/commit/39d422fb3e3a6608b47a8f4e1040543220bfd215)
- File: [`en.json`](https://github.com/Seen-Arabic/Morning-And-Evening-Adhkar-DB/blob/39d422fb3e3a6608b47a8f4e1040543220bfd215/en.json)
- Git blob SHA: `09605bb640c9f67c5c895926433f945b52edf420`
- Repository licence file: [`LICENSE`](https://github.com/Seen-Arabic/Morning-And-Evening-Adhkar-DB/blob/39d422fb3e3a6608b47a8f4e1040543220bfd215/LICENSE), blob SHA `c8358b2fa3a3df40e88bbcf244f5ac11ccc184dc`; the repository declares MIT.
- README_EN blob SHA: `516e01ada73507805da940dc10023e70c11f6b83`.

The upstream README describes English translation/transliteration as sourced from Hisn al-Muslim and Sunnah.com, and lists classical Hisn al-Muslim works in its source section. The repository-level MIT declaration is recorded, but this audit does not make a legal determination that every underlying third-party text or grading statement is separately sublicensed by that declaration. Retain source attribution and scholarly review requirements.

Exact comparison against all 34 live `ie_adhkar` records, mapping `metadata.source_order` to upstream `order`:
- Matched records: 34/34.
- Arabic: 34/34 exact.
- English translation: 34/34 exact.
- Transliteration: 34/34 exact.
- Repetition count: 34/34 exact.
- Source text: 34/34 exact.
- Virtue/context text: 34/34 exact.
- Audio URL/empty value: 34/34 exact.
- Hadith text: 34/34 exact.

All 34 records remain `source_review_status=pending scholarly review` and `verification_status=source-imported-not-scholarly-verified`. All 34 `source_import_id` values are NULL. The exact source-dataset label is `Seen-Arabic/Morning-And-Evening-Adhkar-DB`; no exact matching manifest exists in `ie_source_imports`. The `source_refs` arrays contain one text citation per row in the current data, not structured source URLs. No Hadith grading was independently verified by this comparison.

## 4. Names of Allah — exact match to pinned upstream dataset

Upstream:
- Repository: [UmmahLibrary/ummah-library](https://github.com/UmmahLibrary/ummah-library)
- Pinned commit: [`2e0250d136553d0363fc00b6ef247c3cfa7e2f1a`](https://github.com/UmmahLibrary/ummah-library/commit/2e0250d136553d0363fc00b6ef247c3cfa7e2f1a)
- File: [`packages/data/datasets/asma.json`](https://github.com/UmmahLibrary/ummah-library/blob/2e0250d136553d0363fc00b6ef247c3cfa7e2f1a/packages/data/datasets/asma.json)
- Git blob SHA: `98dcec486f2bc93557eccd0ae7be9a83ab955fd9`
- Dataset attribution: [`packages/data/ATTRIBUTION.md`](https://github.com/UmmahLibrary/ummah-library/blob/2e0250d136553d0363fc00b6ef247c3cfa7e2f1a/packages/data/ATTRIBUTION.md), blob SHA `cff4b33253ad320f06e59a079273bb7b907d5dc7`.
- Repository-wide attribution: [`ATTRIBUTION.md`](https://github.com/UmmahLibrary/ummah-library/blob/2e0250d136553d0363fc00b6ef247c3cfa7e2f1a/ATTRIBUTION.md), blob SHA `2791275033aa36f12d179f023d341979c9c96a72`.
- Data source licence: [`my-prayers/muslim-data-flutter/LICENSE`](https://github.com/my-prayers/muslim-data-flutter/blob/main/LICENSE), blob SHA `ee03e3ba6fcf2aa9f93e3271546b94dc204a0c72`, Apache-2.0.
- UmmahLibrary repository code licence is AGPL-3.0; its data attribution separately identifies `asma.json` as Apache-2.0 data. Do not conflate repository-code licensing with the dataset's declared licence.

Exact comparison against all 99 live `ie_names_of_allah` records by `number`:
- Records: 99/99.
- Arabic: 99/99 exact.
- Transliteration: 99/99 exact.
- English meaning: 99/99 exact.
- Database source label: UmmahLibrary attribution present on 99/99.
- Editorial review status: pending on 99/99.

Important limitation in the pinned upstream file: all 99 entries have empty `references` arrays and empty `description` fields. The attribution describes the Names as drawn from Qur'an and Sunnah and the Arabic/transliteration/English meanings as extracted from the Apache-2.0 `my-prayers/muslim-data-flutter` dataset. It also explicitly leaves English-meaning wording for scholar review. The file therefore supports exact dataset matching and source lineage, not individual per-Name citations or scholarly verification.

The database source label uses the shorter name `my-prayers/muslim-data`, while the UmmahLibrary attribution links to `my-prayers/muslim-data-flutter`. Treat this as a provenance-label normalization item for an approved editorial metadata workflow; do not silently rewrite existing records.

All 99 `source_import_id` values are NULL, and no exact matching source-import manifest exists.

## 5. Qur'anic Duas — reference integrity

Direct Supabase checks:
- Records: 40.
- `metadata.quran_reference` objects: 40/40.
- English translation text present: 40/40.
- QuranEnc English Saheeh edition/version tag: 40/40.
- Local Qur'an verse references unresolved: 0.
- Transliteration missing: 40/40.
- `source_import_id` missing: 6/40.

The six unlinked rows were not automatically attached to the existing 34-record supplication import. Their actual source-manifest membership must be established before linking.

## 6. Exact source-import manifest matching

The Adhkar source label and Names-of-Allah source label were compared against `ie_source_imports.dataset_key`, `source_name`, `source_path`, and `source_site` using exact equality. Exact manifest matches: 0 for each library.

This is a strict identity check, not a fuzzy search. No manifest was created and no record was linked.

## 7. Audit execution and change boundary

The exact committed read-only SQL file [`phase17-seerah-adhkar-dua-source-reference-integrity-20261128.sql`](https://github.com/smartmil79-afk/mifask-islamic-encyclopedia/blob/main/docs/phase17/audits/phase17-seerah-adhkar-dua-source-reference-integrity-20261128.sql), blob SHA `0f7747ef67685ddb4f2478e9123fc499c49dedd0`, was fetched back from GitHub and all six SELECT sections were executed directly against Supabase. The results above include the separate exact-source-file comparisons performed against pinned GitHub files.

No database writes, imports, source-manifest inserts, source_import_id updates, DDL, policy/grant changes, RLS weakening, migration application, or editorial verification changes were made. All drafts remain review/unverified. Authenticated CMS operations remain SSO-gated; no bypass was attempted.
