import { NextResponse } from "next/server";

const BASE = "https://sahih-al-bukhari.com/api/v1";
const TRANSLATION_BASES = [\n  "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions",\n  "https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions",\n];
const allowed = new Set(["bukhari","muslim","abudawud","tirmidhi","nasai","ibnmajah"]);

function listFrom(data: any): any[] {
  if (Array.isArray(data)) return data;
  for (const key of ["results", "hadiths", "items", "data"]) if (Array.isArray(data?.[key])) return data[key];
  if (data && typeof data === "object" && (data.arabic || data.text_ar || data.hadith)) return [data];
  return [];
}
function numberOf(record: any): string {
  const value = record?.number ?? record?.hadith_number ?? record?.hadithnumber ?? record?.reference?.hadith ?? record?.id;
  return value == null ? "" : String(value);
}
function translationText(data: any): string {
  const records = listFrom(data);
  const record = records[0] || data?.hadiths?.[0] || data;
  return typeof record?.text === "string" ? record.text : typeof record?.english === "string" ? record.english : typeof record?.translation === "string" ? record.translation : "";
}
async function getEnglish(book: string, hadithNo: string): Promise<string> {
  if (!hadithNo) return "";
  const url = `${TRANSLATION_BASE}/eng-${book}/${encodeURIComponent(hadithNo)}.json`;
  try {
    let res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) res = await fetch(url.replace(".json", ".min.json"), { next: { revalidate: 3600 } });
    if (!res.ok) return "";
    return translationText(await res.json());
  } catch { return ""; }
}
async function attachTranslations(book: string, data: any): Promise<any> {
  const records = listFrom(data);
  if (!records.length) return data;
  const enriched = await Promise.all(records.map(async (record) => {
    const hadithNo = numberOf(record);
    const english = await getEnglish(book, hadithNo);
    return { ...record, english, translation: english || record.translation || "" };
  }));
  if (Array.isArray(data)) return enriched;
  for (const key of ["results", "hadiths", "items", "data"]) if (Array.isArray(data?.[key])) return { ...data, [key]: enriched };
  return enriched[0];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const book = searchParams.get("book") || "bukhari";
  const q = searchParams.get("q")?.trim();
  const number = searchParams.get("number")?.trim();
  if (!allowed.has(book)) return NextResponse.json({ error: "Unsupported collection" }, { status: 400 });
  if (!q && !number) return NextResponse.json({ error: "Enter a search term or hadith number." }, { status: 400 });
  const endpoint = number
    ? `${BASE}/hadith/${book}/${encodeURIComponent(number)}`
    : `${BASE}/search?q=${encodeURIComponent(q!)}&book=${book}&limit=20`;
  try {
    const response = await fetch(endpoint, { next: { revalidate: number ? 3600 : 300 } });
    const data = await response.json();
    if (!response.ok) return NextResponse.json(data, { status: response.status });
    const enriched = await attachTranslations(book, data);
    return NextResponse.json(enriched, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
  } catch {
    return NextResponse.json({ error: "Hadith source is temporarily unavailable. Please try again." }, { status: 502 });
  }
}
