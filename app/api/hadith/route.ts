import { NextResponse } from "next/server";

const BASE = "https://sahih-al-bukhari.com/api/v1";
const allowed = new Set(["bukhari","muslim","abudawud","tirmidhi","nasai","ibnmajah"]);

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
    return NextResponse.json(data, { status: response.status, headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
  } catch {
    return NextResponse.json({ error: "Hadith source is temporarily unavailable. Please try again." }, { status: 502 });
  }
}