import { NextResponse } from "next/server";

const BASE = "https://sahih-al-bukhari.com/api/v1";
const TRANSLATION_BASES = [
  "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions",
  "https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions",
];
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
  const record = records[0] || data?.hadiths?.[0] || data?.data?.hadiths?.[0] || data;
  for (const value of [record?.text, record?.english, record?.translation, record?.translated_text, record?.text_en]) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (value && typeof value === "object") {
      const nested = value.en || value.english || value.text;
      if (typeof nested === "string" && nested.trim()) return nested.trim();
    }
  }
  return "";
}
async function getEnglish(book: string, hadithNo: string): Promise<string> {
  if (!hadithNo) return "";
  const file = `${encodeURIComponent(hadithNo)}.json`;
  for (const base of TRANSLATION_BASES) {
    for (const suffix of [file, file.replace(".json", ".min.json")]) {
      try {
        const res = await fetch(`${base}/eng-${book}/${suffix}`, { next: { revalidate: 3600 } });
        if (!res.ok) continue;
        const text = translationText(await res.json());
        if (text) return text;
      } catch { /* try the next fallback */ }
    }
  }
  return "";
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
