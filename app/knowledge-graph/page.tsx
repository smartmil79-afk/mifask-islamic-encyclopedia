'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';

type NodeItem={id:string;name:string;arabic?:string;type:string;description:string;connections:string[];href?:string};
const nodes:NodeItem[]=[
{id:'quran',name:'The Qur’an',arabic:'القرآن',type:'Source',description:'The Qur’an is the central scripture of Islam. Explore its reader and topic collection.',connections:['revelation','muhammad','taqwa','salah'],href:'/quran'},
{id:'revelation',name:'Revelation',arabic:'وحي',type:'Concept',description:'The concept of divine revelation and its place in Islamic belief.',connections:['quran','muhammad','prophets'],href:'/dictionary'},
{id:'muhammad',name:'Prophet Muhammad ﷺ',type:'Person',description:'The final Messenger in Islam. Explore topics related to his life and message.',connections:['quran','revelation','seerah','companions'],href:'/category/prophets'},
{id:'prophets',name:'Prophets & Messengers',arabic:'الأنبياء',type:'People',description:'Stories and teachings of the Prophets mentioned in Islamic sources.',connections:['revelation','adam','muhammad'],href:'/category/prophets'},
{id:'adam',name:'Adam عليه السلام',type:'Person',description:'Adam, described in Islamic tradition as the first human and prophet.',connections:['prophets','creation','quran'],href:'/category/prophets'},
{id:'creation',name:'Creation',type:'Topic',description:'Islamic teachings and passages about creation.',connections:['adam','quran','faith'],href:'/explore'},
{id:'seerah',name:'Seerah',arabic:'السيرة',type:'Topic',description:'Study of the life of Prophet Muhammad ﷺ, its chronology, context and lessons.',connections:['muhammad','companions','hijrah'],href:'/category/prophets'},
{id:'companions',name:'The Companions',arabic:'الصحابة',type:'People',description:'People who accompanied Prophet Muhammad ﷺ and transmitted knowledge.',connections:['muhammad','seerah','hadith'],href:'/explore'},
{id:'hadith',name:'Hadith',arabic:'حديث',type:'Source',description:'Reports attributed to the Prophet ﷺ, studied with attention to collection, wording and authenticity.',connections:['muhammad','companions','salah'],href:'/hadith'},
{id:'salah',name:'Prayer (Salah)',arabic:'الصلاة',type:'Practice',description:'Prayer as a central act of worship. Explore related Qur’anic and Hadith references.',connections:['quran','hadith','taqwa'],href:'/dictionary'},
{id:'taqwa',name:'Taqwa',arabic:'تقوى',type:'Concept',description:'A key Qur’anic concept commonly explained as God-consciousness and mindful obedience.',connections:['quran','salah','faith'],href:'/dictionary'},
{id:'faith',name:'Faith (Iman)',arabic:'إيمان',type:'Concept',description:'Belief and faith in Islamic teaching, including the articles of faith.',connections:['creation','taqwa','quran'],href:'/dictionary'},
{id:'hijrah',name:'Hijrah',arabic:'الهجرة',type:'Event',description:'The migration associated with the early Muslim community and the start of the Hijri calendar.',connections:['seerah','muhammad','companions'],href:'/explore'}
];
const types=['All','Source','Person','People','Concept','Topic','Practice','Event'];
export default function KnowledgeGraphPage(){
 const [search,setSearch]=useState('');const [type,setType]=useState('All');const [selected,setSelected]=useState('quran');
 const filtered=useMemo(()=>nodes.filter(n=>(type==='All'||n.type===type)&&(!search||[n.name,n.arabic,n.type,n.description].join(' ').toLowerCase().includes(search.toLowerCase()))),[search,type]);
 const active=nodes.find(n=>n.id===selected)||nodes[0];
 const related=active.connections.map(id=>nodes.find(n=>n.id===id)).filter(Boolean) as NodeItem[];
 return <main className="kg-page"><header className="kg-intro"><span className="section-kicker">Explore relationships</span><h1>Connected <em>Knowledge</em></h1><p>Discover how Islamic topics, sources, people, concepts and events relate to one another. Select a node to explore its connections.</p></header>
 <div className="kg-toolbar"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search knowledge nodes…" aria-label="Search knowledge nodes"/><div className="kg-filters">{types.map(t=><button key={t} className={type===t?'active':''} onClick={()=>setType(t)}>{t}</button>)}</div></div>
 <div className="kg-layout"><section className="kg-list"><div className="kg-list-head"><strong>Knowledge nodes</strong><span>{filtered.length} results</span></div>{filtered.map(n=><button key={n.id} className={'kg-node '+(selected===n.id?'selected':'')} onClick={()=>setSelected(n.id)}><span className="kg-node-type">{n.type}</span><strong>{n.name}</strong>{n.arabic&&<span className="kg-arabic">{n.arabic}</span>}<small>{n.connections.length} connections</small></button>)}{filtered.length===0&&<p className="kg-empty">No matches. Try a broader search.</p>}</section>
 <section className="kg-detail"><div className="kg-detail-top"><span className="kg-node-type">{active.type}</span><span className="kg-connection-count">{related.length} connections</span></div><h2>{active.name}</h2>{active.arabic&&<div className="kg-detail-arabic">{active.arabic}</div>}<p>{active.description}</p>{active.href&&<Link className="button" href={active.href}>Explore topic →</Link>}<h3>Connected topics</h3><div className="kg-connected">{related.map(n=><button key={n.id} onClick={()=>setSelected(n.id)}><span className="kg-node-type">{n.type}</span><strong>{n.name}</strong>{n.arabic&&<span className="kg-arabic">{n.arabic}</span>}<span className="kg-arrow">↗</span></button>)}</div><div className="kg-caveat">This is an editorial starter map. Relationships are navigation aids—not claims of equivalence, chronology, authenticity, or scholarly consensus. Each connection should be reviewed and supported by references as the encyclopedia grows.</div></section></div>
 </main>
}