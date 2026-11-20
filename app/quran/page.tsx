'use client';
import { useEffect, useState } from 'react';
type Surah={number:number;name:string;englishName:string;englishNameTranslation:string;numberOfAyahs:number;revelationType:string};
type Ayah={number:number;numberInSurah:number;text:string;surah?:Surah};
type ApiResponse<T>={code:number;status:string;data:T};
export default function QuranReader(){
 const [surahs,setSurahs]=useState<Surah[]>([]);
 const [surahNo,setSurahNo]=useState(1);
 const [ayahs,setAyahs]=useState<Ayah[]>([]);
 const [loading,setLoading]=useState(true);
 const [search,setSearch]=useState('');
 const [results,setResults]=useState<Ayah[]>([]);
 const [searching,setSearching]=useState(false);
 const [error,setError]=useState('');
 useEffect(()=>{fetch('https://api.alquran.cloud/v1/surah').then(r=>r.json()).then((x:ApiResponse<Surah[]>)=>{if(x.code===200)setSurahs(x.data);else throw new Error('Surah list unavailable');}).catch(()=>setError('Could not load Surah list. Please try again.')).finally(()=>setLoading(false));},[]);
 useEffect(()=>{if(!surahNo)return;setLoading(true);setError('');fetch('https://api.alquran.cloud/v1/surah/'+surahNo+'/quran-uthmani').then(r=>r.json()).then((x:ApiResponse<{ayahs:Ayah[]}>)=>{if(x.code===200)setAyahs(x.data.ayahs);else throw new Error('Surah unavailable');}).catch(()=>setError('Could not load this Surah. Check your connection and retry.')).finally(()=>setLoading(false));},[surahNo]);
 async function doSearch(e:React.FormEvent){e.preventDefault();if(!search.trim())return;setSearching(true);setError('');try{const r=await fetch('https://api.alquran.cloud/v1/search/'+encodeURIComponent(search.trim())+'/all/quran-uthmani');const x=await r.json();if(x.code===200)setResults(x.data.matches||[]);else setError('No search results available.');}catch{setError('Qur’an search is temporarily unavailable.');}finally{setSearching(false);}}
 const selected=surahs.find(s=>s.number===surahNo);
 return <div className="page-shell quran-reader"><div className="page-hero"><span className="section-kicker">Qur’an Reader</span><h1>Read & explore the Qur’an</h1><p>Browse the 114 Surahs in Arabic, or search Arabic words across the Qur’an. Verse text is loaded from AlQuran Cloud.</p><form className="quran-search" onSubmit={doSearch}><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search an Arabic word or phrase…" aria-label="Search Arabic Qur'an text"/><button className="button" type="submit" disabled={searching}>{searching?'Searching…':'Search'}</button></form></div>
 {error&&<div className="admin-error quran-error">{error}</div>}
 {search.trim()&&results.length>0&&<section className="quran-results"><div className="section-heading"><div><h2>Search matches</h2><p className="muted">{results.length} match{results.length===1?'':'es'}</p></div><button className="admin-secondary" onClick={()=>{setResults([]);setSearch('');}}>Clear</button></div>{results.map((a,i)=><div className="quran-ayah" key={a.number||i}><div className="ayah-meta">{a.surah?.englishName||'Surah'} · {a.surah?.numberInSurah||a.numberInSurah}</div><p dir="rtl" lang="ar" className="ayah-arabic">{a.text}</p></div>)}</section>}
 <section className="quran-reading"><div className="quran-controls"><label>Surah<select value={surahNo} onChange={e=>setSurahNo(Number(e.target.value))}>{surahs.map(s=><option key={s.number} value={s.number}>{s.number}. {s.englishName} — {s.englishNameTranslation}</option>)}</select></label>{selected&&<div className="surah-meta"><span>{selected.revelationType}</span><span>{selected.numberOfAyahs} ayahs</span></div>}</div>
 {selected&&<div className="surah-title"><h2>{selected.englishName}</h2><p>{selected.englishNameTranslation}</p><div dir="rtl" lang="ar">{selected.name}</div></div>}
 {loading?<div className="empty-state">Loading Qur’an text…</div>:<div className="quran-ayah-list">{ayahs.map(a=><article className="quran-ayah" key={a.number}><div className="ayah-meta"><span>Ayah {a.numberInSurah}</span><span>#{a.number}</span></div><p className="ayah-arabic" dir="rtl" lang="ar">{a.text}</p></article>)}</div>}
 <div className="quran-nav"><button className="admin-secondary" disabled={surahNo<=1} onClick={()=>setSurahNo(surahNo-1)}>← Previous Surah</button><button className="admin-secondary" disabled={surahNo>=114} onClick={()=>setSurahNo(surahNo+1)}>Next Surah →</button></div></section>
 <div className="quran-source"><strong>Text source:</strong> AlQuran Cloud · Arabic edition <code>quran-uthmani</code> · <a href="https://alquran.cloud/api" target="_blank" rel="noreferrer">API documentation</a>. Always check recitation and textual details with a trusted Mushaf.</div>
 </div>;
}
