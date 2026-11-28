# Qur'an audio source and licensing review — 2026-11-28

## Scope

Read-only review of the current Qur'an reader implementation, the \`ie_quran_verses.audio_urls\` JSONB column, and QuranEnc-related source-import manifests. No audio files were downloaded, copied, cached, redistributed, or imported.

## Current application implementation

- Main source inspected: \`app/quran/page.tsx\` (blob \`838e708cbffc30b53b17e8075ed1e0dea850eb16\`).
- The per-ayah \`playAyah\` handler requests \`https://api.alquran.cloud/v1/ayah/{globalAyahNumber}/ar.alafasy\`.
- The reader uses the returned \`data.audio\` URL in an HTML audio element.
- The code does not read the database \`audio_urls\` field for playback and the inspected player markup does not display a reciter/provider credit.
- The edition identifier \`ar.alafasy\` is identified by Al Quran Cloud's CDN documentation as Mishary Rashid Alafasy, Murattal, default 128 kbps.

## Direct Supabase audit

Schema was inspected before querying:
- \`public.ie_quran_verses.audio_urls\`: JSONB, NOT NULL.
- \`public.ie_quran_verses.transliteration\`: nullable text.
- \`public.ie_quran_verses.translations\`: JSONB, NOT NULL; English is an object at \`translations->'en'\`, with text at \`->>'text'\`.
- \`public.ie_source_imports.source_manifest\`: JSONB, NOT NULL.
- \`public.ie_source_imports.content_hash\`: nullable text.

The committed SQL audit \`phase17-quran-audio-source-provenance-20261128.sql\` was fetched back from GitHub and executed against Supabase.

Observed results:
- Verses: 6,236.
- Transliteration gaps: 6,236.
- Audio URL values that are not JSON objects: 0.
- Empty audio URL objects: 6,236.
- Populated audio URL objects: 0.
- English translation object-shape gaps: 0.
- English text gaps: 0.
- English edition/version/publisher/source_url gaps: 0.
- Quran-related import manifests selected by dataset/source name: 16 (includes QuranEnc, Prophet index, Seerah index, and Qur'anic Duas manifests).
- Selected manifests with content_hash: 0.
- Selected manifests with source_manifest.source_url: 1.
- Selected manifests with source_manifest.license_terms_url: 1.
- Selected manifests with source_manifest.republishing_terms: 1.
- Selected manifests with generic source_manifest.terms: 13.

The 13 QuranEnc v1.1.2 manifest rows comprise one historical failed zero-row attempt and 12 completed batches. The completed batch counts sum to 6,236, with zero skipped records. No hashes were inferred or written.

## Provider terms reviewed

Primary provider documentation:
- Al Quran Cloud Terms and Conditions: https://alquran.cloud/terms-and-conditions (page states last updated 13 November 2026).
- Al Quran Cloud CDN documentation: https://alquran.cloud/cdn

The current terms state:
- The API and audio CDN are free to access without an account or key.
- Recitations remain copyrighted by their reciters and rights holders.
- Recitations may be streamed, embedded, and downloaded for personal and educational use.
- If used in a commercial product, reciters may ask for removal.
- The provider asks clients to cache audio to reduce repeated requests.

The CDN documentation identifies \`ar.alafasy\` as Mishary Rashid Alafasy and documents the per-ayah audio endpoint.

## Assessment and safe next steps

- A free API endpoint is not, by itself, a transfer of copyright in the recitation.
- The current reader's streaming use should remain marked **rights review required / conditional**, particularly if MIFASK is or becomes a commercial product.
- Do not mirror or bulk-download recitations, populate \`audio_urls\`, or claim commercial clearance without confirmation of the applicable reciter/rights-holder terms.
- Add visible reciter/provider attribution only after confirming the exact wording and permitted use for the product's distribution model.
- Keep transliteration work separate: no transliteration source or licence was established by this audio review.
- Do not alter the complete QuranEnc Arabic/English text or weaken RLS to populate audio metadata.

This audit establishes database and implementation facts plus a summary of the provider's published terms. It does not constitute legal advice or scholarly verification.
