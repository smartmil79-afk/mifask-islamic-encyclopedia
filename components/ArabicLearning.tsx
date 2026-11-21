'use client';
import { useState } from 'react';

type Props={arabic:string;transliteration?:string;translation?:string;label?:string;audioMode?:'speech'|'recitation'};
export default function ArabicLearning({arabic,transliteration,translation,label,audioMode='speech'}:Props){
 const [showTrans,setShowTrans]=useState(true);
 const [speaking,setSpeaking]=useState(false);
 const hasAudio=typeof window!=='undefined' && 'speechSynthesis' in window;
 function play(){if(!hasAudio)return;window.speechSynthesis.cancel();const utter=new SpeechSynthesisUtterance(arabic);utter.lang='ar';utter.rate=0.85;utter.onstart=()=>setSpeaking(true);utter.onend=()=>setSpeaking(false);utter.onerror=()=>setSpeaking(false);window.speechSynthesis.speak(utter);}
 return <div className="arabic-learning" dir="auto">
  {label&&<div className="arabic-learning-label">{label}</div>}
  <div className="arabic-learning-script" dir="rtl" lang="ar">{arabic}</div>
  {(transliteration||translation)&&<button type="button" className="arabic-learning-toggle" onClick={()=>setShowTrans(v=>!v)}>{showTrans?'Hide':'Show'} transliteration & translation</button>}
  {showTrans&&<div className="arabic-learning-meaning">{transliteration&&<div><span className="arabic-learning-caption">Transliteration</span><p>{transliteration}</p></div>}{translation&&<div><span className="arabic-learning-caption">Translation</span><p>{translation}</p></div>}</div>}
  {audioMode==='speech'&&<button type="button" className="arabic-audio-button" onClick={play} disabled={!hasAudio||speaking}>{speaking?'Playing…':'▶ Listen to Arabic'}</button>}
  {audioMode==='recitation'&&<span className="arabic-audio-note">Recitation audio will be provided from a verified recitation source.</span>}
 </div>;
}
