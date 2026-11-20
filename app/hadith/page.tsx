'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Copy, ExternalLink, BookOpen, Search } from 'lucide-react';
import { articles as fallbackArticles } from '@/lib/content';
import { getSupabaseClient } from '@/lib/supabase';

type RefArticle={slug:string;title:string;references:string[];tags:string[]};
type Collection={name:string;slug:string;about:string;note:string};
const collections:Collection[]=[
 {name:'Sahih al-Bukhari',slug:'bukhari',about:'A major Sunni hadith collection.',note:'Reference numbering and chapter headings can differ by edition.'},
 {name:'Sahih Muslim',slug:'muslim',about:'A major Sunni hadith collection.',note:'Consult the report with its surrounding context and edition details.'},
 {name:'Sunan Abi Dawud',slug:'abudawud',about:'Reports covering many areas of worship, conduct and law.',note:'Do not assume every report has the same grading.'},
 {name:'Jamiʿ al-Tirmidhi',slug:'tirmidhi',about:'Reports, chapter headings and transmitted grading commentary.',note:'Where grading is quoted, preserve who attributed it.'},
 {name:'Sunan al-Nasa’i',slug:'nasai',about:'A collection commonly studied in hadith and fiqh.',note:'Numbering may vary between editions.'},
 {name:'Sunan Ibn Majah',slug:'ibnmajah',about:'Often included among the six major Sunni collections.',note:'Check report context and grading from qualified sources.'},
 {name:'Muwattaʾ Malik',slug:'malik',about:'An early work reflecting reports and practice associated with Madinah.',note:'Different recensions and editions may have differing references.'}
];
const normalize=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/[’ʿ]/g,"'").trim();
export default function HadithExplorer(){
 const [query,setQuery]=useState('');
 const [collectionFilter,setCollectionFilter]=useState('all');
 const [library,setLibrary]=useState<RefArticle[]>([]);
 const [loading,setLoading]=useState(true);
 const [citationCollection,setCitationCollection]=useState('Sahih al-Bukhari');
 const [book,setBook]=useState('');
 const [chapter,setChapter]=useState('');
 const [number,setNumber]=useState('');
 const [narrator,setNarrator]=useState('');
 const [grading,setGrading]=useState('');
 const [gradingSource,setGradingSource]=useState('');
 const [edition,setEdition]=useState('');
 const [copied,setCopied]=useState(false);

 useEffect(()=>{const sb=getSupabaseClient();if(!sb){setLibrary(fallbackArticles.map(a=>({slug:a.id,title:a.title,references:a.references,tags:[a.tag]})));setLoading(false);return;}
 (async()=>{try{const {data,error}=await sb.from('ie_articles').select('slug,title,reference_texts,tags').eq('status','published');if(error)throw error;const live=(data||[]).map((a:any)=>({slug:a.slug,title:a.title,references:a.reference_texts||[],tags:a.tags||[]}));setLibrary([...live,...fallbackArticles.filter(a=>!live.some(l=>l.slug===a.id)).map(a=>({slug:a.id,title:a.title,references:a.references,tags:[a.tag]}))]);}catch{setLibrary(fallbackArticles.map(a=>({slug:a.id,title:a.title,references:a.references,tags:[a.tag]})));}finally{setLoading(false);}})();},[]);

 const matches=useMemo(()=>{const q=normalize(query);return library.filter(a=>{const text=normalize([a.title,a.references.join(' '),a.tags.join(' ')].join(' '));const queryMatch=!q||text.includes(q);const collectionMatch=collectionFilter==='all'||normalize(a.references.join(' ')).includes(normalize(collections.find(c=>c.slug===collectionFilter)?.name||collectionFilter))||normalize(a.references.join(' ')).includes(collectionFilter);return queryMatch&&collectionMatch;});},[library,query,collectionFilter]);
 const citation=useMemo(()=>{const parts=[citationCollection];if(book.trim())parts.push('Book: '+book.trim());if(chapter.trim())parts.push('Chapter: '+chapter.trim());if(number.trim())parts.push('Hadith no.: '+number.trim());if(narrator.trim())parts.push('Narrator: '+narrator.trim());if(grading.trim())parts.push('Grading: '+grading.trim()+(gradingSource.trim()?' (attributed to '+gradingSource.trim()+')':''));if(edition.trim())parts.push('Edition/source: '+edition.trim());return parts.join('; ')+'.';},[citationCollection,book,chapter,number,narrator,grading,gradingSource,edition]);
 async function copyCitation(){try{await navigator.clipboard.writeText(citation);setCopied(true);setTimeout(()=>setCopied(false),1800);}catch{setCopied(false);}}
 return <div className="page-shell hadith-page">
  <div className="page-hero"><span className="section-kicker">Hadith & Sunnah · Phase 10</span><h1>Hadith research & reference explorer</h1><p>Explore collection indexes, search encyclopedia articles that contain references, and build a structured citation. This is not a full-text hadith database or an automated grading/authentication engine.</p><div className="hadith-search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search collection, reference, topic or article…" aria-label="Search Hadith references"/></div></div>
  <section className="section hadith-section"><div className="section-heading"><div><h2>Collection indexes</h2><p className="muted">External reference sources · open in a new tab</p></div></div><div className="hadith-collection-grid">{collections.filter(c=>!query||normalize([c.name,c.about].join(' ')).includes(normalize(query))).map(c=><article className="hadith-collection" key={c.slug}><div className="hadith-collection-icon"><BookOpen size={19}/></div><h3>{c.name}</h3><p>{c.about}</p><small>{c.note}</small><a href={'https://sunnah.com/'+c.slug} target="_blank" rel="noreferrer">Browse index <ExternalLink size={13}/></a></article>)}</div></section>
  <section className="section hadith-section"><div className="section-heading"><div><h2>Reference finder</h2><p className="muted">{loading?'Loading library…':matches.length+' matching article'+(matches.length===1?'':'s')}</p></div></div><div className="hadith-filter-row"><label>Collection filter<select value={collectionFilter} onChange={e=>setCollectionFilter(e.target.value)}><option value="all">All collections / references</option>{collections.map(c=><option value={c.slug} key={c.slug}>{c.name}</option>)}</select></label></div>{matches.length?<div className="hadith-results">{matches.map(a=><article key={a.slug} className="hadith-result"><div><h3>{a.title}</h3><p>{a.references.length?a.references.join(' · '):'No references listed'}</p><small>{a.tags.join(' · ')}</small></div><Link href={'/article/'+a.slug}>Read article →</Link></article>)}</div>:<div className="empty-state"><h3>No matching references</h3><p>Try a broader topic or select all collections.</p></div>}</section>
  <section className="section hadith-section"><div className="section-heading"><div><h2>Citation builder</h2><p className="muted">Fill only details you have verified from the source.</p></div></div><div className="hadith-citation-builder"><div className="hadith-citation-fields"><label>Collection<select value={citationCollection} onChange={e=>setCitationCollection(e.target.value)}>{collections.map(c=><option key={c.name}>{c.name}</option>)}</select></label><label>Book<input value={book} onChange={e=>setBook(e.target.value)} placeholder="Book name / number"/></label><label>Chapter<input value={chapter} onChange={e=>setChapter(e.target.value)} placeholder="Chapter heading or number"/></label><label>Hadith number<input value={number} onChange={e=>setNumber(e.target.value)} placeholder="Number in chosen edition"/></label><label>Narrator (if confirmed)<input value={narrator} onChange={e=>setNarrator(e.target.value)} placeholder="Narrator name"/></label><label>Grading (optional)<input value={grading} onChange={e=>setGrading(e.target.value)} placeholder="e.g. Sahih / Hasan / Da'if"/></label><label>Grading attributed to<input value={gradingSource} onChange={e=>setGradingSource(e.target.value)} placeholder="Scholar / editor / source"/></label><label>Edition or source URL / details<input value={edition} onChange={e=>setEdition(e.target.value)} placeholder="Edition, site, link or date accessed"/></label></div><div className="hadith-citation-preview"><span className="section-kicker">Citation preview</span><p>{citation}</p><button type="button" onClick={copyCitation}><Copy size={15}/>{copied?'Copied':'Copy citation'}</button></div></div></section>
  <div className="quran-source hadith-guidance"><strong>Research integrity:</strong> Hadith numbering differs across editions and websites. Do not present a grading without an identifiable attribution. This tool formats the details entered by you; it does not verify the report, narrator, grading, or authenticity. Check the original source and context, and consult qualified scholarship for religious conclusions.</div>
 </div>;
}
