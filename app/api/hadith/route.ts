import { NextResponse } from "next/server";

const BASE = "https://sahih-al-bukhari.com/api/v1";
const EN_BASE = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions";
const allowed = new Set(["bukhari","muslim","abudawud","tirmidhi","nasai","ibnmajah"]);

function extractEnglish(payload: any) {
  const records = Array.isArray(payload?.hadiths) ? payload.hadiths : Array.isArray(payload) ? payload : [];
  return records.find((record: any) => typeof record?.text === "string" && record.text.trim())?.text || "";
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
    if (!response.ok || !number) {
      return NextResponse.json(data, { status: response.status, headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
    }

    // The primary Arabic API intentionally omits English. Fetch the matching
    // English edition by collection and reference number as a separate source.
    let english = "";
    try {
      const englishResponse = await fetch(`${EN_BASE}/eng-${book}/${encodeURIComponent(number)}.json`, { next: { revalidate: 86400 } });
      if (englishResponse.ok) english = extractEnglish(await englishResponse.json());
    } catch { /* keep the Arabic record available if translation source is unavailable */ }

    const merged = { ...data, english, translationSource: english ? "fawazahmed0/hadith-api English edition" : null };
    return NextResponse.json(merged, { status: response.status, headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
  } catch {
    return NextResponse.json({ error: "Hadith source is temporarily unavailable. Please try again." }, { status: 502 });
  }
}
