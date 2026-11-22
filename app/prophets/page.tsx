import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

type ProphetReference = {
  surah: number;
  ayah: number;
  label?: string;
  url?: string;
  local_reader?: string;
};
type ProphetRow = {
  id: string;
  name: string;
  name_arabic: string | null;
  name_transliteration: string | null;
  quran_references: ProphetReference[] | null;
  metadata: Record<string, unknown> | null;
};

async function getIndex(): Promise<ProphetRow[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await sb
    .from('ie_prophets')
    .select('id,name,name_arabic,name_transliteration,quran_references,metadata')
    .order('name');
  if (error) {
    console.error('Prophet reference index query failed:', error.message);
    return [];
  }
  return (data || []) as ProphetRow[];
}

export default async function ProphetsIndexPage() {
  const prophets = await getIndex();
  return (
    <main className="page-shell">
      <header className="page-hero">
        <span className="section-kicker">Qur’an reference index</span>
        <h1>Prophets Mentioned in the Qur’an</h1>
        <p>Browse names with selected Qur’an references and open each verse in MIFASK’s reader or the external reference page.</p>
      </header>
      <section className="section">
        <div className="source-notice">
          <strong>Reference index only — editorial review pending</strong>
          <p>These entries contain names and verse links only. Stories and lessons have not been added. References were cross-checked against MIFASK’s stored Arabic text and English translation, but this is not scholarly verification or an editorial approval.</p>
        </div>
        {prophets.length ? (
          <div className="article-grid">
            {prophets.map((prophet) => (
              <article className="article-card" key={prophet.id}>
                <div className="article-top">
                  <span className="article-tag">Qur’an index</span>
                  <span className="verification-mini-unverified">Review pending</span>
                </div>
                <h2>{prophet.name}</h2>
                {prophet.name_arabic && <p className="article-arabic" dir="rtl" lang="ar">{prophet.name_arabic}</p>}
                <p className="article-summary">Selected reference for this name. Narrative content is intentionally not supplied.</p>
                <ul>
                  {(prophet.quran_references || []).map((ref, i) => (
                    <li key={i}>
                      <strong>{ref.label || `Qur’an ${ref.surah}:${ref.ayah}`}</strong>
                      <div className="article-source-links">
                        <Link href={ref.local_reader || `/quran?surah=${ref.surah}&ayah=${ref.ayah}`}>Read in MIFASK</Link>
                        {ref.url && <a href={ref.url} target="_blank" rel="noopener noreferrer">Open external reference ↗</a>}
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h2>Reference index unavailable</h2>
            <p>The database could not return entries. Please try again later.</p>
          </div>
        )}
      </section>
      <div className="article-bottom">
        <Link href="/category/prophets" className="button button-outline">← Back to Prophets articles</Link>
      </div>
    </main>
  );
}
