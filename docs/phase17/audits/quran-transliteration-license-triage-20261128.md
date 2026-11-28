# Phase 17 — Qur'an transliteration licensing triage

**Reviewed:** 2026-11-28  
**Decision:** No transliteration import approved; licensing remains unresolved.

## Existing database gap

The current Supabase inventory records 6,236 Qur'an verses with Arabic and nested English text present, while the transliteration column is empty on all 6,236 rows. No transliteration dataset was imported or changed during this review.

## Primary-source findings

### Tanzil Project

Official sources reviewed:
- Text License: https://tanzil.net/docs/Text_License
- Download page and terms: https://tanzil.net/pub/download/index.php
- Download documentation: https://tanzil.net/docs/download
- FAQ: https://tanzil.net/docs/FAQ

The official text licence identifies CC BY 3.0 for Tanzil Quran Text. It permits verbatim copying/distribution and use in a website or application when Tanzil is clearly identified and linked; it prohibits changing the text and requires the copyright notice to accompany copies/derivatives containing a substantial portion.

The official FAQ separately describes Tanzil developer resources as available for non-commercial purposes. The reviewed official pages do not establish a distinct, unambiguous licence grant for a separately downloadable transliteration dataset, nor do they resolve commercial redistribution for that resource. The text licence must not be silently extended to transliteration.

**Decision:** Treat Tanzil transliteration rights and any commercial-use permission as unresolved. Request resource-specific written confirmation from the rights holder before ingesting or bundling transliteration.

### Quran.ws

Official policy pages reviewed:
- Waqf and Open Licensing: https://quran.ws/docs/guidelines/licensing/
- Resource licensing map: https://quran.ws/docs/reference/licensing/

Quran.ws states that code it owns is generally MIT and data/content it owns is generally CC BY 4.0. It expressly says third-party material retains its original licence and terms, and that resource-specific notices override general defaults.

**Decision:** This is not a blanket licence for third-party Quran transliteration. A specific Quran.ws transliteration resource, version, rights statement and upstream attribution would need to be identified before use.

### Quran Foundation API

Official developer terms reviewed: https://api-docs.quran.com/legal/developer-terms/

The terms allow API access for qualifying Quranic end-user applications, but say raw Quran Foundation content/API data is not sold, sublicensed or redistributed as a dataset, data feed, download or content package.

**Decision:** Do not use Quran Foundation API responses as a bulk local transliteration import or dataset mirror. API use for the application's user-facing functionality is a separate question governed by the full terms.

## Secondary-source claim not accepted as permission

The third-party repository nafiskabbo/quran-dataset states in its DATA_SOURCES document that Tanzil transliteration is CC BY 3.0:
https://github.com/nafiskabbo/quran-dataset/blob/main/docs/DATA_SOURCES.md

That repository is not the identified rights holder for Tanzil material. Its statement is useful as a lead, but is not a substitute for a resource-specific grant from Tanzil. No licence conclusion or import is based on it.

## Import gate

Before any transliteration import, obtain and record:
1. Rights-holder confirmation covering the exact transliteration resource/file.
2. Licence and commercial-use scope applicable to the intended MIFASK distribution.
3. Exact release/version and immutable source revision or checksum.
4. Required attribution and copyright notice.
5. A source manifest linking imported rows to the exact source edition.
6. A verse-key completeness/duplicate audit against the 6,236 canonical (surah_number, ayah_number) keys.
7. A reviewed sample comparison against the licensed source and a documented editorial review state.

Until these conditions are met, keep all 6,236 transliteration fields empty and clearly report the gap. Do not synthesize transliteration or copy it from an unlicensed API or secondary mirror.
