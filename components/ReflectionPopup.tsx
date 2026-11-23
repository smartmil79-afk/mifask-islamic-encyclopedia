'use client';
import { useEffect, useState } from 'react';
const reflections = [
 {text:'Indeed, in the remembrance of Allah do hearts find comfort.',ref:'Qur’an 13:28',url:'https://quran.com/13/28'},
 {text:'Read in the name of your Lord who created.',ref:'Qur’an 96:1',url:'https://quran.com/96/1'},
 {text:'And say: My Lord, increase me in knowledge.',ref:'Qur’an 20:114',url:'https://quran.com/20/114'},
 {text:'So surely with hardship comes ease.',ref:'Qur’an 94:5',url:'https://quran.com/94/5'},
 {text:'And whoever puts their trust in Allah, then He is sufficient for them.',ref:'Qur’an 65:3',url:'https://quran.com/65/3'}
];
export default function ReflectionPopup(){
 const [idx,setIdx]=useState(0); const [visible,setVisible]=useState(false);
 useEffect(()=>{const t=setTimeout(()=>setVisible(true),8500);const rot=setInterval(()=>setIdx(i=>(i+1)%reflections.length),26000);return()=>{clearTimeout(t);clearInterval(rot)}},[]);
 if(!visible)return null; const q=reflections[idx];
 return <aside className="reflection-pop" aria-live="polite"><button className="reflection-close" aria-label="Dismiss reflection" onClick={()=>setVisible(false)}>×</button><span className="reflection-kicker">A moment to reflect ✦</span><p>{q.text}</p><div className="reflection-foot"><a href={q.url} target="_blank" rel="noreferrer">{q.ref} ↗</a><button onClick={()=>setIdx(i=>(i+1)%reflections.length)}>Another reflection</button></div></aside>
}