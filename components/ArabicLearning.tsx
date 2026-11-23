'use client';
import { useEffect, useState } from 'react';

type Props={arabic:string;transliteration?:string;translation?:string;label?:string;audioMode?:'speech'|'recitation'};
type AudioLanguage='ar'|'en';
export default function ArabicLearning({arabic,transliteration,translation,label,audioMode='speech'}:Props){
 const [showTrans,setShowTrans]=useState(true);
 const [speaking,setSpeaking]=useState(false);
 const [speakingLanguage,setSpeakingLanguage]=useState<AudioLanguage|null>(null);
 const [voices,setVoices]=useState<SpeechSynthesisVoice[]>([]);
 const hasAudio=typeof window!=='undefined' && 'speechSynthesis' in window;
 useEffect(()=>{
  if(!hasAudio)return;
  const load=()=>setVoices(window.speechSynthesis.getVoices());
  load();
  window.speechSynthesis.addEventListener('voiceschanged',load);
  return ()=>window.speechSynthesis.removeEventListener('voiceschanged',load);
 },[hasAudio]);
 const chooseVoice=(lang:AudioLanguage)=>{
  const matches=voices.filter(v=>v.lang.toLowerCase().startsWith(lang));
  if(lang==='ar')return matches.find(v=>/arabic|ar-sa|ar-eg|saudi|egypt/i.test(v.name+' '+v.lang))||matches[0];
  return matches.find(v=>/english.*(uk|united kingdom)|en-gb/i.test(v.name+' '+v.lang))||matches.find(v=>/english.*(us|united states)|en-us/i.test(v.name+' '+v.lang))||matches[0];
 };
 function play(text:string,lang:AudioLanguage){
  if(!hasAudio||!text?.trim())return;
  const synth=window.speechSynthesis;
  synth.cancel();
  // Some mobile browsers need the speech queue explicitly resumed after cancel.
  synth.resume();
  const utter=new SpeechSynthesisUtterance(text.trim());
  utter.lang=lang==='ar'?'ar':'en';
  utter.rate=lang==='ar'?0.82:0.92;
  const voice=chooseVoice(lang);
  if(voice)utter.voice=voice;
  utter.onstart=()=>{setSpeaking(true);setSpeakingLanguage(lang)};
  utter.onend=()=>{setSpeaking(false);setSpeakingLanguage(null)};
  utter.onerror=()=>{setSpeaking(false);setSpeakingLanguage(null)};
  setSpeakingLanguage(lang);
  synth.speak(utter);
 }
 function stop(){if(hasAudio)window.speechSynthesis.cancel();setSpeaking(false);setSpeakingLanguage(null);}
 return <div className="arabic-learning" dir="auto">
  {label&&<div className="arabic-learning-label">{label}</div>}
  <div className="arabic-learning-script" dir="rtl" lang="ar">{arabic}</div>
  {(transliteration||translation)&&<button type="button" className="arabic-learning-toggle" onClick={()=>setShowTrans(v=>!v)}>{showTrans?'Hide':'Show'} transliteration & translation</button>}
  {showTrans&&<div className="arabic-learning-meaning">{transliteration&&<div><span className="arabic-learning-caption">Transliteration</span><p>{transliteration}</p></div>}{translation&&<div><span className="arabic-learning-caption">Translation</span><p>{translation}</p></div>}</div>}
  {audioMode==='speech'&&<div className="arabic-learning-audio-controls">
   <button type="button" className="arabic-audio-button" onClick={()=>play(arabic,'ar')} disabled={!hasAudio||!arabic?.trim()}>{speaking&&speakingLanguage==='ar'?'▶ Replay Arabic':'▶ Listen to Arabic'}</button>
   {translation&&<button type="button" className="arabic-audio-button arabic-audio-button-english" onClick={()=>play(translation,'en')} disabled={!hasAudio||!translation.trim()}>{speaking&&speakingLanguage==='en'?'▶ Replay English':'▶ Listen to English'}</button>}
   {speaking&&<button type="button" className="arabic-audio-button arabic-audio-button-stop" onClick={stop}>■ Stop audio</button>}
   <small className="arabic-audio-note">Audio uses your device's speech voice. It is spoken audio, not a recorded recitation.</small>
  </div>}
  {audioMode==='recitation'&&<span className="arabic-audio-note">Recitation audio will be provided from a verified recitation source.</span>}
 </div>;
}
