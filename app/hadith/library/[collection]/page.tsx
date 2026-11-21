import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, ShieldCheck } from "lucide-react";
import { hadithCollections, hadithRecords } from "@/lib/hadith";

export function generateStaticParams() { return hadithCollections.map((collection) => ({ collection: collection.slug })); }

export default async function HadithCollectionPage({ params }: { params: Promise<{ collection: string }> }) {
 const { collection: slug } = await params;
 const collection = hadithCollections.find((item) => item.slug === slug);
 if (!collection) notFound();
 const records = hadithRecords.filter((item) => item.collectionSlug === slug);
 return <main className="page-shell hadith-reader-page">
  <nav className="hadith-reader-breadcrumb" aria-label="Breadcrumb"><Link href="/hadith">Hadith Explorer</Link><span>›</span><Link href="/hadith/library">Library</Link><span>›</span><span>{collection.name}</span></nav>
  <header className="page-hero hadith-reader-hero"><span className="section-kicker">MIFASK · Collection Reader</span><div className="hadith-reader-arabic" lang="ar" dir="rtl">{collection.arabic}</div><h1>{collection.name}</h1><p className="hadith-reader-compiler">Compiled by {collection.compiler}</p><p>{collection.overview}</p><div className="hadith-reader-tags">{collection.topics.map(topic=><span key={topic}>{topic}</span>)}</div></header>
  <section className="hadith-reader-status"><div><BookOpen size={20}/><div><strong>{records.length.toLocaleString()} narrations available</strong><small>Only records added to the dataset appear here.</small></div></div><span className="hadith-reader-badge">{collection.readerStatus==="available"?"Available":collection.readerStatus==="in-progress"?"In progress":"Preparing collection"}</span></section>
  <section className="section hadith-reader-section"><div className="section-heading"><div><h2>Collection contents</h2><p className="muted">Narrations, book/chapter structure, and source details</p></div></div>
  {records.length ? <div className="hadith-reader-list">{records.map(record=><article className="hadith-reader-record" key={record.id}><div className="hadith-reader-record-meta"><span>{record.collectionReference}</span><span>{record.verificationStatus}</span></div>{record.book&&<h3>{record.book}</h3>}{record.chapter&&<p className="hadith-reader-chapter">{record.chapter}</p>}{record.arabicText&&<p className="hadith-reader-text-ar" lang="ar" dir="rtl">{record.arabicText}</p>}{record.translation&&<p className="hadith-reader-translation">{record.translation}</p>}{record.narrator&&<p className="hadith-reader-narrator">Narrator: {record.narrator}</p>}<div className="hadith-reader-source"><span>Source: {record.sourceEdition||"Not specified"}</span>{record.grading&&<span>Grading: {record.grading}{record.gradingAttributedTo?" — "+record.gradingAttributedTo:""}</span>}</div></article>)}</div> : <div className="hadith-reader-empty"><ShieldCheck size={22}/><h3>Verified narration data is being prepared</h3><p>This collection page and its data structure are ready. Narration text will be added in carefully checked batches with source, reference, translation and grading attribution. We will not fill this page with invented or unverified narrations.</p><Link href="/hadith/library" className="button button-secondary">Back to collection library</Link></div>}
  </section>
  <div className="quran-source hadith-guidance"><strong>Source notes</strong><ul>{collection.sourceNotes.map(note=><li key={note}>{note}</li>)}</ul><p>MIFASK distinguishes source text, translation, commentary, and grading attribution. Editorial status does not replace scholarly judgment.</p></div>
 </main>;
}
