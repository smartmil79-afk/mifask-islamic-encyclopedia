# Milnoor one-time dataset migration

These scripts are for **one-time extraction and import only**. Production MIFASK must not call Milnoor or depend on its uptime.

1. Run `npm run extract:milnoor` from the repository root. This downloads and normalizes Quran and eight Hadith collection datasets into JSON files in this directory.
2. Set local environment variables `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (server-only; never commit or use a `NEXT_PUBLIC_` service-role variable).
3. Run `npm run import:datasets`. The importer upserts the JSON files into MIFASK-owned `ie_*` tables and records provenance/import logs.
4. Verify record counts in Supabase. The data source is recorded for provenance, but is not used at runtime.

The Quran import includes Arabic, transliteration, Pickthall, Yusuf Ali, and Hausa (Gumi). Hadith import includes Arabic and English text, collection, book/section, and source references.
