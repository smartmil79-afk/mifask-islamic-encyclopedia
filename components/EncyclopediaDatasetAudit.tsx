'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

type AuditRow = {
  label: string;
  value: number | null;
  detail: string;
  severity: 'normal' | 'gap' | 'error';
  zeroWarning?: boolean;
  error?: string;
};

type Query = any;
async function exactCount(sb: any, table: string, filter?: (q: Query) => Query) {
  let q = sb.from(table).select('*', { count: 'exact', head: true });
  if (filter) q = filter(q);
  const { count, error } = await q;
  return { value: error ? null : (count ?? 0), error: error?.message as string | undefined };
}

export default function EncyclopediaDatasetAudit() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const run = useCallback(async () => {
    const sb = getSupabaseClient();
    if (!sb) {
      setRows([{ label: 'Database connection', value: null, detail: 'Supabase client is not configured.', severity: 'error' }]);
      return;
    }
    setLoading(true);
    const checks: Array<Omit<AuditRow, 'value' | 'error'> & { table: string; filter?: (q: Query) => Query }> = [
      { label: 'Qur’an Surah metadata', table: 'ie_quran_surahs', detail: 'Expected 114 records.', severity: 'normal' },
      { label: 'Qur’an verses', table: 'ie_quran_verses', detail: 'Expected 6,236 records.', severity: 'normal' },
      { label: 'Qur’an verses missing Arabic', table: 'ie_quran_verses', filter: q => q.or('arabic.is.null,arabic.eq.'), detail: 'Arabic text completeness check.', severity: 'gap' },
      { label: 'Qur’an verses missing English', table: 'ie_quran_verses', filter: q => q.or('translations->en->text.is.null,translations->en->text.eq.'), detail: 'QuranEnc English Saheeh translation field.', severity: 'gap' },
      { label: 'Qur’an verses missing transliteration', table: 'ie_quran_verses', filter: q => q.or('transliteration.is.null,transliteration.eq.'), detail: 'Currently unavailable pending a redistribution-compatible reviewed source.', severity: 'gap' },
      { label: 'Hadith records', table: 'ie_hadiths', detail: 'Both imported collections.', severity: 'normal' },
      { label: 'Muwatta Malik missing Arabic', table: 'ie_hadiths', filter: q => q.eq('collection_key', 'malik').or('arabic.is.null,arabic.eq.'), detail: 'Blank Arabic records in the current Malik dataset.', severity: 'gap' },
      { label: 'Muwatta Malik missing English', table: 'ie_hadiths', filter: q => q.eq('collection_key', 'malik').or('translations->en.is.null,translations->en.eq.'), detail: 'English translation field.', severity: 'gap' },
      { label: 'Riyad as-Salihin missing Arabic', table: 'ie_hadiths', filter: q => q.eq('collection_key', 'riyad').or('arabic.is.null,arabic.eq.'), detail: 'Arabic text completeness check.', severity: 'gap' },
      { label: 'Riyad as-Salihin missing English', table: 'ie_hadiths', filter: q => q.eq('collection_key', 'riyad').or('translations->en.is.null,translations->en.eq.'), detail: 'English translation field.', severity: 'gap' },
      { label: 'Hadith records missing source references', table: 'ie_hadiths', filter: q => q.or('source_refs.is.null,source_refs.eq.[]'), detail: 'Records without collection/source reference metadata.', severity: 'gap' },
      { label: 'Hadith book metadata', table: 'ie_hadith_books', detail: 'Book titles/metadata rows.', severity: 'normal', zeroWarning: true },
      { label: 'Muwatta Malik missing book number', table: 'ie_hadiths', filter: q => q.eq('collection_key', 'malik').is('book_number', null), detail: 'Book numbering is absent in the imported source; only fill from a verified edition.', severity: 'gap' },
      { label: 'Muwatta Malik missing chapter number', table: 'ie_hadiths', filter: q => q.eq('collection_key', 'malik').is('chapter_number', null), detail: 'Chapter numbers are absent in the imported source; do not infer them.', severity: 'gap' },
      { label: 'Muwatta Malik missing chapter title', table: 'ie_hadiths', filter: q => q.eq('collection_key', 'malik').or('chapter_title.is.null,chapter_title.eq.'), detail: 'Chapter titles are absent in the imported source; do not invent them.', severity: 'gap' },
      { label: 'Muwatta Malik missing narrator', table: 'ie_hadiths', filter: q => q.eq('collection_key', 'malik').or('narrator.is.null,narrator.eq.'), detail: 'Narrator field completeness.', severity: 'gap' },
      { label: 'Riyad as-Salihin missing book number', table: 'ie_hadiths', filter: q => q.eq('collection_key', 'riyad').is('book_number', null), detail: 'Book numbering is absent in the imported source; only fill from a verified edition.', severity: 'gap' },
      { label: 'Riyad as-Salihin missing narrator', table: 'ie_hadiths', filter: q => q.eq('collection_key', 'riyad').or('narrator.is.null,narrator.eq.'), detail: 'Narrator field completeness.', severity: 'gap' },
      { label: 'Riyad as-Salihin missing chapter number', table: 'ie_hadiths', filter: q => q.eq('collection_key', 'riyad').is('chapter_number', null), detail: 'Chapter number completeness; retain source numbering.', severity: 'gap' },
      { label: 'Riyad as-Salihin missing chapter title', table: 'ie_hadiths', filter: q => q.eq('collection_key', 'riyad').or('chapter_title.is.null,chapter_title.eq.'), detail: 'Chapter title completeness.', severity: 'gap' },
      { label: 'Prophets missing story text', table: 'ie_prophets', filter: q => q.or('story.is.null,story.eq.'), detail: 'Reference entries need sourced narratives before being marked complete.', severity: 'gap' },
      { label: 'Prophets missing lessons', table: 'ie_prophets', filter: q => q.or('lessons.is.null,lessons.eq.[]'), detail: 'Lessons must be sourced and reviewed, not generated without references.', severity: 'gap' },
      { label: 'Prophet reference index', table: 'ie_prophets', detail: 'Reference-only index; entries still need human editorial review.', severity: 'normal' },
      { label: 'Seerah events missing descriptions', table: 'ie_seerah_events', filter: q => q.or('description.is.null,description.eq.'), detail: 'Timeline entries require source-backed narrative descriptions.', severity: 'gap' },
      { label: 'Seerah events', table: 'ie_seerah_events', detail: 'Timeline/reference entries stored.', severity: 'normal', zeroWarning: true },
      { label: 'Duas', table: 'ie_duas', detail: 'Sourced supplications library.', severity: 'normal' },
      { label: 'Duas missing Arabic', table: 'ie_duas', filter: q => q.or('arabic.is.null,arabic.eq.'), detail: 'Arabic text completeness for the supplications library.', severity: 'gap' },
      { label: 'Duas missing English', table: 'ie_duas', filter: q => q.or('translations->en->text.is.null,translations->en->text.eq.'), detail: 'English translation field completeness.', severity: 'gap' },
      { label: 'Duas missing transliteration', table: 'ie_duas', filter: q => q.or('transliteration.is.null,transliteration.eq.'), detail: 'Transliteration is only populated from reviewed, compatible sources.', severity: 'gap' },
      { label: 'Duas missing source references', table: 'ie_duas', filter: q => q.or('source_reference.is.null,source_reference.eq.'), detail: 'Every dua should have an identifiable source reference.', severity: 'gap' },
      { label: 'Duas pending editorial review', table: 'ie_duas', filter: q => q.contains('metadata', { editorial_review_status: 'pending' }), detail: 'Source-backed entries still require editorial review; database completeness is not verification.', severity: 'gap' },
      { label: 'Adhkar', table: 'ie_adhkar', detail: 'Sourced remembrance library.', severity: 'normal', zeroWarning: true },
      { label: 'Names of Allah', table: 'ie_names_of_allah', detail: 'Sourced names/meanings library.', severity: 'normal', zeroWarning: true },
      { label: 'Companions CMS articles', table: 'ie_articles', filter: q => q.ilike('slug', 'companions-%'), detail: 'CMS articles only; the separate Qur’an-based reference index is at /companions. No dedicated table exists.', severity: 'normal' },
      { label: 'Articles', table: 'ie_articles', detail: 'Total CMS records.', severity: 'normal' },
      { label: 'Published articles still unverified', table: 'ie_articles', filter: q => q.eq('status', 'published').eq('verification_status', 'unverified'), detail: 'Needs editorial review before verification.', severity: 'gap' },
      { label: 'Articles in review still unverified', table: 'ie_articles', filter: q => q.eq('status', 'review').eq('verification_status', 'unverified'), detail: 'Review queue.', severity: 'gap' },
      { label: 'Verified articles', table: 'ie_articles', filter: q => q.eq('verification_status', 'verified'), detail: 'Verification labels are not automatically granted.', severity: 'normal' },
      { label: 'Source records', table: 'ie_sources', detail: 'Source catalog entries.', severity: 'normal' },
      { label: 'Source records missing URL', table: 'ie_sources', filter: q => q.or('url.is.null,url.eq.'), detail: 'Source catalog needs a resolvable URL.', severity: 'gap' },
      { label: 'Article-source links', table: 'ie_article_sources', detail: 'Articles linked to source catalog entries.', severity: 'normal' },
      { label: 'Failed imports', table: 'ie_source_imports', filter: q => q.eq('status', 'failed'), detail: 'Includes historical failed attempts; inspect notes before retrying.', severity: 'gap' },
      { label: 'Partial imports', table: 'ie_source_imports', filter: q => q.eq('status', 'partial'), detail: 'Incomplete dataset import records.', severity: 'gap' },
      { label: 'Imports still running', table: 'ie_source_imports', filter: q => q.eq('status', 'running'), detail: 'Check for stale import records.', severity: 'gap' },
    ];
    const results = await Promise.all(checks.map(async check => {
      const result = await exactCount(sb, check.table, check.filter);
      return { label: check.label, value: result.value, detail: check.detail, severity: check.severity, zeroWarning: check.zeroWarning, error: result.error } as AuditRow;
    }));
    setRows(results);
    setLastRun(new Date().toISOString());
    setLoading(false);
  }, []);

  useEffect(() => { void run(); }, [run]);

  const issueCount = rows.filter(r => r.value === null || (r.severity === 'gap' && r.value > 0) || (r.zeroWarning && r.value === 0)).length;
  const unavailableCount = rows.filter(r => r.value === null).length;

  return (
    <section className="integrity-report">
      <div className="admin-panel-head">
        <div>
          <h3>Encyclopedia dataset audit</h3>
          <p className="admin-word-count">Read-only checks of stored dataset coverage, missing fields, source records, and import states.</p>
        </div>
        <button type="button" className="admin-secondary" onClick={() => void run()} disabled={loading}>{loading ? 'Scanning…' : 'Refresh scan'}</button>
      </div>
      <div className="admin-stats">
        <div><strong>{rows.length}</strong><span>Checks</span></div>
        <div><strong>{issueCount}</strong><span>Gaps / warnings</span></div>
        <div><strong>{unavailableCount}</strong><span>Unavailable checks</span></div>
        <div><strong>{lastRun ? new Date(lastRun).toLocaleTimeString() : '—'}</strong><span>Last scan</span></div>
      </div>
      {loading && rows.length === 0 && <p className="admin-empty">Reading dataset counts…</p>}
      <div className="admin-table">
        <div className="admin-row admin-row-header"><span>Check</span><span>Count</span><span>Assessment</span></div>
        {rows.map(row => {
          const warning = row.value === null || (row.severity === 'gap' && row.value > 0) || (row.zeroWarning && row.value === 0);
          const status = row.value === null ? 'Unavailable' : warning ? (row.value === 0 ? 'Empty dataset' : 'Needs attention') : row.zeroWarning && row.value > 0 ? 'Records present' : 'Count checked';
          return <div className="admin-row" key={row.label}>
            <span><strong>{row.label}</strong><small>{row.detail}{row.error ? ' Query error: ' + row.error : ''}</small></span>
            <span>{row.value === null ? '—' : row.value.toLocaleString()}</span>
            <span><i className={'status-pill ' + (row.value === null ? 'error' : warning ? 'warning' : 'info')}>{status}</i></span>
          </div>;
        })}
      </div>
      <p className="admin-word-count">This scan reports database completeness only. It does not authenticate religious content, validate scholarly claims, or mark any source/article verified.</p>
    </section>
  );
}
