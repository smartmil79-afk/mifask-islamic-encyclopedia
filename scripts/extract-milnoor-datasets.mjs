#!/usr/bin/env node
/**
 * One-time Milnoor export downloader/normalizer.
 * Migration tool only; MIFASK production must never fetch Milnoor.
 * Run: npm run extract:milnoor
 */
import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';

const SITE = 'https://milnoor.netlify.app';
const OUT = path.resolve(process.cwd(), 'data/imports');
const collections = ['bukhari','muslim','abudawud','tirmidhi','nasai','ibnmajah','malik','forty'];

function scriptData(html, id='d') {
  const match = html.match(new RegExp('<script[^>]*id="' + id + '"[^>]*>([\\s\\S]*?)</script>'));
  if (!match) throw new Error('Embedded dataset script not found: '+id);
  const raw = match[1].trim();
  try { return JSON.parse(raw); }
  catch { return JSON.parse(gunzipSync(Buffer.from(raw,'base64')).toString('utf8')); }
}
async function fetchText(url) {
  const res = await fetch(url, {headers:{'User-Agent':'MIFASK one-time migration export'},signal:AbortSignal.timeout(90000)});
  if (!res.ok) throw new Error(url+' returned '+res.status);
  return await res.text();
}
function save(name, rows, manifest={}) {
  fs.writeFileSync(path.join(OUT,name+'.json'),JSON.stringify({version:'1',manifest,records:rows},null,2)+'\n');
  console.log(name+': '+rows.length+' records');
}
async function main() {
  fs.mkdirSync(OUT,{recursive:true});
  const quranHtml=await fetchText(SITE+'/quran');
  const q=scriptData(quranHtml,'d');
  const metadata=await fetch('https://api.alquran.cloud/v1/surah',{signal:AbortSignal.timeout(60000)}).then(async r=>{if(!r.ok)throw new Error('Surah metadata API failed: '+r.status);return r.json();});
  const surahs=metadata.data;
  const surahRows=surahs.map(s=>({
    surah_number:s.number,name_arabic:s.name,name_transliteration:q.n[s.number-1],
    name_english:s.englishName,revelation_type:s.revelationType,ayah_count:s.numberOfAyahs,
    metadata:{english_name_translation:s.englishNameTranslation,source:'AlQuran Cloud metadata; Milnoor Quran text'}
  }));
  if(!Array.isArray(q.a)||q.a.length!==6236)throw new Error('Unexpected Quran verse count: '+(q.a?.length||0));
  const verses=[];let surah=1,ayah=1;
  for(let i=0;i<q.a.length;i++){
    if(ayah>q.c[surah-1]){surah++;ayah=1;}
    verses.push({surah_number:surah,ayah_number:ayah,arabic:q.a[i],transliteration:q.t[i],
      translations:{'en.pickthall':q.e1[i],'en.yusufali':q.e2[i],'ha.gumi':q.h[i]},
      audio_urls:{},metadata:{arabic_plain:q.s[i]}});
    ayah++;
  }
  save('quran_surahs',surahRows,{source_path:'/quran'});
  save('quran_verses',verses,{source_path:'/quran',translation_keys:['en.pickthall','en.yusufali','ha.gumi']});

  const collectionRows=[],bookRows=[],hadithRows=[];
  for(const route of collections){
    const html=await fetchText(SITE+'/hadith-'+route);
    const data=scriptData(html,'d');
    const c=Array.isArray(data)?data[0]:data;
    const key=c.id||route;
    collectionRows.push({collection_key:key,name:c.name,name_arabic:null,author:null,
      description:'Imported text from one-time Milnoor dataset export.',
      metadata:{source_path:'/hadith-'+route,migration_only:true}});
    const secs=c.secs||{};
    for(const [bookNo,title] of Object.entries(secs)){
      const n=Number(bookNo);if(!Number.isInteger(n)||!title)continue;
      bookRows.push({collection_key:key,book_number:n,name:title,name_arabic:null,metadata:{section_key:bookNo}});
    }
    for(let i=0;i<(c.h||[]).length;i++){
      const row=c.h[i];if(!Array.isArray(row)||row.length<4)continue;
      const [bookNo,hadithNo,arabic,english,extra]=row;
      hadithRows.push({collection_key:key,hadith_number:String(hadithNo),book_number:Number(bookNo)||null,
        chapter_number:Number(bookNo)||null,chapter_title:secs[String(bookNo)]||secs[bookNo]||'',
        arabic,translations:english?{en:english}:{},narrator:null,grading:{},
        source_refs:{source_site:SITE,source_path:'/hadith-'+route,collection_id:key,hadith_number:String(hadithNo)},
        metadata:{source_row_index:i,extra_field:extra||null}});
    }
    console.log(route+': '+(c.h||[]).length+' narrations');
  }
  save('hadith_collections',collectionRows,{source:'Milnoor hadith pages'});
  save('hadith_books',bookRows,{source:'Milnoor hadith pages'});
  save('hadiths',hadithRows,{source:'Milnoor hadith pages',routes:collections});
  console.log('EXPORT_COMPLETE',JSON.stringify({surahs:surahRows.length,verses:verses.length,collections:collectionRows.length,books:bookRows.length,hadiths:hadithRows.length}));
}
main().catch(e=>{console.error(e);process.exit(1);});
