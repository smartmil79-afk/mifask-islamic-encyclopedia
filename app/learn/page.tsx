'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Lesson = { title:string; description:string; href:string; };
type Path = { id:string; title:string; level:string; description:string; lessons:Lesson[]; };
const paths:Path[]=[
 {id:'foundations',title:'Islamic Foundations',level:'Beginner',description:'A guided starting point for core concepts and the structure of Muslim practice.',lessons:[
  {title:'The central message of Islam',description:'Begin with the purpose of worship and the message shared by the Prophets.',href:'/explore?q=Islam'},
  {title:'Tawheed',description:'Explore the concept of worshipping Allah alone and its place in Islamic belief.',href:'/article/tawheed'},
  {title:'The Five Pillars',description:'Learn the five foundational pillars and follow their dedicated topics.',href:'/article/five-pillars'},
  {title:'The Qur’an',description:'Understand what the Qur’an is and begin reading it.',href:'/quran'},
  {title:'Prophetic guidance',description:'Explore the role of the Sunnah and how Hadith reports are referenced.',href:'/hadith'}
 ]},
 {id:'quran',title:'Qur’an Study Path',level:'All levels',description:'Build a reading habit, explore surahs and learn to approach tafsir with context.',lessons:[
  {title:'Begin reading',description:'Open the reader and choose a Surah to read.',href:'/quran'},
  {title:'Explore Qur’anic themes',description:'Browse Qur’an-related articles and topics.',href:'/category/quran'},
  {title:'Reflect on a short Surah',description:'Start with a short chapter and consult trusted tafsir works.',href:'/article/surah-al-asr'},
  {title:'Check references',description:'Use the source principles to distinguish translation, tafsir and commentary.',href:'/sources'}
 ]},
 {id:'seerah',title:'Prophetic Biography',level:'Beginner',description:'Explore the Prophet’s life ﷺ and the early Muslim community through source-aware reading.',lessons:[
  {title:'The Prophets',description:'Explore the stories of Prophets in the library.',href:'/category/prophets'},
  {title:'The Seerah',description:'Browse biography and Seerah articles.',href:'/category/seerah'},
  {title:'The Hijrah',description:'Study the migration as a major historical turning point.',href:'/article/hijrah'},
  {title:'Hadith sources',description:'Find collection indexes and understand reference differences.',href:'/hadith'}
 ]},
 {id:'worship',title:'Worship & Practice',level:'Beginner',description:'Study worship topics gradually while noting where recognized schools have differing details.',lessons:[
  {title:'Prayer overview',description:'Start with a broad introduction to Salah.',href:'/article/salah'},
  {title:'Fiqh topics',description:'Explore the jurisprudence category.',href:'/category/fiqh'},
  {title:'Duas & remembrance',description:'Browse supplication and remembrance topics.',href:'/category/duas'},
  {title:'Sources & methodology',description:'Read how citations and scholarly differences are handled.',href:'/sources'}
 ]},
 {id:'character',title:'Character & Muslim Life',level:'All levels',description:'Connect learning with character, ethics, community and practical questions.',lessons:[
  {title:'Muslim life topics',description:'Browse practical and ethical topics.',href:'/category/muslim-life'},
  {title:'Companions',description:'Learn about the companions through dedicated articles.',href:'/category/companions'},
  {title:'Scholars',description:'Explore scholarly biographies and contributions.',href:'/category/scholars'},
  {title:'Explore the library',description:'Search for a question or topic to continue.',href:'/explore'}
 ]}
];
const storageKey='mifask-learning-progress-v1';
export default function LearnPage(){
 const [done,setDone]=useState<Record<string,boolean>>({});
 const [ready,setReady]=useState(false);
 useEffect(()=>{try{const saved=localStorage.getItem(storageKey);if(saved)setDone(JSON.parse(saved));}catch{}setReady(true);},[]);
 useEffect(()=>{if(ready){try{localStorage.setItem(storageKey,JSON.stringify(done));}catch{}}},[done,ready]);
 const total=paths.reduce((n,p)=>n+p.lessons.length,0);const completed=Object.values(done).filter(Boolean).length;
 const percent=total?Math.round(completed/total*100):0;
 const toggle=(id:string)=>setDone(prev=>({...prev,[id]:!prev[id]}));
 const reset=()=>setDone({});
 return <main className="page-shell learning-page"><div className="page-hero"><span className="section-kicker">Guided study</span><h1>Learning pathways</h1><p>Follow a structured route through the encyclopedia, study at your own pace, and track completed topics privately on this device.</p></div>
 <section className="learning-progress"><div className="learning-progress-top"><div><strong>Your progress</strong><p>{completed} of {total} learning steps completed</p></div><span>{percent}%</span></div><div className="learning-progress-track"><div style={{width:percent+'%'}}/></div><button type="button" className="text-link learning-reset" onClick={reset}>Reset progress</button></section>
 <div className="learning-path-grid">{paths.map(path=>{const pathDone=path.lessons.filter(l=>done[path.id+'::'+l.title]).length;return <section className="learning-path-card" key={path.id}><div className="learning-path-head"><span className="learning-level">{path.level}</span><span className="learning-path-count">{pathDone}/{path.lessons.length}</span></div><h2>{path.title}</h2><p>{path.description}</p><div className="learning-steps">{path.lessons.map((lesson,i)=>{const key=path.id+'::'+lesson.title;return <article className={done[key]?'learning-step is-done':'learning-step'} key={key}><label className="learning-check"><input type="checkbox" checked={!!done[key]} onChange={()=>toggle(key)} aria-label={'Mark '+lesson.title+' complete'}/><span>{i+1}</span></label><div className="learning-step-copy"><strong>{lesson.title}</strong><p>{lesson.description}</p><Link href={lesson.href}>Open resource ↗</Link></div></article>})}</div></section>})}</div>
 <div className="learning-note"><strong>Learning note:</strong> These pathways are study organizers, not religious rulings or a substitute for qualified teachers. Topics involving detailed rulings, differences of opinion, or authenticity should be studied with the cited sources and qualified scholarship.</div></main>;
}
