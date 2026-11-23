'use client';
import { useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
type Hit={source:string,title:string,text:string,link?:string};
function terms(q:string){return q.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>2).slice(0,6)}
export default function SIChatbot(){
 const [open,setOpen]=useState(false),[q,setQ]=useState(''),[loading,setLoading]=useState(false),[answer,setAnswer]=useState('');
 async function ask(e:React.FormEvent){e.preventDefault();if(!q.trim())return;setLoading(true);setAnswer('');
  try{const db=getSupabaseClient();if(!db){setAnswer('1. The knowledge database is not connected in this browser. Please explore the library pages.');return}
   const words=terms(q);const hits:Hit[]=[];
   const searches=words.slice(0,3).map(w=>Promise.all([
    db.from('ie_articles').select('title,summary,slug,content,reference_texts').eq('status','published').ilike('title',`%${w}%`).limit(3),
    db.from('ie_quran_verses').select('surah_number,ayah_number,arabic,translations').filter('translations::text','ilike',`%${w}%`).limit(3),
    db.from('ie_hadiths').select('collection_key,hadith_number,narrator,arabic,translations,source_refs').filter('translations::text','ilike',`%${w}%`).limit(3)
   ]));
   const res=await Promise.all(searches);
   for(const [a,v,h] of res){for(const x of a.data||[])hits.push({source:'MIFASK article',title:x.title,text:String(x.summary||JSON.stringify(x.content)||'').slice(0,500),link:x.slug?'/article/'+x.slug:undefined});
    for(const x of v.data||[])hits.push({source:'Qur’an',title:`Surah ${x.surah_number}, verse ${x.ayah_number}`,text:String(typeof x.translations==='string'?x.translations:JSON.stringify(x.translations||{}))+`\n${x.arabic||''}`,link:`/quran?surah=${x.surah_number}&ayah=${x.ayah_number}`});
    for(const x of h.data||[]){const txt=String(typeof x.translations==='string'?x.translations:JSON.stringify(x.translations||{}));if(txt)hits.push({source:'Hadith database',title:String(x.collection_key||'Hadith')+' · '+String(x.hadith_number||'record'),text:txt.slice(0,500)})}
   }
   const unique=hits.filter((x,i)=>hits.findIndex(y=>y.title===x.title&&y.text===x.text)===i).slice(0,5);
   if(!unique.length){setAnswer('1. I could not find a matching entry in the currently searchable MIFASK data.\n2. Try a shorter keyword, a person’s name, a Qur’an topic, or a phrase.');}
   else setAnswer('Here are the closest matches from the MIFASK data source:\n\n'+unique.map((h,i)=>`${i+1}. ${h.title} (${h.source})\n${h.text}${h.link?'\nOpen: '+h.link:''}`).join('\n\n'));
  }catch(err){setAnswer('1. I could not retrieve the data right now.\n2. Please try again shortly.');}finally{setLoading(false)}
 }
 return <div className="si-chat"><button className="si-launch" onClick={()=>setOpen(o=>!o)} aria-expanded={open}><span className="si-orb">SI</span><span>Ask SI</span><span className="si-launch-arrow">{open?'−':'+'}</span></button>{open&&<section className="si-panel" aria-label="Ask SI assistant"><header><div><strong>SI · Islamic Knowledge Assistant</strong><small>Answers retrieved from MIFASK’s library</small></div><button onClick={()=>setOpen(false)} aria-label="Close assistant">×</button></header><div className="si-content"><p className="si-intro">Ask a question. I’ll look through available MIFASK data and show numbered matches with source context.</p>{answer&&<pre className="si-answer">{answer}</pre>}</div><form onSubmit={ask}><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Ask about Qur’an, Hadith, Seerah…" aria-label="Question for SI"/><button disabled={loading||!q.trim()}>{loading?'Searching…':'Ask'}</button></form><footer>SI retrieves source records; it does not issue fatwas. Verify religious matters with qualified scholars.</footer></section>}</div>
}