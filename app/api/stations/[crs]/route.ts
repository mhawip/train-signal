import { NextRequest, NextResponse } from "next/server";
import { getStationByCRS } from "@/app/lib/stations";

/**
 * Single station lookup by CRS code.
 *
 * Used by the combobox to pre-fill a station name when the form is
 * loaded with a CRS code in the URL (e.g. bookmarked results, back
 * navigation). This avoids shipping the full station dataset to the
 * client just for a single lookup.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ crs: string }> }
) {
  const { crs } = await params;
  const station = getStationByCRS(crs);

  if (!station) {
    return NextResponse.json(null, {
      status: 404,
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  }

  return NextResponse.json(station, {
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}
