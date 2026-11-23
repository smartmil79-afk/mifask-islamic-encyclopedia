# Phase 17 — Content Completion & Verification

Last evidence review: 2026-11-23

## Checklist

| Workstream | Status | Evidence / next action |
|---|---|---|
| Qur'an Arabic text | Completed | 6,236 verses; 0 missing Arabic. |
| Qur'an English translation | Completed (coverage) | 6,236 English fields; QuranEnc English Saheeh attribution/version retained. |
| Surah metadata | Completed (coverage) | 114/114 complete; 0 incomplete across Arabic/English/transliteration names, revelation type, and ayah count. |
| Qur'an transliteration | Blocked | 0/6,236 populated. Tanzil terms are non-commercial and redistribution permission for this edition/use is unconfirmed. No import made. |
| Hadith coverage audit | Completed (audit) | Malik 1,858: 29 Arabic and 40 English gaps; narrator/book/chapter metadata missing. Riyad 1,896: 11 narrator gaps; book numbers absent; chapter metadata and source refs present. |
| Hadith metadata reconciliation | Blocked | CC0 structured-data candidate only. Malik count differs by 12 (candidate 1,846 vs local 1,858); release assets not accessible for exact matching. English translations sourced from Sunnah.com; rights not cleared. |
| Prophet narratives & lessons | In progress | 4/25 (Nuh, Ibrahim, Yusuf, Musa) have short Qur'an-based draft summaries and lessons. 21 remain blank. All four are pending editorial review and not scholarly-verified. |
| Seerah timeline descriptions | Completed (draft content) | 9/9 descriptions exist and are marked Qur'an-based drafts; editorial review pending. No dates or unsupported chronology inferred. |
| Companions | In progress | 18 entries remain in review/unverified. Abu Bakr reference-index article expanded with a short draft paraphrase of imported Riyad as-Salihin 1468; source link is attached and edition review remains pending. Other entries still need sourced expansion. |
| Article sourcing | In progress | 29 articles; 2 published, 27 review, 0 verified; 41 article-source links. “What Is Hadith?” has 3 linked secondary references and remains unverified. |
| Verification workflow audit | Completed (code) | Checks verified articles for reviewer, verification timestamp and notes; checks Prophet story/lesson gaps, Seerah descriptions and Hadith metadata gaps. |
| Navigation/browser test | In progress | Static smoke check previously passed 62 internal literals, 25 targets, 22 route templates. Authenticated functional browser test remains blocked by SSO. |
| Production health | In progress | Current main deployment READY; production alias verified. One historical Qur'an import RLS error from 2026-11-22 remains in 7-day report. Existing data is complete, so no re-import needed. Service-role env key is not configured; do not weaken RLS. |

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
