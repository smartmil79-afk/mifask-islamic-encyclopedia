'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { articles as fallbackArticles } from '@/lib/content';
import { getSupabaseClient } from '@/lib/supabase';
type RefArticle={slug:string;title:string;references:string[];tags:string[]};
const collections=[
 {name:'Sahih al-Bukhari',slug:'bukhari',about:'A major Sunni hadith collection; consult a specific book, chapter and numbering.'},
 {name:'Sahih Muslim',slug:'muslim',about:'A major Sunni hadith collection; numbering can vary by edition and database.'},
 {name:'Sunan Abi Dawud',slug:'abudawud',about:'A collection of reports concerning many areas of practice and law.'},
 {name:'Jamiʿ al-Tirmidhi',slug:'tirmidhi',about:'Includes reports and author commentary on grading and scholarly practice.'},
 {name:'Sunan al-Nasa’i',slug:'nasai',about:'A major collection commonly studied in hadith and fiqh.'},
 {name:'Sunan Ibn Majah',slug:'ibnmajah',about:'A collection frequently included among the six major Sunni collections.'},
 {name:'Muwattaʾ Malik',slug:'malik',about:'An early work combining reports and practice from Madinah.'}
];
export default function HadithExplorer(){
 const [query,setQuery]=useState('');
 const [library,setLibrary]=useState<RefArticle[]>([]);
 const [loading,setLoading]=useState(true);
 useEffect(()=>{const sb=getSupabaseClient();if(!sb){setLibrary(fallbackArticles.map(a=>({slug:a.id,title:a.title,references:a.references,tags:[a.tag]})));setLoading(false);return;}
 (async()=>{const {data,error}=await sb.from('ie_articles').select('slug,title,reference_texts,tags').eq('status','published');const live=(data||[]).map((a:any)=>({slug:a.slug,title:a.title,references:a.reference_texts||[],tags:a.tags||[]}));setLibrary([...live,...fallbackArticles.filter(a=>!live.some(l=>l.slug===a.id)).map(a=>({slug:a.id,title:a.title,references:a.references,tags:[a.tag]}))]);setLoading(false);})();},[]);
 const matches=useMemo(()=>{const q=query.trim().toLowerCase();return library.filter(a=>!q||[a.title,a.references.join(' '),a.tags.join(' ')].join(' ').toLowerCase().includes(q));},[library,query]);
 return <div className="page-shell hadith-page"><div className="page-hero"><span className="section-kicker">Hadith & Sunnah</span><h1>Hadith reference explorer</h1><p>Browse collection information and find encyclopedia articles containing relevant hadith references. This is a reference finder—not a hadith grading engine or full-text hadith database.</p><div className="quran-search"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search a collection, reference, topic or article…" aria-label="Search Hadith references"/></div></div>
 <section className="section"><div className="section-heading"><div><h2>Collections</h2><p className="muted">Reference links and study notes</p></div></div><div className="hadith-collection-grid">{collections.filter(c=>!query||[c.name,c.about].join(' ').toLowerCase().includes(query.toLowerCase())).map(c=><article className="hadith-collection" key={c.slug}><h3>{c.name}</h3><p>{c.about}</p><a href={'https://sunnah.com/'+c.slug} target="_blank" rel="noreferrer">Open collection index ↗</a></article>)}</div></section>
 <section className="section"><div className="section-heading"><div><h2>Articles with matching references</h2><p className="muted">{loading?'Loading library…':matches.length+' article'+(matches.length===1?'':'s')}</p></div></div>{matches.length?<div className="hadith-results">{matches.map(a=><article key={a.slug} className="hadith-result"><div><h3>{a.title}</h3><p>{a.references.length?a.references.join(' · '):'No references listed'}</p><small>{a.tags.join(' · ')}</small></div><Link href={'/article/'+a.slug}>Read article →</Link></article>)}</div>:<div className="empty-state"><h3>No matching references</h3><p>Try a collection name, a book reference, or a broader topic.</p></div>}</section>
 <div className="quran-source"><strong>Reference guidance:</strong> Hadith numberings may differ between editions and websites. A citation should identify the collection, book/chapter, narrator where available, numbering/edition, and grading attribution. Verify the report in context before relying on it.</div>
 </div>;
}
