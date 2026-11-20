'use client';
import { useEffect, useState } from 'react';
import { articles as fallbackArticles, type Article } from '@/lib/content';
import { getSupabaseClient } from '@/lib/supabase';
import ArticleCard from '@/components/ArticleCard';
export default function SavedPage(){
 const [saved,setSaved]=useState<Article[]>([]);
 const [loading,setLoading]=useState(true);
 async function load(){
  let ids:string[]=[];try{ids=JSON.parse(localStorage.getItem('mifask-bookmarks')||'[]');}catch{}
  if(!ids.length){setSaved([]);setLoading(false);return;}
  const fallback=fallbackArticles.filter(a=>ids.includes(a.id));
  const sb=getSupabaseClient();if(sb){
   const {data}=await sb.from('ie_articles').select('slug,title,summary,content,arabic_text,reading_minutes,tags,featured,reference_texts,verification_status,reviewer_name,verified_at,category:ie_categories(name,slug)').eq('status','published').in('slug',ids);
   const mapped=(data||[]).map((a:any)=>{const cat=Array.isArray(a.category)?a.category[0]:a.category;return {id:a.slug,title:a.title,category:cat?.name||'Islamic Knowledge',summary:a.summary||'',readTime:a.reading_minutes?(a.reading_minutes+' min read'):'Reading time',tag:a.tags?.[0]||'Encyclopedia',featured:Boolean(a.featured),arabic:a.arabic_text||undefined,body:Array.isArray(a.content)?a.content.map(String):[],references:a.reference_texts||[],verificationStatus:a.verification_status||'unverified',reviewerName:a.reviewer_name||undefined,verifiedAt:a.verified_at||undefined} as Article;});
   setSaved([...mapped,...fallback.filter(x=>!mapped.some(m=>m.id===x.id))]);
  }else setSaved(fallback);
  setLoading(false);
 }
 useEffect(()=>{load();},[]);
 function clear(){localStorage.removeItem('mifask-bookmarks');setSaved([]);}
 return <div className="page-shell"><div className="page-hero"><span className="section-kicker">Your reading list</span><h1>Saved articles</h1><p>Articles saved on this device are kept privately in your browser.</p></div><section className="section">{loading?<div className="empty-state">Loading saved articles…</div>:saved.length?<><div className="saved-toolbar"><p className="muted">{saved.length} saved article{saved.length===1?'':'s'}</p><button className="admin-secondary" onClick={clear}>Clear saved list</button></div><div className="article-grid">{saved.map(a=><ArticleCard key={a.id} article={a}/>)}</div></>:<div className="empty-state"><h3>No saved articles yet</h3><p>Open an article and tap “Save article” to add it to your reading list.</p><a className="button button-outline" href="/explore">Explore the encyclopedia →</a></div>}</section></div>;
}
