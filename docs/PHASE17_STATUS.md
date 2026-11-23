# Phase 17 — Content Completion & Verification

Last evidence review: 2026-11-23

## Checklist

| Workstream | Status | Evidence / next action |
|---|---|---|
| Qur'an Arabic text | Completed | 6,236 verses present; no missing Arabic detected. |
| Qur'an English translation | Completed (coverage) | 6,236 English fields present; QuranEnc Saheeh metadata/version attribution retained. |
| Surah metadata | Completed (coverage) | 114/114; Arabic, English, transliteration names, revelation type, and ayah count all populated. |
| Qur'an transliteration | Blocked | 0/6,236 populated. Tanzil's translations page states non-commercial terms; edition-specific redistribution permission is not confirmed. No transliteration imported. |
| Hadith coverage audit | Completed (audit) | Malik: 1,858; 29 Arabic gaps; 40 English gaps; narrator/book/chapter metadata absent for all 1,858. Riyad: 1,896; 11 narrator gaps; book number absent for all 1,896; chapter number/title coverage present; source references present. |
| Hadith metadata reconciliation | In progress / blocked on dataset access | CC0 structured-metadata candidate recorded. Reported Malik count is 1,846 vs local 1,858 (12-record discrepancy); Riyad count matches. Release archives are binary and unavailable to this run's file access, so no matching/import was done. English translation rights remain uncleared. |
| Prophets narratives & lessons | Pending | 25 index records; 25 have no story and no lessons. Qur'an references are present, but narratives require sourced editorial review. |
| Seerah timeline descriptions | Draft completed; review pending | 9/9 descriptions added from referenced Qur'an verses and stored QuranEnc English Saheeh v1.1.2. No dates/locations inferred. All marked draft and needs editorial review. |
| Companions | Pending | 18 reference-index articles; none published or verified. Expand sourced biographies and review references. |
| Article sourcing | Improved; editorial review pending | “What Is Hadith?” now has 3 linked secondary reference sources (Britannica, Encyclopedia.com, TDV İslâm Ansiklopedisi). Article remains unverified. Overall: 29 articles, 2 published, 0 verified, 27 in review. |
| Verification workflow audit | Completed (code) | Dataset audit now checks verified articles for reviewer identity, verification timestamp, and review notes. |
| Navigation/browser test | Pending | Previous static smoke check passed 62 internal literals, 25 targets, 22 route templates. Direct browser access is blocked by deployment SSO; public route rendering cannot be confirmed here. |
| Production health | Ongoing | Latest code deployment READY and main alias assigned. Runtime error cluster: one historical Qur'an import RLS failure (2026-11-22); no newer cluster in the 24-hour report. Runtime-log API retention is unavailable on current plan. |

## Safe changes this review

- Added 9 Qur'an-based draft Seerah descriptions; preserved existing source references and marked editorial review pending.
- Linked 3 secondary references to the “What Is Hadith?” article; did not mark it verified.
- Clarified the Tanzil transliteration source record's license/permission blocker.
- Updated the Hadith metadata candidate record: CC0 applies to structured data only; exact matching remains undone.
- Added 3 dataset-audit checks requiring reviewer identity, verification date, and notes for verified articles.

## Deployment evidence

- Commit: `f3314140bcde5b9f783a819f1f10867fcb57e239`
- Status: READY
- Main production alias: assigned to this deployment.
- Direct browser verification: blocked by SSO protection; no bypass was used.

## Next priorities

1. Reconcile Hadith book/chapter metadata using an accessible CC0 metadata source, with exact number alignment; do not import translations.
2. Expand Prophet biographies and Companion articles from exact Qur'an/hadith/book sources, retaining draft status until review.
3. Continue source verification for published articles and complete the navigation/reader regression test when authenticated browser access is available.
4. Investigate the historical Qur'an-import RLS error without weakening database policies; existing Qur'an data is complete, so no re-import is needed.
