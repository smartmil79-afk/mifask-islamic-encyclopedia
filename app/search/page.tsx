'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, SlidersHorizontal, BookOpen, Languages, History, X, ArrowUpRight } from 'lucide-react';
import { articles as fallbackArticles, categories as fallbackCategories, type Article } from '@/lib/content';
import { getSupabaseClient } from '@/lib/supabase';

type SearchResult = Article & { slug?: string; categorySlug?: string; rank?: number; referenceTexts?: string[]; verificationStatus?: string };
type DbRow = { id:string; slug:string; title:string; summary:string|null; content:any; arabic_text:string|null; reading_minutes:number|null; tags:string[]|null; featured:boolean|null; reference_texts:string[]|null; verification_status?:string; reviewer_name?:string|null; verified_at?:string|null; category_name?:string|null; category_slug?:string|null; rank?:number };

const aliases: Record<string,string[]> = {
  quran:['Qur’an','Quran','القرآن'], qur'an:['Quran','القرآن'], koran:['Qur’an','القرآن'],
  tawheed:['tawhid','توحيد','oneness of Allah'], tawhid:['tawheed','توحيد'],
  salah:['salat','prayer','الصلاة'], salat:['salah','prayer','الصلاة'], prayer:['salah','salat','الصلاة'],
  hadith:['hadeeth','حديث'], hadeeth:['hadith','حديث'],
  seerah:['sira','السيرة'], sira:['seerah','السيرة'],
  hijrah:['hijra','الهجرة'], hijra:['hijrah','الهجرة'],
  taqwa:['تقوى','God-consciousness'], iman:['faith','إيمان'], faith:['iman','إيمان'],
  zakat:['zakah','زكاة'], zakah:['zakat','زكاة'],
  dua:["du'a",'supplication','دعاء'], "du'a":['dua','supplication','دعاء'],
  adhkar:['dhikr','remembrance','أذكار'], dhikr:['adhkar','remembrance','ذكر'],
  muhammad:['Prophet Muhammad','محمد'], adam:['آدم','Prophet Adam'],
  ramadan:['رمضان','fasting'], fasting:['صيام','Ramadan']
};
const normalizeArabic=(value:string)=>value.normalize('NFD').replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه');
const normalize=(value:string)=>normalizeArabic(value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,' ')).replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
const containsArabic=(value:string)=>/[\u0600-\u06FF]/.test(value);
function termsFor(query:string){const q=normalize(query);const terms=[query];for(const word of q.split(' ')){if(aliases[word])terms.push(...aliases[word]);}return [...new Set(terms.filter(Boolean))].slice(0,4);}
function mapRow(a:DbRow):SearchResult {return {id:a.slug,title:a.title,category:a.category_name||'Islamic Knowledge',summary:a.summary||'',readTime:a.reading_minutes?a.reading_minutes+' min read':'Reading time',tag:a.tags?.[0]||'Encyclopedia',featured:Boolean(a.featured),arabic:a.arabic_text||undefined,body:Array.isArray(a.content)?a.content.map(String):[],references:a.reference_texts||[],slug:a.slug,categorySlug:a.category_slug||undefined,rank:a.rank,referenceTexts:a.reference_texts||[],verificationStatus:a.verification_status||'unverified'};}
function SearchContent(){
 const params=useSearchParams();const router=useRouter();
 const [query,setQuery]=useState(params.get('q')||'');const [mode,setMode]=useState('all');const [category,setCategory]=useState('all');const [sourceOnly,setSourceOnly]=useState(false);const [verifiedOnly,setVerifiedOnly]=useState(false);const [sort,setSort]=useState('relevance');
 const [results,setResults]=useState<SearchResult[]>([]);const [loading,setLoading]=useState(false);const [error,setError]=useState('');const [categories,setCategories]=useState(fallbackCategories);const [history,setHistory]=useState<string[]>([]);
 useEffect(()=>{setQuery(params.get('q')||'');},[params]);
 useEffect(()=>{try{const h=JSON.parse(localStorage.getItem('mifask-search-history-v1')||'[]');if(Array.isArray(h))setHistory(h.slice(0,6));}catch{}},[]);
 useEffect(()=>{const sb=getSupabaseClient();if(!sb)return;sb.from('ie_categories').select('id,slug,name,description,icon,sort_order').eq('is_active',true).order('sort_order').then(({data})=>{if(data?.length)setCategories(data.map(c=>({id:c.slug,title:c.name,subtitle:c.description||'',icon:c.icon||'✦',count:'Explore',color:'sage',href:'/category/'+c.slug})));});},[]);
 useEffect(()=>{let alive=true;const q=query.trim();if(!q){setResults([]);setError('');setLoading(false);return;}const timer=setTimeout(()=>{setLoading(true);setError('');
  (async()=>{const sb=getSupabaseClient();let found:SearchResult[]=[];
   if(sb){const expanded=termsFor(q);const calls=expanded.map(term=>sb.rpc('ie_search_published_articles',{search_query:term,result_limit:50}));const responses=await Promise.all(calls);const rows=responses.flatMap(r=>r.data||[]);const seen=new Set<string>();found=rows.filter((r:any)=>{if(seen.has(r.slug))return false;seen.add(r.slug);return true;}).map((r:any)=>mapRow(r));if(responses.some(r=>r.error)&&found.length===0)setError('Some search services are unavailable. Showing locally available content where possible.');}
   if(!found.length){found=fallbackArticles.filter(a=>{const hay=normalize([a.title,a.category,a.summary,a.tag,a.arabic||'',a.body.join(' '),a.references.join(' ')].join(' '));return termsFor(q).some(t=>hay.includes(normalize(t)));}).map(a=>({...a,slug:a.id,referenceTexts:a.references,verificationStatus:a.verificationStatus||'unverified'}));}
   if(alive){setResults(found);setLoading(false);}
  })().catch(()=>{if(alive){setError('Search could not connect. Showing local content if available.');setResults(fallbackArticles.filter(a=>normalize([a.title,a.summary,a.category,a.body.join(' '),a.references.join(' ')].join(' ')).includes(normalize(q))).map(a=>({...a,slug:a.id,referenceTexts:a.references})));setLoading(false);}});
 },350);return()=>{alive=false;clearTimeout(timer);};
 },[query]);
 const filtered=useMemo(()=>results.filter(r=>{
  if(category!=='all'&&r.categorySlug!==category&&normalize(r.category)!==normalize(categories.find(c=>c.id===category)?.title||''))return false;
  const text=normalize([r.title,r.summary,r.category,r.tag,r.body.join(' '),r.arabic||'',(r.referenceTexts||r.references).join(' ')].join(' '));
  if(mode==='arabic'&&!termsFor(q).some(t=>containsArabic(t)))return false;
  if(mode==='arabic'&&!normalizeArabic([r.arabic||'',r.body.join(' ')].join(' ')).includes(normalizeArabic(q)))return false;
  if(mode==='references'&&!normalize((r.referenceTexts||r.references).join(' ')).includes(normalize(q)))return false;
  if(mode==='transliteration'&&!termsFor(q).some(t=>text.includes(normalize(t))))return false;
  if(sourceOnly&&!(r.referenceTexts||r.references||[]).length)return false;
  if(verifiedOnly&&!['reviewed','verified'].includes(r.verificationStatus||''))return false;
  return true;
 }),[results,category,mode,sourceOnly,verifiedOnly,q,categories]);
 const sorted=[...filtered].sort((a,b)=>(b.rank||0)-(a.rank||0));
 function submit(e:React.FormEvent){e.preventDefault();const q=query.trim();if(!q)return;router.replace('/search?q='+encodeURIComponent(q));try{const h=[q,...history.filter(x=>normalize(x)!==normalize(q))].slice(0,6);localStorage.setItem('mifask-search-history-v1',JSON.stringify(h));setHistory(h);}catch{}}
 function useTerm(term:string){setQuery(term);router.replace('/search?q='+encodeURIComponent(term));}
 return <main className="advanced-search-page"><div className="advanced-search-hero"><span className="section-kicker">Phase 8 · Search intelligence</span><h1>Search <em>Islamic knowledge</em></h1><p>Search across article titles, topics, Arabic text, transliteration, summaries and references.</p><form className="advanced-search-form" onSubmit={submit}><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Try: salah, tawheed, الصبر, Hijrah…" aria-label="Search Islamic knowledge"/>{query&&<button type="button" className="clear-search" onClick={()=>{setQuery('');router.replace('/search')}} aria-label="Clear search"><X/></button>}<button type="submit">Search</button></form><div className="search-language-hint"><Languages size={15}/> Arabic, English and common transliteration variants are supported</div></div>
 <div className="advanced-search-body"><aside className="search-filter-panel"><div className="search-filter-heading"><SlidersHorizontal size={17}/><strong>Refine search</strong></div><label className="search-filter-label">Search mode</label><div className="search-mode-list">{[['all','Everything'],['arabic','Arabic text'],['transliteration','Transliteration'],['references','References']].map(([v,l])=><button key={v} className={mode===v?'chosen':''} onClick={()=>setMode(v)}>{l}</button>)}</div><label className="search-filter-label" htmlFor="search-category">Category</label><select id="search-category" value={category} onChange={e=>setCategory(e.target.value)}><option value="all">All categories</option>{categories.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select><label className="search-toggle"><input type="checkbox" checked={sourceOnly} onChange={e=>setSourceOnly(e.target.checked)}/><span>Only articles with references</span></label><label className="search-toggle"><input type="checkbox" checked={verifiedOnly} onChange={e=>setVerifiedOnly(e.target.checked)}/><span>Reviewed / verified only</span></label><label className="search-filter-label" htmlFor="search-sort">Sort</label><select id="search-sort" value={sort} onChange={e=>setSort(e.target.value)}><option value="relevance">Relevance</option></select><div className="search-filter-note">Verification labels reflect the encyclopedia’s editorial workflow, not an independent religious ruling.</div></aside>
 <section className="search-results-panel"><div className="search-results-toolbar"><div><strong>{query.trim()?loading?'Searching…':filtered.length+' results':'Start with a search'}</strong><span>{query.trim()?' for “'+query+'”':'Search across the library'}</span></div></div>
 {history.length>0&&!query.trim()&&<div className="recent-searches"><div><History size={15}/> Recent searches</div>{history.map(h=><button key={h} onClick={()=>useTerm(h)}>{h}</button>)}</div>}
 {!query.trim()&&<div className="search-suggestions"><h3>Popular starting points</h3>{['Qur’an','Salah','Tawheed','Prophet Adam','Hadith','Taqwa','Hijrah','Dua'].map(t=><button key={t} onClick={()=>useTerm(t)}>{t}<ArrowUpRight size={14}/></button>)}</div>}
 {query.trim()&&loading&&<div className="search-loading"><div className="search-pulse"/>Searching the knowledge library…</div>}
 {query.trim()&&!loading&&error&&<p className="search-warning">{error}</p>}
 {query.trim()&&!loading&&sorted.length>0&&<div className="advanced-result-list">{sorted.map(r=><article className="advanced-result-card" key={r.slug||r.id}><div className="advanced-result-meta"><span>{r.category}</span>{r.verificationStatus&&<span className={'verification-pill '+r.verificationStatus}>{r.verificationStatus.replace('_',' ')}</span>}{r.featured&&<span className="featured-pill">Featured</span>}</div><Link href={'/article/'+(r.slug||r.id)}><h2>{r.title}</h2></Link>{r.arabic&&<div className="result-arabic" dir="rtl">{r.arabic}</div>}<p>{r.summary}</p><div className="result-footer"><span><BookOpen size={14}/>{r.readTime}</span>{(r.referenceTexts||r.references).length>0&&<span>{(r.referenceTexts||r.references).length} reference(s)</span>}<Link href={'/article/'+(r.slug||r.id)}>Read article <ArrowUpRight size={14}/></Link></div>{(r.referenceTexts||r.references).length>0&&<div className="result-references">{(r.referenceTexts||r.references).slice(0,3).map((ref,i)=><span key={i}>{ref}</span>)}</div>}</article>)}</div>}
 {query.trim()&&!loading&&sorted.length===0&&<div className="search-no-results"><div className="search-empty-icon">⌕</div><h3>No matching results</h3><p>Try another spelling, a broader term, Arabic text, or remove some filters.</p><button onClick={()=>{setMode('all');setCategory('all');setSourceOnly(false);setVerifiedOnly(false);}}>Clear filters</button></div>}
 </section></div><div className="search-integrity-note"><strong>Search responsibly:</strong> search helps discover content. Always open articles and inspect their references; search ranking is not a measure of religious authenticity or scholarly authority.</div></main>;
}
export default function AdvancedSearchPage(){return <Suspense fallback={<div className="page-shell empty-state">Loading search…</div>}><SearchContent/></Suspense>}
