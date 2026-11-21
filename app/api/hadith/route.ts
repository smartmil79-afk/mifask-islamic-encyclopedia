import { NextResponse } from "next/server";

const BASE = "https://sahih-al-bukhari.com/api/v1";
const EDITION_BASE = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions";
const RIYAD_DATA_URL = "https://raw.githubusercontent.com/AhmedBaset/hadith-json/70b83d6d21995bb32f8d7271cd75501be5a922a/db/by_book/other_books/riyad_assalihin.json";
const TRANSLATION_BASES = [
  "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions",
  "https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions",
];
const allowed = new Set(["bukhari","muslim","abudawud","tirmidhi","nasai","ibnmajah","malik","riyad"]);

function listFrom(data: any): any[] {
  if (Array.isArray(data)) return data;
  for (const key of ["results", "hadiths", "items", "data"]) if (Array.isArray(data?.[key])) return data[key];
  if (data && typeof data === "object" && (data.arabic || data.text_ar || data.hadith || data.text)) return [data];
  return [];
}
function numberOf(record: any): string {
  const value = record?.number ?? record?.hadith_number ?? record?.hadithnumber ?? record?.idInBook ?? record?.reference?.hadith ?? record?.id;
  return value == null ? "" : String(value);
}
function arabicText(record: any): string {
  for (const value of [record?.arabic, record?.text_ar, record?.arabic_text, record?.text, record?.hadith]) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}
function englishText(record: any): any {
  const value = record?.english ?? record?.translation ?? record?.text_en ?? record?.translated_text;
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object") return value;
  return "";
}
async function fetchJSON(url: string): Promise<any> {
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error("Source data unavailable");
  return res.json();
}
async function fetchEdition(edition: string): Promise<any> {
  try { return await fetchJSON(`${EDITION_BASE}/${edition}.json`); }
  catch { return fetchJSON(`${EDITION_BASE}/${edition}.min.json`); }
}
async function malikRecords(): Promise<any[]> {
  const [arabicData, englishData] = await Promise.all([fetchEdition("ara-malik"), fetchEdition("eng-malik")]);
  const arabic = listFrom(arabicData), english = listFrom(englishData);
  const englishByNumber = new Map(english.map((r:any)=>[numberOf(r),r]));
  return arabic.map((r:any)=> {
    const n=numberOf(r), e=englishByNumber.get(n);
    return { ...r, number:n, arabic:arabicText(r), english:englishText(e||{}), translation:englishText(e||{}), source_dataset:"fawazahmed0/hadith-api" };
  });
}
async function riyadRecords(): Promise<{records:any[];chapters:any[]}> {
  const data=await fetchJSON(RIYAD_DATA_URL);
  return {records:listFrom(data),chapters:Array.isArray(data?.chapters)?data.chapters:[]};
}
function matchesQuery(record:any, q:string):boolean {
  const eng=record?.english;
  const text=[arabicText(record),typeof eng==="string"?eng:eng?.text,eng?.narrator,record?.translation,record?.chapter_title,record?.chapter?.title].filter(Boolean).join(" ").toLowerCase();
  return text.includes(q.toLowerCase());
}
async function getEnglish(book:string, hadithNo:string): Promise<string> {
  if (!hadithNo) return "";
  const file = `${encodeURIComponent(hadithNo)}.json`;
  for (const base of TRANSLATION_BASES) {
    for (const suffix of [file, file.replace(".json", ".min.json")]) {
      try {
        const res = await fetch(`${base}/eng-${book}/${suffix}`, { next: { revalidate: 3600 } });
        if (!res.ok) continue;
        const text = englishText(await res.json());
        if (typeof text==="string" && text) return text;
      } catch { /* try fallback */ }
    }
  }
  return "";
}
async function attachTranslations(book:string,data:any):Promise<any>{
  const records=listFrom(data); if(!records.length)return data;
  const enriched=await Promise.all(records.map(async(record:any)=>{
    const hadithNo=numberOf(record), english=await getEnglish(book,hadithNo);
    return {...record,english,translation:english||record.translation||""};
  }));
  if(Array.isArray(data))return enriched;
  for(const key of ["results","hadiths","items","data"])if(Array.isArray(data?.[key]))return {...data,[key]:enriched};
  return enriched[0];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const book = searchParams.get("book") || "bukhari";
  const q = searchParams.get("q")?.trim();
  const number = searchParams.get("number")?.trim();
  if (!allowed.has(book)) return NextResponse.json({ error: "Unsupported collection" }, { status: 400 });
  if (!q && !number) return NextResponse.json({ error: "Enter a search term or hadith number." }, { status: 400 });
  try {
    if (book === "malik") {
      const records=await malikRecords();
      const found=number?records.filter(r=>numberOf(r)===number):records.filter(r=>matchesQuery(r,q!)).slice(0,20);
      if(!found.length)return NextResponse.json({results:[]});
      return NextResponse.json(number?found[0]:{results:found},{headers:{"Cache-Control":"public, s-maxage=3600, stale-while-revalidate=86400"}});
    }
    if (book === "riyad") {
      const {records,chapters}=await riyadRecords();
      const chapterMap=new Map(chapters.map((c:any)=>[String(c.id),c]));
      const found=number?records.filter(r=>String(r.idInBook??r.number??r.hadith_number)===number):records.filter(r=>matchesQuery(r,q!)).slice(0,20);
      const shaped=found.map((r:any)=>{
        const ch=chapterMap.get(String(r.chapterId));
        return {...r,number:String(r.idInBook??r.number??r.hadith_number??r.id),chapter_title:ch?.english||"",chapter_arabic:ch?.arabic||"",english:r.english||"",translation:r.english?.text||"",narrator:r.english?.narrator||"",source_dataset:"AhmedBaset/hadith-json"};
      });
      if(!shaped.length)return NextResponse.json({results:[]});
      return NextResponse.json(number?shaped[0]:{results:shaped},{headers:{"Cache-Control":"public, s-maxage=3600, stale-while-revalidate=86400"}});
    }
    const endpoint = number
      ? `${BASE}/hadith/${book}/${encodeURIComponent(number)}`
      : `${BASE}/search?q=${encodeURIComponent(q!)}&book=${book}&limit=20`;
    const response = await fetch(endpoint, { next: { revalidate: number ? 3600 : 300 } });
    const data = await response.json();
    if (!response.ok) return NextResponse.json(data, { status: response.status });
    const enriched = await attachTranslations(book, data);
    return NextResponse.json(enriched, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
  } catch {
    return NextResponse.json({ error: "Hadith source is temporarily unavailable. Please try again." }, { status: 502 });
  }
}
