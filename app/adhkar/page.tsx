import Link from 'next/link';

export const metadata = {
  title: 'Adhkar Library | MIFASK Islamic Encyclopedia',
  description: 'The MIFASK Adhkar library is undergoing source-rights, attribution, classification and editorial review.',
};

export default function AdhkarPage() {
  return (
    <main className="page-shell">
      <header className="page-hero">
        <span className="section-kicker">MIFASK · Daily Remembrance</span>
        <h1>Adhkar Library</h1>
        <p>A carefully sourced library of daily remembrance is being prepared for publication.</p>
      </header>
      <section className="section">
        <div className="source-notice">
          <strong>Source and editorial review in progress</strong>
          <p>The stored Adhkar records have been compared with a pinned upstream dataset, but the repository-level licence does not by itself establish redistribution rights for every third-party text cited by that dataset.</p>
          <p>The current database also does not preserve the upstream distinction between entries intended for the morning, the evening, or both in structured fields. That mapping needs a reviewed, revision-preserving correction before the collection is presented.</p>
          <p>For these reasons, the Adhkar entries are not displayed on this page yet. No entry is presented as independently scholarly verified.</p>
          <div className="article-source-links">
            <Link href="/duas">Open Qur’anic Supplications</Link>
            <Link href="/quran">Open Qur’an Reader</Link>
            <Link href="/sources">Sources &amp; Methodology</Link>
          </div>
        </div>
      </section>
      <div className="article-bottom">
        <Link href="/explore" className="button button-outline">← Back to Explore</Link>
      </div>
    </main>
  );
}
