import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BASE = "https://sahih-al-bukhari.com/api/v1";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const localDb = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  : null;
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
  const value = record?.english ?? record?.translation ?? record?.text_en ?? record?.translated_text ?? record?.text;
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
  try { return await fetchJSON(EDITION_BASE + "/" + edition + ".json"); }
  catch { return fetchJSON(EDITION_BASE + "/" + edition + ".min.json"); }
}
async function searchEdition(book: string, q: string): Promise<any[]> {
  const [englishData, arabicData] = await Promise.all([
    fetchEdition("eng-" + book),
    fetchEdition("ara-" + book).catch(() => null),
  ]);
  const english = listFrom(englishData);
  const arabic = listFrom(arabicData);
  const arabicByNumber = new Map<string, any>(arabic.map((r: any) => [numberOf(r), r] as [string, any]));
  return english.map((r: any) => {
    const n = numberOf(r), en = englishText(r), ar = arabicByNumber.get(n);
    return { ...r, number: n, arabic: arabicText(ar || {}), english: en, translation: en,
      source_dataset: "fawazahmed0/hadith-api" };
  }).filter((r: any) => matchesQuery(r, q)).slice(0, 20);
}
async function importedRecords(book: "malik" | "riyad", number?: string, q?: string): Promise<any[]> {
  if (!localDb) throw new Error("MIFASK database is not configured.");
  let query = localDb.from("ie_hadiths")
    .select("collection_key,hadith_number,book_number,chapter_number,chapter_title,arabic,translations,narrator,grading,source_refs,metadata")
    .eq("collection_key", book);
  if (number) {
    query = query.eq("hadith_number", number).limit(1);
  } else {
    const term = (q || "").trim().replace(/[\\%_]/g, (char: string) => "\\" + char).replace(/[(),]/g, " ");
    query = query.or("arabic.ilike.%"+term+"%,translations->>en.ilike.%"+term+"%,chapter_title.ilike.%"+term+"%").limit(20);
  }
  const { data, error } = await query;
  if (error) throw new Error("MIFASK database query failed: " + error.message);
  return (data || []).map((row: any) => {
    const translation = row.translations?.en || row.translations?.english || row.translations?.["en-US"] || "";
    const dataset = row.source_refs?.dataset || row.metadata?.source_dataset || "Imported dataset";
    const sourceUrl = dataset.includes("fawazahmed0")
      ? "https://github.com/fawazahmed0/hadith-api/tree/1/editions"
      : row.metadata?.imported_from || RIYAD_DATA_URL;
    return {
      ...row,
      number: String(row.hadith_number),
      hadith_number: String(row.hadith_number),
      arabic: row.arabic || "",
      english: translation,
      translation,
      chapter_title: row.chapter_title || "",
      source_dataset: dataset,
      source_url: sourceUrl,
      translationSource: translation ? dataset : "",
    };
  });
}
function matchesQuery(record:any, q:string):boolean {
  const eng=record?.english;
  const text=[arabicText(record),typeof eng==="string"?eng:eng?.text,eng?.narrator,record?.translation,record?.chapter_title,record?.chapter?.title].filter(Boolean).join(" ").toLowerCase();
  return text.includes(q.toLowerCase());
}
async function getEnglish(book:string, hadithNo:string): Promise<string> {
  if (!hadithNo) return "";
  const file = encodeURIComponent(hadithNo) + ".json";
  for (const base of TRANSLATION_BASES) {
    for (const suffix of [file, file.replace(".json", ".min.json")]) {
      try {
        const res = await fetch(base + "/eng-" + book + "/" + suffix, { next: { revalidate: 3600 } });
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
    if (book === "malik" || book === "riyad") {
      const records = await importedRecords(book, number, q);
      if (!records.length) return NextResponse.json({results:[]});
      return NextResponse.json(number ? records[0] : {results:records}, {headers:{"Cache-Control":"public, s-maxage=300, stale-while-revalidate=3600"}});
    }
    const endpoint = number
      ? BASE + "/hadith/" + book + "/" + encodeURIComponent(number)
      : BASE + "/search?q=" + encodeURIComponent(q!) + "&book=" + book + "&limit=20";
    const response = await fetch(endpoint, { next: { revalidate: number ? 3600 : 300 } });
    const data = await response.json();
    if (!response.ok) {
      const fallback = await searchEdition(book, q!).catch(() => []);
      if (fallback.length) return NextResponse.json({ results: fallback }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
      return NextResponse.json(data, { status: response.status });
    }
    const enriched = await attachTranslations(book, data);
    if (!listFrom(enriched).length) {
      const fallback = await searchEdition(book, q!).catch(() => []);
      return NextResponse.json({ results: fallback }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
    }
    return NextResponse.json(enriched, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
  } catch (error) {
    console.error("Hadith reader failed", error);
    return NextResponse.json({ error: "Hadith source is temporarily unavailable. Please try again." }, { status: 502 });
  }
}
