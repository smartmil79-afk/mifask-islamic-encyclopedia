import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const QENC = "https://quranenc.com/api/v1";
const ALQURAN = "https://api.alquran.cloud/v1";

async function json(url:string) {
  const r=await fetch(url,{cache:"no-store",headers:{"User-Agent":"MIFASK-Islamic-Encyclopedia/1.0"}});
  if(!r.ok) throw new Error(`Upstream ${r.status}: ${url}`);
  return r.json();
}
export async function POST(req:Request) {
 try {
  const token=(req.headers.get("authorization")||"").replace(/^Bearer /,"");
  if(!token) return NextResponse.json({error:"Authentication required"},{status:401});
  if(!supabaseUrl||!anonKey) return NextResponse.json({error:"Server database configuration missing"},{status:500});
  const auth=createClient(supabaseUrl,anonKey,{auth:{persistSession:false}});
  const {data:user,error:userError}=await auth.auth.getUser(token);
  if(userError||!user.user) return NextResponse.json({error:"Invalid session"},{status:401});
  const db=createClient(supabaseUrl,anonKey,{auth:{persistSession:false},global:{headers:{Authorization:"Bearer "+token}}});
  const {data:admin,error:adminError}=await db.from("ie_admins").select("active,role").eq("user_id",user.user.id).maybeSingle();
  if(adminError||!admin?.active) return NextResponse.json({error:"Administrator access required"},{status:403});
  const body=await req.json().catch(()=>({}));
  const start=Math.max(1,Math.min(114,Number(body.start)||1));
  const end=Math.max(start,Math.min(114,Number(body.end)||Math.min(start+9,114)));
  if(end-start>9) return NextResponse.json({error:"Import batches are limited to 10 surahs."},{status:400});
  const [surahList,translationList]=await Promise.all([json(ALQURAN+"/surah"),json(QENC+"/translations/list/en")]);
  if(surahList.code!==200||!Array.isArray(surahList.data)) throw new Error("Surah metadata source unavailable");
  const editions=translationList.translations||translationList.result||[];
  const edition=editions.find((x:any)=>x.key==="english_saheeh");
  const version=edition?.version||edition?.last_update||"version not provided by API";
  const sourceUrl="https://quranenc.com/api/v1/translation/sura/english_saheeh/{surah}";
  const {data:imp,error:impErr}=await db.from("ie_source_imports").insert({
   source_name:"QuranEnc English Saheeh + Arabic text",source_site:"https://quranenc.com",
   source_path:sourceUrl,dataset_key:"quran-english-saheeh",import_version:String(version),
   status:"running",records_total:0,records_imported:0,records_skipped:0,
   source_manifest:{translation_key:"english_saheeh",publisher:edition?.title||"QuranEnc.com",version,terms:"Republish unchanged, retain publisher/source/version/transcript info, and update to latest version.",batch:{start,end}},
   started_at:new Date().toISOString()
  }).select("id").single();
  if(impErr) throw impErr;
  const importId=imp.id;
  const verseRows:any[]=[]; const metaRows:any[]=[];
  for(let n=start;n<=end;n++){
   const meta=surahList.data[n-1];
   const translated=await json(`${QENC}/translation/sura/english_saheeh/${n}`);
   const result=translated.result||translated.data||translated;
   if(!Array.isArray(result)||!result.length) throw new Error(`Translation source returned no verses for Surah ${n}`);
   metaRows.push({surah_number:n,name_arabic:meta.name,name_transliteration:meta.englishName,name_english:meta.englishNameTranslation,revelation_type:meta.revelationType,ayah_count:meta.numberOfAyahs,metadata:{source:"AlQuran Cloud Surah metadata",source_url:"https://api.alquran.cloud/v1/surah",imported_at:new Date().toISOString()},source_import_id:importId});
   for(const v of result){
    const ayah=Number(v.aya); if(!ayah||!v.arabic_text||!v.translation) throw new Error(`Incomplete verse ${n}:${v.aya}`);
    verseRows.push({surah_number:n,ayah_number:ayah,arabic:v.arabic_text,translations:{en:{text:v.translation,footnotes:v.footnotes||"",edition:"english_saheeh",publisher:edition?.title||"QuranEnc.com",version:String(version),source_url:"https://quranenc.com"}},audio_urls:{},metadata:{source:"QuranEnc.com",translation_key:"english_saheeh",imported_at:new Date().toISOString()},source_import_id:importId});
   }
  }
  const {error:surahError}=await db.from("ie_quran_surahs").upsert(metaRows,{onConflict:"surah_number"});
  if(surahError) throw surahError;
  for(let offset=0;offset<verseRows.length;offset+=400){
   const {error}=await db.from("ie_quran_verses").upsert(verseRows.slice(offset,offset+400),{onConflict:"surah_number,ayah_number"});
   if(error) throw error;
  }
  const {error:finishError}=await db.from("ie_source_imports").update({status:"completed",records_total:verseRows.length,records_imported:verseRows.length,records_skipped:0,completed_at:new Date().toISOString(),notes:"Arabic text and English translation imported unchanged from QuranEnc; surah metadata from AlQuran Cloud. Attribution and translation version preserved in each record."}).eq("id",importId);
  if(finishError) throw finishError;
  return NextResponse.json({success:true,start,end,surahs:metaRows.length,verses:verseRows.length,translation:"english_saheeh",version,importId});
 } catch(e:any) {
  console.error("Quran import failed",e);
  return NextResponse.json({error:e?.message||"Qur'an import failed"},{status:500});
 }
}
