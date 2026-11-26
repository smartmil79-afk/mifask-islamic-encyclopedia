import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const malikBase = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@df57907be35291c91ad6a6691180e22ca9920784/editions";
const riyadUrl = "https://raw.githubusercontent.com/AhmedBaset/hadith-json/70b83d6d21995bb32f8d7271cd75501be5a922a/db/by_book/other_books/riyad_assalihin.json";

function records(data:any):any[] {
  if(Array.isArray(data)) return data;
  for(const key of ["hadiths","results","items","data"]) if(Array.isArray(data?.[key])) return data[key];
  return [];
}
function textValue(record:any, keys:string[]):string {
  for(const key of keys) {
    const value=record?.[key];
    if(typeof value==="string"&&value.trim())return value.trim();
    if(value&&typeof value==="object"&&typeof value.text==="string")return value.text.trim();
  }
  return "";
}
function numberValue(record:any,index:number):string {
  const n=record?.number??record?.hadith_number??record?.hadithnumber??record?.idInBook??record?.id??index+1;
  return String(n);
}
async function fetchJson(url:string) {
  const res=await fetch(url,{headers:{"User-Agent":"MIFASK-Islamic-Encyclopedia data-import"},cache:"no-store"});
  if(!res.ok)throw new Error(`Upstream returned ${res.status}: ${url}`);
  return res.json();
}
async function importCollection(admin:any,key:string,sourceName:string,sourceUrl:string,raw:any,rows:any[]) {
  const sourceRevision=key==="malik"?"df57907be35291c91ad6a6691180e22ca9920784":"70b83d6d21995bb32f8d7271cd75501be5a922a";
  const repositoryLicenseUrl=key==="malik"?"https://github.com/fawazahmed0/hadith-api/blob/df57907be35291c91ad6a6691180e22ca9920784/LICENSE":null;
  const repositoryReadmeUrl=key==="riyad"?"https://github.com/AhmedBaset/hadith-json/blob/70b83d6d21995bb32f8d7271cd75501be5a922a/README.md":null;
  const {data:imp,error:impErr}=await admin.from("ie_source_imports").insert({
    source_name:sourceName,source_site:sourceUrl,source_path:sourceUrl,dataset_key:key,
    import_version:`git:${sourceRevision}`,status:"running",records_total:rows.length,records_imported:0,records_skipped:0,
    source_manifest:{
      collection:key,
      source_url:sourceUrl,
      source_revision:sourceRevision,
      method:"server-side batch import",
      source_hash:null,
      source_hash_status:"not_supplied",
      license_terms_url:null,
      rights_review_status:"unresolved",
      repository_license_url:repositoryLicenseUrl,
      repository_readme_url:repositoryReadmeUrl
    },
    started_at:new Date().toISOString()
  }).select("id").single();
  if(impErr)throw impErr;
  const importId=imp.id;
  const metadata={
    imported_from:sourceUrl,source_dataset:sourceName,imported_at:new Date().toISOString(),
    independent_copy:true,reader_api_source:"MIFASK Supabase database"
  };
  const {error:collectionErr}=await admin.from("ie_hadith_collections").upsert({
    collection_key:key,name:key==="malik"?"Muwatta Malik":"Riyad as-Salihin",
    name_arabic:key==="malik"?"الموطأ":"رياض الصالحين",
    author:key==="malik"?"Imam Malik ibn Anas":"Imam Yahya ibn Sharaf al-Nawawi",
    description:key==="malik"?"Hadith and reports associated with the Muwatta of Imam Malik.":"The thematic collection Riyad as-Salihin.",
    metadata,source_import_id:importId,updated_at:new Date().toISOString()
  },{onConflict:"collection_key"});
  if(collectionErr)throw collectionErr;
  let imported=0;
  for(let offset=0;offset<rows.length;offset+=400){
    const batch=rows.slice(offset,offset+400);
    const payload=batch.map((r:any)=>({
      collection_key:key,hadith_number:String(r.hadith_number),
      book_number:r.book_number??null,chapter_number:r.chapter_number??null,
      chapter_title:r.chapter_title??null,arabic:r.arabic||null,
      translations:r.translations||{},narrator:r.narrator||null,
      grading:{},source_refs:r.source_refs||{dataset:sourceName,url:sourceUrl,number:String(r.hadith_number)},
      metadata:{...metadata,...(r.metadata||{})},source_import_id:importId,updated_at:new Date().toISOString()
    }));
    const {error}=await admin.from("ie_hadiths").upsert(payload,{onConflict:"collection_key,hadith_number"});
    if(error)throw error;
    imported+=payload.length;
  }
  const {error:completionError}=await admin.from("ie_source_imports").update({status:"completed",records_imported:imported,completed_at:new Date().toISOString(),notes:"Imported source dataset; translations and metadata preserved where available."}).eq("id",importId);
  if(completionError)throw completionError;
  return {collection:key,records:imported,source:sourceUrl};
}

export async function POST(request:Request) {
  try {
    const auth=request.headers.get("authorization")||"";
    const token=auth.startsWith("Bearer ")?auth.slice(7):"";
    if(!token)return NextResponse.json({error:"Authentication required"},{status:401});
    if(!supabaseUrl||!anonKey)return NextResponse.json({error:"Server database configuration missing"},{status:500});
    const authClient=createClient(supabaseUrl,anonKey,{auth:{persistSession:false}});
    const {data:userData,error:userErr}=await authClient.auth.getUser(token);
    if(userErr||!userData.user)return NextResponse.json({error:"Invalid session"},{status:401});
    const admin=createClient(supabaseUrl,anonKey,{auth:{persistSession:false},global:{headers:{Authorization:"Bearer "+token}}});
    const {data:adminRow,error:adminErr}=await admin.from("ie_admins").select("active,role").eq("user_id",userData.user.id).maybeSingle();
    if(adminErr||!adminRow?.active||adminRow.role!=="admin")return NextResponse.json({error:"Administrator access required"},{status:403});
    // Fail closed: repository code licences do not establish redistribution rights for underlying Hadith texts.
    if (process.env.MIFASK_HADITH_IMPORT_RIGHTS_CONFIRMED !== "true") {
      return NextResponse.json({
        error:"Bulk Hadith import is disabled until exact editions, underlying text rights and source provenance are documented and explicitly approved.",
        code:"HADITH_IMPORT_RIGHTS_REVIEW_REQUIRED"
      },{status:409});
    }
    const [malikArabic,malikEnglish,riyadData]=await Promise.all([
      fetchJson(`${malikBase}/ara-malik.json`),fetchJson(`${malikBase}/eng-malik.json`),fetchJson(riyadUrl)
    ]);
    const arabic=records(malikArabic),english=records(malikEnglish);
    const englishMap=new Map<string,any>(english.map((r:any)=>[String(r.number??r.hadithnumber??r.id),r]));
    const malikRows=arabic.map((r:any,i:number)=>{
      const n=numberValue(r,i),en=englishMap.get(n);
      return {hadith_number:n,arabic:textValue(r,["arabic","text","hadith"]),translations:{en:textValue(en,["english","translation","text","hadith"])},narrator:textValue(en,["narrator"]),source_refs:{dataset:"fawazahmed0/hadith-api",edition:"ara-malik/eng-malik",number:n}};
    });
    const chapters=Array.isArray(riyadData?.chapters)?riyadData.chapters:[];
    const chapterMap=new Map<string,any>(chapters.map((c:any)=>[String(c.id),c] as [string,any]));
    const riyadRows=records(riyadData).map((r:any,i:number)=>{
      const n=numberValue(r,i),chapter=chapterMap.get(String(r.chapterId));
      const en=r.english;
      const arabicText=textValue(r,["arabic","text_ar","text","hadith"]);
      const translation=textValue(r,["translation","english","text_en"])||(typeof en==="string"?en:en?.text||"");
      return {hadith_number:n,book_number:r.bookNumber??r.book_number??null,chapter_number:r.chapterId??r.chapter_number??null,
        chapter_title:chapter?.english||chapter?.title||r.chapter_title||null,arabic:arabicText,
        translations:translation?{en:translation}: {},narrator:en?.narrator||r.narrator||null,
        source_refs:{dataset:"AhmedBaset/hadith-json",number:n,chapter_id:r.chapterId||null}};
    });
    const results=await Promise.all([
      importCollection(admin,"malik","Fawaz Ahmed Hadith API",`${malikBase}/ara-malik.json + eng-malik.json`,malikArabic,malikRows),
      importCollection(admin,"riyad","AhmedBaset hadith-json",riyadUrl,riyadData,riyadRows)
    ]);
    return NextResponse.json({success:true,results,total:results.reduce((n,r)=>n+r.records,0)});
  } catch(error:any) {
    console.error("Hadith import failed",error);
    return NextResponse.json({error:error?.message||"Import failed; check source or database logs."},{status:500});
  }
}
