# MIFASK Islamic Encyclopedia

Developed by Fixable 6Tems Limited.

MIFASK is a Next.js application for browsing an expanding, source-linked Islamic knowledge library. The application uses Supabase for its content data and provides reader, collection, category, and editorial-review experiences.

## Content areas

The current Supabase content inventory includes:

- **Qur'an:** 114 Surah records and 6,236 verse records. Arabic text and the QuranEnc English Saheeh translation (version 1.1.2) are present. The English translation records retain edition, version, publisher, and source URL metadata. Qur'an transliteration is not yet populated; redistribution permission for the intended MIFASK use remains under review.
- **Hadith:** 3,754 records across Muwatta Malik and Riyad as-Salihin. Text gaps and collection metadata are still being reconciled against exact source editions and applicable rights; the current record count is not a claim of complete or edition-verified coverage.
- **Prophets and Seerah:** 25 Prophet reference entries and 9 Seerah event records. These are draft/reference entries pending editorial review, not scholarly-verified narratives.
- **Companions:** 22 CMS articles, with editorial and source review still required.
- **Islamic knowledge:** dictionary, Aqeedah, Fiqh, Muslim Life, Qur'an, Hadith, Seerah, and other category articles.
- **Duas and adhkar:** 40 Dua records and 34 adhkar records. Dua transliteration is incomplete.
- **Names of Allah:** 99 records with transliteration and meaning fields populated; field completeness does not itself constitute individual scholarly verification.

The editorial CMS stores linked source records and revision snapshots. Content coverage, source linkage, editorial review, and scholarly verification are separate states and must not be conflated.

## Technology

- Next.js 15 and React 19
- TypeScript
- Supabase JavaScript client and PostgreSQL content storage
- Vercel Git-based deployments

## Local development

1. Install Node.js 20 or newer.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env.local` and set the Supabase project URL and publishable/anon key:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open http://localhost:3000.

Only the project's publishable/anon key belongs in browser-exposed configuration. Never put a Supabase service-role key or other privileged credential in frontend code, `.env.example`, or committed files. Keep Row Level Security enabled and validate policies through the approved review process.

## Validation commands

- `npm run routes:check` — checks internal literal links, route templates, category slugs, required navigation links, Qur'an reader implementation markers, and editorial source-integrity markers.
- `npm run lint` — runs the TypeScript no-emit check.
- `npm run build` — runs the Next.js production build; the configured prebuild step also runs the route smoke check.

Static checks do not replace authenticated browser testing. Deployment SSO protection may prevent direct authenticated testing; do not bypass it.

## Deployment

The repository is connected to Vercel through Git integration. Push reviewed changes to the configured branch and inspect the resulting deployment. Treat a deployment as production-ready only after Vercel reports READY and the expected aliases are confirmed.

## Content integrity and disclaimer

MIFASK content is an educational reference project, not a substitute for qualified scholarly guidance. Some records are drafts or reference indexes and remain unverified. Do not present them as scholarly-approved merely because they are published or have references.

When adding religious material:

- Preserve exact Qur'an and Hadith wording only from an identified, rights-compatible source edition.
- Record source, edition, translator/publisher, version, and provenance where applicable.
- Do not infer Hadith grading, narrator identity, book/chapter placement, chronology, or scholarly conclusions from incomplete metadata.
- Keep content in editorial review until the required review is complete.
- Preserve revision history and source links.
- Do not import material until its redistribution rights and edition match are established.
