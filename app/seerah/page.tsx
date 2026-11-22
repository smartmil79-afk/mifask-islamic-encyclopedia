import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

type Reference = {
  kind?: string;
  surah?: number;
  ayah?: number;
  label?: string;
  local_reader?: string;
  url?: string;
  title?: string;
};
type SeerahEvent = {
  id: string;
  title: string;
  description: string | null;
  source_refs: Reference[] | null;
  metadata: Record<string, unknown> | null;
};

async function getEvents(): Promise<SeerahEvent[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await sb
    .from('ie_seerah_events')
    .select('id,title,description,source_refs,metadata')
    .order('title');
  if (error) {
    console.error('Seerah reference index query failed:', error.message);
    return [];
  }
  return (data || []) as SeerahEvent[];
}

export default async function SeerahReferenceIndexPage() {
  const events = await getEvents();
  return (
    <main className="page-shell">
      <header className="page-hero">
        <span className="section-kicker">Qur’an reference index</span>
        <h1>Seerah — Qur’anic Event References</h1>
        <p>Selected passages associated with events in the Seerah, linked to MIFASK’s local Qur’an reader and external tafsir references.</p>
      </header>
      <section className="section">
        <div className="source-notice">
          <strong>Reference-only index — editorial review pending</strong>
          <p>No event narratives or dates are supplied. References were checked against MIFASK’s stored Qur’an text and translation and linked to external tafsir pages. This index is not scholarly verification.</p>
        </div>
        {events.length ? (
          <div className="article-grid">
            {events.map((event) => (
              <article className="article-card" key={event.id}>
                <div className="article-top">
                  <span className="article-tag">Qur’an references</span>
                  <span className="verification-mini-unverified">Review pending</span>
                </div>
                <h2>{event.title}</h2>
                <p className="article-summary">Reference entry only. Chronology and narrative details are intentionally omitted pending editorial review.</p>
                <ul>
                  {(event.source_refs || []).map((ref, i) => (
                    <li key={ref.url || i}>
                      <strong>{ref.label || ref.title || 'Source reference'}</strong>
                      <div className="article-source-links">
                        {ref.kind === 'tafsir' ? (
                          ref.url && <a href={ref.url} target="_blank" rel="noopener noreferrer">Read external tafsir ↗</a>
                        ) : (
                          <>
                            <Link href={ref.local_reader || (ref.surah && ref.ayah ? `/quran?surah=${ref.surah}&ayah=${ref.ayah}` : '/quran')}>Read in MIFASK</Link>
                            {ref.url && <a href={ref.url} target="_blank" rel="noopener noreferrer">Open verse source ↗</a>}
                          </>
                        )}
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
        <Link href="/category/seerah" className="button button-outline">← Back to Seerah articles</Link>
      </div>
    </main>
  );
}
