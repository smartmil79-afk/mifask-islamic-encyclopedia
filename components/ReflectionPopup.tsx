'use client';
import {useEffect,useState} from 'react';
const reflections=[
{text:'Indeed, in the remembrance of Allah do hearts find comfort.',ref:'Qur’an 13:28',url:'https://quran.com/13/28'},
{text:'Read in the name of your Lord who created.',ref:'Qur’an 96:1',url:'https://quran.com/96/1'},
{text:'And say: My Lord, increase me in knowledge.',ref:'Qur’an 20:114',url:'https://quran.com/20/114'},
{text:'So surely with hardship comes ease.',ref:'Qur’an 94:5',url:'https://quran.com/94/5'},
{text:'And whoever puts their trust in Allah, then He is sufficient for them.',ref:'Qur’an 65:3',url:'https://quran.com/65/3'}];
function socialShareLinks(q:any){const origin='https://mifask-islamic-encyclopedia-liha.vercel.app';const id=q.ref.replace(/[^0-9]/g,'-').replace(/^-|-$/g,'');const site=origin+'/reflection/'+id;const message=q.text+' — '+q.ref+'\nMIFASK Islamic Encyclopedia\n'+site;const u=encodeURIComponent(site),t=encodeURIComponent(q.text+' — '+q.ref);return [{name:'WhatsApp',label:'wa',href:'https://wa.me/?text='+encodeURIComponent(message)},{name:'Facebook',label:'f',href:'https://www.facebook.com/sharer/sharer.php?u='+u},{name:'X',label:'𝕏',href:'https://twitter.com/intent/tweet?text='+t+'&url='+u},{name:'Telegram',label:'tg',href:'https://t.me/share/url?url='+u+'&text='+t},{name:'LinkedIn',label:'in',href:'https://www.linkedin.com/sharing/share-offsite/?url='+u}]}
async function shareReflectionImage(q:any){
 const origin='https://mifask-islamic-encyclopedia-liha.vercel.app';
 const id=q.ref.replace(/[^0-9]/g,'-').replace(/^-|-$/g,'');
 const imageUrl=origin+'/reflection/'+id+'/opengraph-image';
 try{
  const response=await fetch(imageUrl);
  if(!response.ok)throw new Error('Card image unavailable');
  const blob=await response.blob();
  const bitmap=await createImageBitmap(blob);
  const canvas=document.createElement('canvas');
  canvas.width=bitmap.width;canvas.height=bitmap.height;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Image conversion unavailable');
  ctx.drawImage(bitmap,0,0);
  const jpgBlob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('JPG conversion failed')),'image/jpeg',0.92));
  const file=new File([jpgBlob],'MIFASK-reflection.jpg',{type:'image/jpeg'});
  const site=origin+'/reflection/'+id;
  const message=q.text+' — '+q.ref+'\nMIFASK Islamic Encyclopedia\n'+site;
  if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
   await navigator.share({files:[file],title:'MIFASK Islamic Encyclopedia',text:message,url:site});
   return;
  }
  const downloadUrl=URL.createObjectURL(jpgBlob);
  const a=document.createElement('a');a.href=downloadUrl;a.download='MIFASK-reflection.jpg';a.click();
  setTimeout(()=>URL.revokeObjectURL(downloadUrl),10000);
  window.open('https://wa.me/?text='+encodeURIComponent(message),'_blank');
  alert('JPG card downloaded. Attach the image in WhatsApp; the message includes a clickable MIFASK link.');
 }catch(e){console.error('Unable to share reflection JPG:',e);alert('Could not create the JPG card. Please try again.')}
}
function copyReflection(q:any){const origin='https://mifask-islamic-encyclopedia-liha.vercel.app';const id=q.ref.replace(/[^0-9]/g,'-').replace(/^-|-$/g,'');const text=q.text+' — '+q.ref+'\nMIFASK Islamic Encyclopedia\n'+origin+'/reflection/'+id;try{navigator.clipboard.writeText(text).then(()=>alert('Reflection and MIFASK link copied!')).catch(()=>fallbackCopy(text))}catch{fallbackCopy(text)}}
function fallbackCopy(text:string){const el=document.createElement('textarea');el.value=text;document.body.appendChild(el);el.select();document.execCommand('copy');el.remove();alert('Reflection and link copied!')}
export default function ReflectionPopup(){const[idx,setIdx]=useState(0),[visible,setVisible]=useState(false);useEffect(()=>{const t=setTimeout(()=>setVisible(true),8500),rot=setInterval(()=>setIdx(i=>(i+1)%reflections.length),26000);return()=>{clearTimeout(t);clearInterval(rot)}},[]);useEffect(()=>{if(!visible)return;const hide=setTimeout(()=>setVisible(false),5000);return()=>clearTimeout(hide)},[visible,idx]);if(!visible)return null;const q=reflections[idx];return <aside className="reflection-pop" aria-live="polite"><button className="reflection-close" aria-label="Dismiss reflection" onClick={()=>setVisible(false)}>×</button><span className="reflection-kicker">A moment to reflect ✦</span><p>{q.text}</p><div className="reflection-foot"><a href={q.url} target="_blank" rel="noreferrer">{q.ref} ↗</a><button onClick={()=>setIdx(i=>(i+1)%reflections.length)}>Another reflection</button><div className="reflection-socials" aria-label="Share this reflection"><button type="button" className="reflection-whatsapp-direct" onClick={()=>shareReflectionImage(q)} aria-label="Share this reflection card on WhatsApp"><span aria-hidden="true">◉</span> Share Card on WhatsApp</button><span className="reflection-share-label">More:</span>{socialShareLinks(q).slice(1).map(s=><a key={s.name} className={'reflection-social reflection-'+s.name.toLowerCase()} href={s.href} target="_blank" rel="noopener noreferrer" title={'Share via '+s.name} aria-label={'Share via '+s.name}>{s.label}</a>)}<button className="reflection-social reflection-copy" onClick={()=>copyReflection(q)} title="Copy reflection and link" aria-label="Copy reflection and link">⧉</button></div></div><small className="reflection-brand">MIFASK Islamic Encyclopedia</small></aside>}