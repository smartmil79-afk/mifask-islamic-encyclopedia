'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { BookOpen, Search, ArrowRight, Bookmark, Languages } from 'lucide-react';

type Collection={id:string;name:string;short:string;description:string;tradition:string;topics:string[];status:string};
const collections:Collection[]=[
 {id:'bukhari',name:'Sahih al-Bukhari',short:'البخاري',description:'A major collection of hadith compiled by Imam Muhammad ibn Isma’il al-Bukhari.',tradition:'Six major collections',topics:['Faith','Worship','Character','Transactions'],status:'Planned'},
 {id:'muslim',name:'Sahih Muslim',short:'مسلم',description:'A major collection compiled by Imam Muslim ibn al-Hajjaj.',tradition:'Six major collections',topics:['Faith','Worship','Character','Knowledge'],status:'Planned'},
 {id:'abudawud',name:'Sunan Abi Dawud',short:'أبو داود',description:'A collection especially known for narrations relevant to legal and practical topics.',tradition:'Six major collections',topics:['Prayer','Transactions','Family','Adab'],status:'Planned'},
 {id:'tirmidhi',name:'Jamiʿ al-Tirmidhi',short:'الترمذي',description:'A collection with chapter organization and transmitted grading discussions.',tradition:'Six major collections',topics:['Worship','Virtues','Knowledge','Adab'],status:'Planned'},
 {id:'nasai',name:'Sunan al-Nasa’i',short:'النسائي',description:'A collection of narrations arranged by topics and chapters.',tradition:'Six major collections',topics:['Worship','Purification','Prayer','Character'],status:'Planned'},
 {id:'ibnmajah',name:'Sunan Ibn Majah',short:'ابن ماجه',description:'A collection commonly studied alongside the other major Sunni collections.',tradition:'Six major collections',topics:['Worship','Knowledge','Trials','Adab'],status:'Planned'},
 {id:'malik',name:'Muwattaʾ Malik',short:'الموطأ',description:'An early work preserving reports and practice associated with Madinah.',tradition:'Early collection',topics:['Worship','Practice','Transactions','Adab'],status:'Planned'},
 {id:'riyad',name:'Riyad as-Salihin',short:'رياض الصالحين',description:'A thematic compilation widely read for spiritual guidance and conduct.',tradition:'Thematic collection',topics:['Character','Worship','Patience','Duas'],status:'Planned'},
];
const topics=['All topics','Faith','Worship','Character','Transactions','Knowledge','Prayer','Family','Adab','Duas','Patience'];
export default function HadithLibrary(){
 const [query,setQuery]=useState('');
 const [topic,setTopic]=useState('All topics');
 const results=useMemo(()=>collections.filter(c=>(!query||[c.name,c.short,c.description,c.topics.join(' ')].join(' ').toLowerCase().includes(query.toLowerCase()))&&(topic==='All topics'||c.topics.includes(topic))),[query,topic]);
 return <main className="page-shell hadith-library-page">
  <section className="page-hero hadith-library-hero"><span className="section-kicker">MIFASK · Hadith Library</span><h1>Hadith Collection</h1><p>Explore the collections, study narrations with source details, and build a searchable library connected to Qur’anic references and Islamic topics.</p><div className="hadith-library-actions"><Link href="/hadith" className="button button-secondary">Citation & Reference Tools</Link><Link href="/search?type=hadith" className="button button-primary">Search MIFASK <ArrowRight size={15}/></Link></div></section>
  <div className="hadith-library-notice"><strong>Library development in progress</strong><p>Collection indexes and reader structure are being prepared. Narration text will be added in verified batches with original-source references, translation attribution, and grading attribution. No unverified text or grading is presented as authoritative.</p></div>
  <section className="section hadith-library-section"><div className="section-heading"><div><h2>Browse collections</h2><p className="muted">Choose a collection to view its planned organization and availability.</p></div></div>
   <div className="hadith-library-controls"><label className="hadith-library-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search collection or topic" aria-label="Search collections"/></label><label className="hadith-library-topic">Topic<select value={topic} onChange={e=>setTopic(e.target.value)}>{topics.map(t=><option key={t}>{t}</option>)}</select></label></div>
   <div className="hadith-library-grid">{results.map(c=><article className="hadith-library-card" key={c.id}><div className="hadith-library-card-top"><span className="hadith-library-icon"><BookOpen size={19}/></span><span className="hadith-library-status">{c.status}</span></div><div className="hadith-library-arabic" lang="ar" dir="rtl">{c.short}</div><h3>{c.name}</h3><p>{c.description}</p><div className="hadith-library-tags">{c.topics.slice(0,4).map(t=><span key={t}>{t}</span>)}</div><Link className="hadith-library-open" href={'/hadith/library/'+c.id} aria-label={'Open '+c.name+' collection'}>Collection reader <ArrowRight size={14}/></Link></article>)}</div>
   {!results.length&&<div className="empty-state"><h3>No collections match</h3><p>Try another search or topic.</p></div>}
  </section>
  <section className="hadith-library-next"><div><Bookmark size={18}/><h2>Personal study tools</h2><p>Bookmarks, reading progress, Arabic/translation display, and shareable citations are planned for the reader.</p></div><div><Languages size={18}/><h2>Translation roadmap</h2><p>English first, followed by Hausa where reliable translation sources and permissions can be confirmed.</p></div></section>
  <div className="quran-source hadith-guidance"><strong>Source policy:</strong> Each narration will display collection, book/chapter, reference numbering, translation/source attribution, and grading attribution where available. Numbering may differ by edition. MIFASK will distinguish source text from commentary and will not automatically declare authenticity.</div>
 </main>;
}
