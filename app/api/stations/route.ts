import { NextRequest, NextResponse } from "next/server";
import { searchStations } from "@/app/lib/stations";

/**
 * Station search API route.
 *
 * Accepts a `?q=` query parameter and returns matching stations as JSON.
 * This keeps the 332 KB station dataset out of the client bundle --
 * the combobox fetches results as the user types instead.
 *
 * Responses are cached for 24 hours because station data does not change
 * at runtime.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";

  if (q.trim().length === 0) {
    return NextResponse.json([], {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  }

  const results = searchStations(q, 10);

  return NextResponse.json(results, {
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}
