'use client';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
export default function ArticleActions({slug,title}:{slug:string;title:string}) {
  const [saved,setSaved]=useState(false);
  const [message,setMessage]=useState('');
  useEffect(()=>{try{const items=JSON.parse(localStorage.getItem('mifask-bookmarks')||'[]');setSaved(items.includes(slug));}catch{};getSupabaseClient()?.rpc('ie_record_analytics',{event_kind:'article_view',article_slug:slug});},[slug]);
  function toggle(){
    try{const items:string[]=JSON.parse(localStorage.getItem('mifask-bookmarks')||'[]');const next=saved?items.filter(x=>x!==slug):[...new Set([...items,slug])];localStorage.setItem('mifask-bookmarks',JSON.stringify(next));setSaved(!saved);setMessage(saved?'Removed from saved articles':'Saved for later');}catch{setMessage('Unable to save on this device');}
  }
  async function share(){
    const url=window.location.href;
    try{if(navigator.share){await navigator.share({title, url});}else{await navigator.clipboard.writeText(url);setMessage('Link copied');}}catch(e:any){if(e?.name!=='AbortError')setMessage('Unable to share right now');}
  }
  return <div className="article-actions"><button type="button" onClick={toggle} className="article-action">{saved?'★ Saved':'☆ Save article'}</button><button type="button" onClick={share} className="article-action">↗ Share</button>{message&&<small aria-live="polite">{message}</small>}</div>
}
