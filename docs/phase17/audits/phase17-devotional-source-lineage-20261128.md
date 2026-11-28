# Devotional source-lineage verification — 2026-11-28

## Scope

Read-only comparison of the current Supabase devotional libraries with two pinned upstream Git datasets. The comparison was performed by fetching the pinned GitHub files, reading the current rows through the Supabase SQL tool, parsing both datasets, and comparing the specified fields by stable record number/order. No scripture, Hadith, translation, transliteration, grading, or scholarly status was edited.

## Morning and evening Adhkar

- Upstream repository: [Seen-Arabic/Morning-And-Evening-Adhkar-DB](https://github.com/Seen-Arabic/Morning-And-Evening-Adhkar-DB)
- Pinned commit: `39d422fb3e3a6608b47a8f4e1040543220bfd215`
- Arabic source file: [ar.json](https://github.com/Seen-Arabic/Morning-And-Evening-Adhkar-DB/blob/39d422fb3e3a6608b47a8f4e1040543220bfd215/ar.json)
  - Git blob object ID: `4c7b3edf4dccf33ea9988a306d67104a2d3ab673`
- English source file: [en.json](https://github.com/Seen-Arabic/Morning-And-Evening-Adhkar-DB/blob/39d422fb3e3a6608b47a8f4e1040543220bfd215/en.json)
  - Git blob object ID: `09605bb640c9f67c5c895926433f945b52edf420`
- README: [README_EN.md](https://github.com/Seen-Arabic/Morning-And-Evening-Adhkar-DB/blob/39d422fb3e3a6608b47a8f4e1040543220bfd215/README_EN.md), blob `516e01ada73507805da940dc10023e70c11f6b83`
- Repository licence file: [LICENSE](https://github.com/Seen-Arabic/Morning-And-Evening-Adhkar-DB/blob/39d422fb3e3a6608b47a8f4e1040543220bfd215/LICENSE), blob `c8358b2fa3a3df40e88bbcf244f5ac11ccc184dc`; it declares MIT.
- The upstream README identifies Hisn al-Muslim and Sunnah as sources for the English translation/transliteration and lists source books. The UmmahLibrary pinned attribution file also labels the Seen-Arabic morning/evening dataset MIT and identifies its derivation from Hisn al-Muslim. These are recorded source/licence declarations, not an independent legal opinion on every underlying work.

### Exact field comparison against `public.ie_adhkar`

| Check | Result |
|---|---:|
| Arabic upstream records | 34 |
| English upstream records | 34 |
| Current Supabase records | 34 |
| Arabic text exact matches | 34/34 |
| English translation exact matches | 34/34 |
| Transliteration exact matches | 34/34 |
| Repetition count exact matches | 34/34 |
| Missing database records | 0 |
| Extra database records | 0 |
| Distinct database IDs | 34 |

The stable comparison key was upstream `order` mapped to the existing `morning-evening-NN` record ID. The comparison did not assert that every citation or underlying Hadith has been independently graded or scholarly verified.

## 99 Names of Allah

- Pinned dataset repository: [UmmahLibrary/ummah-library](https://github.com/UmmahLibrary/ummah-library)
- Pinned commit: `2e0250d136553d0363fc00b6ef247c3cfa7e2f1a`
- Dataset: [packages/data/datasets/asma.json](https://github.com/UmmahLibrary/ummah-library/blob/2e0250d136553d0363fc00b6ef247c3cfa7e2f1a/packages/data/datasets/asma.json)
  - Git blob object ID: `98dcec486f2bc93557eccd0ae7be9a83ab955fd9`
- Root attribution: [ATTRIBUTION.md](https://github.com/UmmahLibrary/ummah-library/blob/2e0250d136553d0363fc00b6ef247c3cfa7e2f1a/ATTRIBUTION.md), blob `2791275033aa36f12d179f023d341979c9c96a72`
- Dataset attribution: [packages/data/ATTRIBUTION.md](https://github.com/UmmahLibrary/ummah-library/blob/2e0250d136553d0363fc00b6ef247c3cfa7e2f1a/packages/data/ATTRIBUTION.md), blob `cff4b33253ad320f06e59a079273bb7b907d5dc7`

### Exact field comparison against `public.ie_names_of_allah`

| Check | Result |
|---|---:|
| Upstream names | 99 |
| Current Supabase records | 99 |
| Arabic exact matches | 99/99 |
| Transliteration exact matches | 99/99 |
| English meaning exact matches | 99/99 |
| Missing database numbers | 0 |
| Extra database records | 0 |
| Distinct numbers | 99 |
| Number range | 1–99 |

The pinned UmmahLibrary attribution says the Arabic, transliteration and English meanings are extracted from `my-prayers/muslim-data-flutter` under Apache-2.0 and explicitly leaves English meaning wording for scholar review. The referenced upstream repository's current root LICENSE declares Apache-2.0. Its source revision for the imported values is not pinned in the MIFASK database, so the pinned UmmahLibrary dataset and its attribution are the reproducible comparison baseline here.

## Current Supabase provenance gap

A fresh schema-first audit confirmed:

| Library | Rows | Source-import linked | Source-import unlinked |
|---|---:|---:|---:|
| `ie_adhkar` | 34 | 0 | 34 |
| `ie_names_of_allah` | 99 | 0 | 99 |

A direct search of the 18 current `ie_source_imports` rows found no manifest for either pinned dataset. The ledger currently has 17 completed manifests and one historical failed zero-row manifest. All 18 `content_hash` and all 18 manifest `source_hash` values are NULL.

The GitHub blob object IDs above are Git object identifiers; they are **not** being represented as SHA-256 file hashes or written into database hash columns.

No synthetic import manifest was created and no `source_import_id` was assigned. The source-import status constraint represents operational import states (`pending`, `running`, `completed`, `failed`, `partial`); creating a fake completed import for a post-hoc comparison would misstate the import history. A future provenance migration requires an approved, explicitly defined reconciliation model and must not imply that an import occurred during this audit.

## Verification boundary

- All comparisons and SQL checks were read-only.
- No data, source references, metadata, import manifests, RLS policies, grants, or migrations were changed.
- Source matching proves equality for the listed fields only; it does not prove scholarly correctness or settle rights to every underlying text.
- Both libraries remain pending scholarly/editorial review. No content is promoted to verified.
