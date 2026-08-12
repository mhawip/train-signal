import { NextRequest, NextResponse } from "next/server";
import { fetchDepartures } from "@/app/lib/darwin";

/**
 * Journey lookup API route.
 *
 * GET /api/journey?from=LDS&to=KGX&date=2026-08-12&time=14:12&network=EE
 *
 * Returns live Darwin departure data for today's journeys.
 * For dates other than today, returns { journey: null } -- the caller
 * is expected to fall back to SCHEDULE data (P1-02) or a fixture.
 *
 * Responses are cached for 60 seconds (live data, short TTL).
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const from = params.get("from");
  const to = params.get("to");
  const date = params.get("date");
  const time = params.get("time");
  const network = params.get("network") ?? "EE";

  if (!from || !to || !date || !time) {
    return NextResponse.json(
      { error: "Missing required parameters: from, to, date, time" },
      { status: 400 },
    );
  }

  const journey = await fetchDepartures(from, to, date, time, network);

  return NextResponse.json(
    { journey },
    {
      headers: { "Cache-Control": "private, max-age=60" },
    },
  );
}
