import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

type DuaRow = {
  id: string;
  title: string;
  category: string | null;
  arabic: string | null;
  transliteration: string | null;
  translations: Record<string, { text?: string; footnotes?: string; version?: string; publisher?: string; source_url?: string } | string>;
  source_reference: string | null;
  metadata: Record<string, unknown> | null;
};

async function getDuas(): Promise<{ rows: DuaRow[]; error: boolean }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { rows: [], error: true };
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await sb
    .from('ie_duas')
    .select('id,title,category,arabic,transliteration,translations,source_reference,metadata')
    .order('id');
  if (error) {
    console.error('Qur’anic supplication index query failed:', error.message);
    return { rows: [], error: true };
  }
  const rows = ((data || []) as DuaRow[]).sort((a, b) => {
    const ar = a.metadata?.quran_reference as { surah?: number; ayah?: number } | undefined;
    const br = b.metadata?.quran_reference as { surah?: number; ayah?: number } | undefined;
    return (ar?.surah ?? 999) - (br?.surah ?? 999) || (ar?.ayah ?? 999) - (br?.ayah ?? 999);
  });
  return { rows, error: false };
}

function english(dua: DuaRow) {
  const value = dua.translations?.en;
  if (typeof value === 'string') return value;
  return value?.text || '';
}

function footnotes(dua: DuaRow) {
  const value = dua.translations?.en;
  return typeof value === 'string' ? '' : value?.footnotes || '';
}

export default async function QuraniSupplicationsPage() {
  const { rows, error } = await getDuas();
  return (
    <main className="page-shell">
      <header className="page-hero">
        <span className="section-kicker">MIFASK · Qur’an Reader</span>
        <h1>Qur’anic Supplications</h1>
        <p>Selected verses containing supplications, preserved from MIFASK’s local Qur’an dataset with source edition metadata.</p>
      </header>
      <section className="section">
        <div className="source-notice">
          <strong>Source and review status</strong>
          <p>The Arabic text and English translation are copied unchanged from the local Qur’an dataset. The selection and titles are reference labels; all entries are pending editorial review. No transliteration has been added because a reviewed source has not yet been cleared.</p>
          <p>English edition: QuranEnc — English Saheeh, Noor International Center, version 1.1.2. QuranEnc’s republishing terms require unchanged text, source/publisher and version attribution, updates when revised, and no inappropriate advertisements alongside the translation.</p>
          <div className="article-source-links">
            <a href="https://quranenc.com/en/browse/english_saheeh" target="_blank" rel="noopener noreferrer">QuranEnc source & edition terms ↗</a>
            <Link href="/quran">Open Qur’an Reader</Link>
          </div>
        </div>
        {error ? (
          <div className="empty-state"><h2>Supplication index unavailable</h2><p>The database could not return the records. Please try again later.</p></div>
        ) : rows.length ? (
          <div className="article-grid">
            {rows.map((dua) => {
              const ref = dua.metadata?.quran_reference as { surah?: number; ayah?: number } | undefined;
              const translation = english(dua);
              const notes = footnotes(dua);
              const sourceUrl = typeof dua.metadata?.translation_url === 'string' ? dua.metadata.translation_url : 'https://quranenc.com/en/browse/english_saheeh';
              return (
                <article className="article-card" key={dua.id}>
                  <div className="article-top">
                    <span className="article-tag">{dua.category || 'Qur’anic supplication'}</span>
                    <span className="verification-mini-unverified">Review pending</span>
                  </div>
                  <h2>{dua.title}</h2>
                  {dua.arabic && <p className="article-arabic" dir="rtl" lang="ar">{dua.arabic}</p>}
                  {dua.transliteration && <p className="ayah-transliteration" lang="en">{dua.transliteration}</p>}
                  {translation && <p className="article-summary">{translation}</p>}
                  {notes && <details className="ayah-footnotes"><summary>Translation footnotes</summary><p>{notes}</p></details>}
                  <p className="muted">{dua.source_reference || 'Qur’an reference unavailable'}</p>
                  <div className="article-source-links">
                    {ref?.surah && ref?.ayah && <Link href={`/quran?surah=${ref.surah}&ayah=${ref.ayah}`}>Read verse in MIFASK</Link>}
                    <a href={sourceUrl} target="_blank" rel="noopener noreferrer">Translation source ↗</a>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state"><h2>No supplications found</h2><p>No records are currently available.</p></div>
        )}
      </section>
      <div className="article-bottom"><Link href="/quran" className="button button-outline">← Back to Qur’an Reader</Link></div>
    </main>
  );
}
