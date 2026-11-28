'use client';
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Search, ShieldCheck, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";

const collections: Record<string,{name:string,arabic:string,compiler:string}> = {
 bukhari:{name:"Sahih al-Bukhari",arabic:"صحيح البخاري",compiler:"Muhammad ibn Isma’il al-Bukhari"},
 muslim:{name:"Sahih Muslim",arabic:"صحيح مسلم",compiler:"Muslim ibn al-Hajjaj"},
 abudawud:{name:"Sunan Abi Dawud",arabic:"سنن أبي داود",compiler:"Abu Dawud al-Sijistani"},
 tirmidhi:{name:"Jamiʿ al-Tirmidhi",arabic:"جامع الترمذي",compiler:"Muhammad ibn Isa al-Tirmidhi"},
 nasai:{name:"Sunan al-Nasa’i",arabic:"سنن النسائي",compiler:"Ahmad ibn Shu‘ayb al-Nasa’i"},
 ibnmajah:{name:"Sunan Ibn Majah",arabic:"سنن ابن ماجه",compiler:"Muhammad ibn Yazid Ibn Majah"},
 malik:{name:"Muwattaʾ Malik",arabic:"الموطأ",compiler:"Malik ibn Anas"},
 riyad:{name:"Riyad as-Salihin",arabic:"رياض الصالحين",compiler:"Yahya ibn Sharaf al-Nawawi"},
};
type RecordData = Record<string,any>;
function recordsFrom(data:any):RecordData[]{ if(Array.isArray(data))return data; for(const k of ["results","hadiths","items","data"])if(Array.isArray(data?.[k]))return data[k]; if(data&&typeof data==="object"&&(data.arabic||data.text_ar||data.hadith||data.english||data.translation||data.text_en))return [data];return [];}
export default function HadithCollectionPage(){
 const routeParams = useParams<{collection:string}>();
 const collectionSlug = routeParams.collection;
 const c=collections[collectionSlug];
 const sourceInfoUrl=collectionSlug==="malik"?"https://github.com/fawazahmed0/hadith-api/tree/1/editions":collectionSlug==="riyad"?"https://github.com/AhmedBaset/hadith-json/tree/70b83d6d21995bb32f8d7271cd75501be5a922a/db/by_book/other_books":"https://sahih-al-bukhari.com/api/"; const [query,setQuery]=useState(""); const [number,setNumber]=useState("1"); const [results,setResults]=useState<RecordData[]>([]); const [selected,setSelected]=useState<RecordData|null>(null); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
 const supported=true;
 async function search(term:string, directNumber?:string){setLoading(true);setError("");setSelected(null);try{const searchParams=new URLSearchParams({book:collectionSlug,q:term});if(directNumber){searchParams.delete("q");searchParams.set("number",directNumber)}const res=await fetch("/api/hadith?"+searchParams.toString());const data=await res.json();if(!res.ok)throw new Error(data?.error?.message||data?.error||"Unable to retrieve records.");const list=recordsFrom(data);setResults(list);if(directNumber&&list.length)setSelected(list[0]);if(!list.length)setError("No records found. Try another reference or search term.");}catch(e:any){setError(e.message||"Search failed.");setResults([]);}finally{setLoading(false)}}
 async function selectRecord(record:RecordData){setSelected(record);const ref=record.number||record.hadithnumber||record.hadith_number||record.reference_number;if(!ref)return;try{const params=new URLSearchParams({book:collectionSlug,number:String(ref)});const response=await fetch("/api/hadith?"+params.toString());if(response.ok){const enriched=await response.json();setSelected((current)=>current===record?{...record,...enriched}:current);}}catch{/* keep the search result readable if translation lookup fails */}}
 useEffect(()=>{if(c&&supported)search("", "1");},[collectionSlug]);
 if(!c)return <main className="page-shell"><h1>Collection not found</h1><Link href="/hadith/library">Back to library</Link></main>;
 const title=(r:RecordData)=>r.reference||r.collection_reference||r.hadith_reference||((r.book||r.collection||c.name)+" "+(r.number||r.hadith_number||""));
 const arabic=(r:RecordData)=>r.arabic||r.text_ar||r.arabic_text||r.text||r.hadith||"";
 const english=(r:RecordData)=>{const candidates=[r.english,r.text_en,r.translation,r.english_text,r.translated_text,r.translation_text,r.translations?.english,r.translations?.en,r.text?.english,r.text?.en,r.hadith?.english,r.hadith?.en];for(const value of candidates){if(typeof value==="string"&&value.trim())return value;if(value&&typeof value==="object"){const nested=value.english||value.en||value.text;if(typeof nested==="string"&&nested.trim())return nested;}}return "";};
 const chapter=(r:RecordData)=>r.chapter?.title||r.chapter_title||r.chapter||r.book_title||"";
 const grade=(r:RecordData)=>{
 const value=r.grade??r.grading;
 if(typeof value==="string")return value;
 if(value&&typeof value==="object"){
  const label=value.label??value.name??value.grade;
  return typeof label==="string"?label:"";
 }
 return "";
};
 const canonical=(r:RecordData)=>r.canonical||r.url||r.source_url||"";
 const sourceDataset=(r:RecordData)=>r.source_dataset||r.source_refs?.dataset||r.metadata?.source_dataset||"Imported source";
 const currentNum=Number(selected?.number||selected?.hadith_number||number||1);
 return <main className="page-shell hadith-reader-page">
 <nav className="hadith-reader-breadcrumb"><Link href="/hadith">Hadith Explorer</Link><span>›</span><Link href="/hadith/library">Library</Link><span>›</span><span>{c.name}</span></nav>
 <header className="page-hero hadith-reader-hero"><span className="section-kicker">MIFASK · Hadith Reader</span><div className="hadith-reader-arabic" lang="ar" dir="rtl">{c.arabic}</div><h1>{c.name}</h1><p className="hadith-reader-compiler">Compiled by {c.compiler}</p></header>
 <section className="hadith-reader-search-panel">
  <form onSubmit={e=>{e.preventDefault();search(query)}} className="hadith-reader-search-form"><label><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search Arabic text or topic" /></label><button type="submit" disabled={loading||!query.trim()||!supported}>{loading?"Searching…":"Search"}</button></form>
  <form onSubmit={e=>{e.preventDefault();search("",number)}} className="hadith-reader-number-form"><label>Jump to hadith number<input inputMode="numeric" pattern="[0-9]*" value={number} onChange={e=>setNumber(e.target.value)} placeholder="Hadith number" /></label><button type="submit" disabled={loading||!number.trim()||!supported}>Open</button></form>
  {!supported&&<p className="hadith-reader-unavailable">Reader data is not yet connected for this collection.</p>}
 </section>
 {loading&&!selected&&<div className="hadith-reader-loading"><span className="hadith-reader-spinner"/>Loading Hadith…</div>}
 {error&&<div className="hadith-reader-empty"><p>{error}</p></div>}
 {selected&&<article className="hadith-reader-record hadith-reader-selected"><div className="hadith-reader-record-meta"><span>{title(selected)||"Hadith record"}</span>{grade(selected)&&<span>{grade(selected)}</span>}</div>{chapter(selected)&&<h3>{chapter(selected)}</h3>}<p className="hadith-reader-text-ar" lang="ar" dir="rtl">{arabic(selected)||"Arabic text unavailable for this record."}</p>{<section className="hadith-reader-translation-block"><h4>English translation</h4>{english(selected)?<><p className="hadith-reader-translation">{english(selected)}</p>{selected.translationSource&&<small className="hadith-reader-translation-source">Translation source: {selected.translationSource}</small>}</>:<p className="hadith-reader-translation-unavailable">An English translation is not available in the returned source record for this narration.</p>}</section>}<div className="hadith-reader-navigation"><button type="button" onClick={()=>{const n=Math.max(1,currentNum-1);setNumber(String(n));search("",String(n))}} disabled={loading||currentNum<=1}><ChevronLeft size={17}/>Previous</button><span>Reference {currentNum||1}</span><button type="button" onClick={()=>{const n=currentNum+1;setNumber(String(n));search("",String(n))}} disabled={loading}><span>Next</span><ChevronRight size={17}/></button></div><div className="hadith-reader-source"><span>Source dataset: {sourceDataset(selected)}</span>{canonical(selected)&&<a href={canonical(selected)} target="_blank" rel="noreferrer">Source record <ExternalLink size={14}/></a>}</div></article>}
 {results.length>0&&!selected&&<section className="section hadith-reader-section"><h2>Search results ({results.length})</h2><div className="hadith-reader-list">{results.map((r,i)=><button className="hadith-reader-result" key={i} onClick={()=>selectRecord(r)}><strong>{title(r)||"Hadith record"}</strong><p>{chapter(r)}</p><span>{arabic(r).slice(0,180)}{arabic(r).length>180?"…":""}</span></button>)}</div></section>}
 <details className="hadith-reader-source-policy"><summary><ShieldCheck size={19}/><strong>Source &amp; attribution</strong></summary><div><p>Muwatta Malik and Riyad as-Salihin are served from MIFASK’s local database copies, with source references retained. Other collections use their configured source APIs. MIFASK does not claim source texts as its own, and imported records are not automatically marked scholarly-verified. Search and metadata are not a substitute for scholarly review.</p><a href={sourceInfoUrl} target="_blank" rel="noreferrer">View upstream source <ExternalLink size={13}/></a></div></details>
 </main>;
}