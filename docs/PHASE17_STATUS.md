# Phase 17 — Content Completion & Verification

Last evidence review: 2026-11-23 (hourly active execution)

## Checklist

| Workstream | Status | Evidence / next action |
|---|---|---|
| Qur'an Arabic text | Completed | 6,236 verses; 0 missing Arabic. |
| Qur'an English translation | Completed (coverage) | 6,236 English fields; QuranEnc English Saheeh attribution/version retained. |
| Surah metadata | Completed (coverage) | 114/114 complete; 0 incomplete across Arabic/English/transliteration names, revelation type, and ayah count. |
| Qur'an transliteration | Blocked | 0/6,236 populated. Tanzil terms are non-commercial and redistribution permission for this edition/use is unconfirmed. No import made. |
| Hadith coverage audit | Completed (audit) | Malik 1,858: 29 Arabic and 40 English gaps; narrator/book/chapter metadata missing. Riyad 1,896: 11 narrator gaps; book numbers absent; chapter metadata and source refs present. |
| Hadith metadata reconciliation | Blocked | CC0 structured-data candidate only. Malik count differs by 12 (candidate 1,846 vs local 1,858); release assets not accessible for exact matching. English translations sourced from Sunnah.com; rights not cleared. |
| Prophet narratives & lessons | Completed (draft coverage) | 25/25 entries have brief Qur’an-based summaries, lessons and references. All are pending editorial review and not scholarly-verified; this completes draft coverage, not scholarly review. |
| Seerah timeline descriptions | Completed (draft content) | 9/9 descriptions exist and are marked Qur'an-based drafts; editorial review pending. No dates or unsupported chronology inferred. |
| Companions | In progress | 18 entries remain in review/unverified. Abu Bakr reference-index article expanded with a short draft paraphrase of imported Riyad as-Salihin 1468; source link is attached and edition review remains pending. Other entries still need sourced expansion. |
| Article sourcing | In progress | 29 articles; 2 published, 27 review, 0 verified; 41 article-source links. “What Is Hadith?” has 3 linked secondary references and remains unverified. |
| Verification workflow audit | Completed (code) | Checks verified articles for reviewer, verification timestamp and notes; checks Prophet story/lesson gaps, Seerah descriptions and Hadith metadata gaps. |
| Navigation/browser test | In progress | Static smoke check previously passed 62 internal literals, 25 targets, 22 route templates. Authenticated functional browser test remains blocked by SSO. |
| Production health | In progress | Current main deployment READY; production alias verified. One historical Qur'an import RLS error from 2026-11-22 remains in 7-day report. Existing data is complete, so no re-import needed. Service-role env key is not configured; do not weaken RLS. |

## Current audit snapshot — 2026-11-23

This snapshot supersedes older interim counts above.

| Workstream | Status | Current evidence / blocker |
|---|---|---|
| Qur'an Arabic text | Completed | 6,236 verses; 0 missing Arabic. |
| Qur'an English translation | Completed (coverage) | 6,236 fields populated; QuranEnc English Saheeh v1.1.2 attribution/version is retained. Republication terms require unchanged text, publisher/source and version attribution, footnotes retained, updates, and no inappropriate ads. |
| Surah metadata | Completed (coverage) | 114/114 complete. |
| Qur'an transliteration | Blocked | 0/6,236. Tanzil lists an en.transliteration resource, but the exact license for redistribution in MIFASK's deployment/use has not been established; no import. |
| Hadith source provenance | Completed (coverage audit) | 3,754 records; all have source_refs dataset, edition, and source URL. |
| Muwatta Malik text gaps | In progress | 1,858 total; 29 missing Arabic; 40 missing English. |
| Muwatta Malik metadata | Blocked | 1,858 missing narrator and book/chapter/title metadata; no verified edition-matched metadata dataset cleared for import. |
| Riyad as-Salihin text | Completed (coverage) | 1,896; Arabic/English complete. |
| Riyad metadata | In progress | 11 narrator gaps; book_number missing for all 1,896; chapter number/title present. |
| Hadith dataset licensing | Blocked | Fawaz repo has Unlicense, but underlying translation rights remain collection-specific/unresolved; AhmedBaset/hadith-json is described as scraped from Sunnah.com and no explicit data license was located. Do not bulk import or copy narrator fields. |
| Prophet narratives/lessons | Completed (draft coverage) | 25/25 stories and lessons; 25/25 references. 25/25 pending editorial review and not scholarly verified. |
| Seerah | Completed (draft coverage) | 9/9 descriptions and sources; 9/9 pending editorial review and not scholarly verified. Chronology intentionally omitted. |
| Companions | In progress | 1 CMS article under companions-* in review/unverified; Abu Bakr introduction/reference entries exist but remain unverified. Index at /companions currently names Zayd ibn Harithah only. |
| Duas | In progress | 40 records; Arabic/English/source fields complete; transliteration missing in 40. 6 use review_status=pending, 34 carry a legacy pending flag. |
| Articles | In progress | 29 total; 2 published/unverified, 27 review/unverified, 0 verified. 41 source-link rows across 27 articles. 0 missing reference_texts. |
| Article verification safeguards | Completed (code) | Verified status requires reviewer, date and notes; current DB has no verified articles. |
| Dataset audit UI | In progress | New checks committed for source provenance, Prophet/Seerah review state, dua review flags, article references and citation details; deployment verification pending. |
| Navigation/reader | In progress | Build-time route smoke test runs via prebuild; latest static test previously passed 65 literal links/26 targets/24 route templates. Authenticated interactive browser test is blocked by SSO. |
| Production health | In progress | Last production deployment READY on commit 981d22c; new audit-code commit e56cca5 is BUILDING. Current runtime error report shows only the historical Quran-import RLS error. Do not weaken RLS. |

## Source/licensing review

- Tanzil Arabic text: official text license is CC BY 3.0; use verbatim, include attribution, link to Tanzil and preserve notice. Source: https://tanzil.net/docs/Text_License
- Tanzil transliteration: en.transliteration source/changelog exists (6,236 lines), but permission for redistribution in this deployment is not confirmed. The FAQ describes resources as non-commercial: https://tanzil.net/docs/FAQ and resource page https://tanzil.net/trans/log/en.transliteration. Keep import blocked until deployment-use/license compatibility is confirmed.
- QuranEnc English Saheeh: republishing is allowed under its terms if content remains unmodified, publisher/source and version are clearly stated, transcript information/footnotes are retained, updates are followed, and inappropriate ads are not displayed. Terms: https://quranenc.com/en/home/about/terms
- Fawaz Ahmed Hadith API: repository identifies Unlicense; this does not automatically resolve rights of underlying collection translations. Repository: https://github.com/fawazahmed0/hadith-api
- AhmedBaset hadith-json: README describes data scraped from Sunnah.com and documents english.narrator in its structure, but no explicit data license was located. Repository: https://github.com/AhmedBaset/hadith-json. Do not copy text or narrator fields pending rights and exact-edition matching.

## Current code/deployment update

- Dataset audit enhancement commit: e56cca58227b1ec575a84b8d0eec8178c2e4592a
- Added checks for missing Hadith source dataset/edition/URL; Prophet and Seerah editorial/not-verified flags; current and legacy Dua review flags; missing article reference texts; and missing citation details.
- Supabase direct counts above are the verification source for this snapshot. The deployment has not yet been verified READY for this commit.


## Safe changes this review

- Added draft narratives and lessons for Nuh, Ibrahim, Yusuf, and Musa, using exact selected Qur'an references already stored and local QuranEnc English Saheeh text as source context. Drafts are paraphrases, not verified religious rulings; editorial review remains required.
- Preserved the existing reference lists and merged draft provenance/review metadata without overwriting non-empty story/lesson fields.
- Expanded the Abu Bakr companion draft with a paraphrase of the locally imported Riyad as-Salihin 1468 report. Existing source link retained; article remains in review and unverified.
- Verified current coverage counts directly in Supabase: 6,236 Qur'an verses with Arabic/English complete; transliteration absent; 114 complete Surah records; 4 Prophet drafts and 21 empty; 9 Seerah descriptions; 29 articles with 41 source links.

## Deployment evidence

- Latest main-code commit: `7b9ee64ac7b217639061c58bb1142d9186b978de`
- Deployment: READY.
- Verified production aliases point to the READY deployment:
  - `mifask-islamic-encyclopedia-liha.vercel.app`
  - `mifask-islamic-encyclopedia-liha-mifask-team.vercel.app`
  - `mifask-islamic-encyclopedia-liha-git-main-mifask-team.vercel.app`
- Direct browser verification: blocked by SSO protection; no bypass used.

## Next priorities

1. Continue Prophet drafts only from exact source passages; preserve review status and citations.
2. Reconcile Hadith book/chapter/narrator metadata using accessible CC0 structured data, exact number matching, and no translation import.
3. Expand remaining Companion entries using traceable primary references; keep them draft until reviewed.
4. Continue article source-quality review and authenticated navigation/reader regression testing.
5. Investigate the historical Qur'an-import RLS failure only with an authenticated test session; do not alter policy or add privileged credentials without explicit approval.


## Hourly execution update — 2026-11-23

- Added three additional short Prophet drafts in Supabase: Ayyub (Qur’an 21:83–84; 38:41–44), Yahya (Qur’an 3:39; 19:7–15), and Dawud (Qur’an 2:251; 34:10–11; 38:17–26).
- Draft wording was cross-checked against the stored local Arabic and QuranEnc English Saheeh verse records. Content remains explicitly pending editorial review and not scholarly verified.
- Safe update was conditional on each record having an empty story; no existing narratives were overwritten. Verification query confirmed 7/25 stories populated and 18/25 still empty.
- No Qur’an/Hadith text was imported and no license or verification claims were upgraded.
- Production monitor: current production deployment list includes READY deployments; runtime error aggregation reports only the historical Qur’an import RLS failure in the 24-hour window. SSO still prevents direct authenticated reader/navigation testing.


## Hourly execution update — 2026-11-23 (additional run)

- Added 7 additional conditional Prophet drafts: Adam, Hud, Salih, Ismail, Ishaq, Harun, and Idris. Each was written from referenced local Qur’an verses and the QuranEnc English Saheeh translation, with a short lesson list and reference metadata.
- SQL update only filled records whose story was empty and lessons were empty; no existing content was overwritten. Metadata explicitly retains `pending_editorial_review` and `not_scholarly_verified`.
- Supabase verification confirmed 14/25 Prophet stories and lessons populated, 14 entries have reference metadata, and 14 are pending editorial review. The other 11 remain blank.
- Current Vercel production deployment is READY on commit `f6a7985af5da82ecabc2c90dba8e8d7cb7df9688` (reflection-share text fix). One historical Qur’an import RLS error remains in the 7-day runtime aggregation; no new error groups.


## Hourly execution update — 2026-11-23 (Prophet draft coverage milestone)

- Added conditional Qur’an-based drafts for the remaining 11 Prophet reference entries: Al-Yasa, Dhul-Kifl, Ilyas, Isa, Lut, Muhammad, Shuayb, Sulayman, Yaqub, Yunus, and Zakariya. Selected verse text and QuranEnc English Saheeh translations were read from the local database before drafting.
- Updates only filled blank stories/empty lessons; existing data was preserved. Every new entry retains Qur’an references, draft-source provenance, pending editorial review, and `not_scholarly_verified` status.
- Supabase verification: 25/25 stories, 25/25 lessons, 25/25 reference lists; 0 blank stories; 25/25 explicitly pending editorial review and not scholarly verified.
- Prophet narrative draft coverage is now complete. Scholarly/editorial review is still outstanding; this is not an authentication claim.
