'use client';
import { useEffect, useState } from 'react';

type Props={arabic:string;transliteration?:string;translation?:string;label?:string;audioMode?:'speech'|'recitation'};
export default function ArabicLearning({arabic,transliteration,translation,label,audioMode='speech'}:Props){
 const [showTrans,setShowTrans]=useState(true);
 const [speaking,setSpeaking]=useState(false);
 const [voices,setVoices]=useState<SpeechSynthesisVoice[]>([]);
 const [voiceName,setVoiceName]=useState('');
 const hasAudio=typeof window!=='undefined' && 'speechSynthesis' in window;
 useEffect(()=>{
  if(!hasAudio)return;
  const load=()=>setVoices(window.speechSynthesis.getVoices());
  load();
  window.speechSynthesis.addEventListener('voiceschanged',load);
  return ()=>window.speechSynthesis.removeEventListener('voiceschanged',load);
 },[hasAudio]);
 const arabicVoices=voices.filter(v=>v.lang.toLowerCase().startsWith('ar'));
 const selectedVoice=arabicVoices.find(v=>v.name===voiceName)||arabicVoices.find(v=>/sa|eg|arabic/i.test(v.lang+' '+v.name))||arabicVoices[0];
 function play(){
  if(!hasAudio)return;
  window.speechSynthesis.cancel();
  const utter=new SpeechSynthesisUtterance(arabic);
  utter.lang='ar';
  utter.rate=0.82;
  if(selectedVoice)utter.voice=selectedVoice;
  utter.onstart=()=>setSpeaking(true);
  utter.onend=()=>setSpeaking(false);
  utter.onerror=()=>setSpeaking(false);
  window.speechSynthesis.speak(utter);
 }
 function stop(){if(hasAudio)window.speechSynthesis.cancel();setSpeaking(false);}
 return <div className="arabic-learning" dir="auto">
  {label&&<div className="arabic-learning-label">{label}</div>}
  <div className="arabic-learning-script" dir="rtl" lang="ar">{arabic}</div>
  {(transliteration||translation)&&<button type="button" className="arabic-learning-toggle" onClick={()=>setShowTrans(v=>!v)}>{showTrans?'Hide':'Show'} transliteration & translation</button>}
  {showTrans&&<div className="arabic-learning-meaning">{transliteration&&<div><span className="arabic-learning-caption">Transliteration</span><p>{transliteration}</p></div>}{translation&&<div><span className="arabic-learning-caption">Translation</span><p>{translation}</p></div>}</div>}
  {audioMode==='speech'&&<div className="arabic-learning-audio-controls">
   <button type="button" className="arabic-audio-button" onClick={play} disabled={!hasAudio}>{speaking?'Replay pronunciation':'▶ Listen to Arabic'}</button>
   {speaking&&<button type="button" className="arabic-audio-button" onClick={stop}>Stop</button>}
   {arabicVoices.length>1&&<label className="arabic-learning-voice">Voice <select value={voiceName} onChange={e=>setVoiceName(e.target.value)}><option value="">Automatic Arabic voice</option>{arabicVoices.map(v=><option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}</select></label>}
   <small className="arabic-audio-note">Pronunciation uses your device's Arabic speech voice, not a recorded recitation.</small>
  </div>}
  {audioMode==='recitation'&&<span className="arabic-audio-note">Recitation audio will be provided from a verified recitation source.</span>}
 </div>;
}
