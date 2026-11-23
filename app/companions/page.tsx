import Link from 'next/link';

export default function CompanionsIndexPage() {
  return (
    <main className="page-shell">
      <header className="page-hero">
        <span className="section-kicker">Qur’an-based reference index</span>
        <h1>Companions Named in the Qur’an</h1>
        <p>This index records explicit Qur’anic name references and links to checked sources. It is intentionally not a full biography collection.</p>
      </header>
      <section className="section">
        <div className="source-notice">
          <strong>Reference-only index — editorial review pending</strong>
          <p>Only the explicit name and verse reference are included here. Additional biographical details will be added only after source review. This entry is not marked scholarly verified.</p>
        </div>
        <div className="article-grid">
          <article className="article-card">
            <div className="article-top">
              <span className="article-tag">Qur’an name reference</span>
              <span className="verification-mini-unverified">Review pending</span>
            </div>
            <h2>Zayd ibn Harithah</h2>
            <p className="article-arabic" dir="rtl" lang="ar">زيد بن حارثة</p>
            <p className="article-summary">Named in Qur’an 33:37. The verse and its tafsir are linked below; no further biography is asserted in this entry.</p>
            <ul>
              <li>
                <strong>Qur’an 33:37</strong>
                <div className="article-source-links">
                  <Link href="/quran?surah=33&ayah=37">Read in MIFASK</Link>
                  <a href="https://quran.com/33/37" target="_blank" rel="noopener noreferrer">Open Qur’an.com verse ↗</a>
                </div>
              </li>
              <li>
                <strong>Tafsir Ibn Kathir — verse 33:37</strong>
                <div className="article-source-links">
                  <a href="https://quran.com/33:37/tafsirs/en-tafisr-ibn-kathir" target="_blank" rel="noopener noreferrer">Read source explanation ↗</a>
                </div>
              </li>
            </ul>
          </article>
        </div>
      </section>
      <div className="article-bottom">
        <Link href="/category/companions" className="button button-outline">← Back to Companions articles</Link>
      </div>
    </main>
  );
}
