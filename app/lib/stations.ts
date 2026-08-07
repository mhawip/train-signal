/**
 * Station search and lookup utilities.
 *
 * Works on both server and client. The station data is imported statically
 * from data/stations.json so it can be tree-shaken or bundled as needed.
 */

import stationsData from "@/data/stations.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Station {
  /** Display name, e.g. "London Kings Cross" */
  name: string;
  /** Three-letter CRS code, e.g. "KGX" */
  crs: string;
  /** TIPLOC code if known, e.g. "KNGX" */
  tiploc: string | null;
  /** Latitude (WGS84) */
  lat: number;
  /** Longitude (WGS84) */
  lon: number;
}

// Cast the imported JSON — the shape is guaranteed by the pipeline.
const stations: Station[] = stationsData as Station[];

// ---------------------------------------------------------------------------
// Pre-built indexes for fast lookup
// ---------------------------------------------------------------------------

const byCRS = new Map<string, Station>();
for (const s of stations) {
  byCRS.set(s.crs.toUpperCase(), s);
}

/**
 * Common misspellings and alternative forms mapped to their canonical names.
 * Only needed when the standard search would miss a reasonable user input.
 */
const ALIASES: Record<string, string[]> = {
  // Apostrophe variants
  "kings cross": ["London Kings Cross"],
  "king's cross": ["London Kings Cross"],
  "st pancras": ["London St Pancras International"],
  "saint pancras": ["London St Pancras International"],
  "paddington": ["London Paddington"],
  "euston": ["London Euston"],
  "waterloo": ["London Waterloo"],
  "victoria": ["London Victoria"],
  "liverpool street": ["London Liverpool Street"],
  "marylebone": ["London Marylebone"],
  "fenchurch street": ["London Fenchurch Street"],
  "cannon street": ["London Cannon Street"],
  "moorgate": ["Moorgate"],
  "blackfriars": ["London Blackfriars"],
  "charing cross": ["London Charing Cross", "Charing Cross (Glasgow)"],
  // Common abbreviations
  "b'ham": ["Birmingham New Street", "Birmingham Moor Street", "Birmingham International", "Birmingham Snow Hill"],
  "man": ["Manchester Piccadilly", "Manchester Victoria", "Manchester Oxford Road", "Manchester Airport"],
  "manc": ["Manchester Piccadilly", "Manchester Victoria", "Manchester Oxford Road", "Manchester Airport"],
  "edinburgh": ["Edinburgh"],
  "edin": ["Edinburgh"],
  "glasgow": ["Glasgow Central", "Glasgow Queen Street"],
  "cardiff": ["Cardiff Central", "Cardiff Queen Street"],
};

// Build a reverse lookup: normalised alias -> station names
const aliasIndex = new Map<string, string[]>();
for (const [alias, names] of Object.entries(ALIASES)) {
  aliasIndex.set(alias.toLowerCase(), names);
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/**
 * Search stations by partial name or CRS code.
 *
 * Returns matches sorted by relevance:
 * 1. Exact CRS match (highest)
 * 2. Name starts with query
 * 3. Word in name starts with query
 * 4. Name contains query
 * 5. Alias matches
 *
 * @param query - The search string (case-insensitive)
 * @param limit - Maximum results to return (default 10)
 * @returns Matching stations, most relevant first
 */
export function searchStations(query: string, limit = 10): Station[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];

  // Exact CRS match — always first if it exists
  const crsMatch = byCRS.get(q.toUpperCase());

  // Score-based matching
  const scored: Array<{ station: Station; score: number }> = [];
  const seen = new Set<string>();

  if (crsMatch) {
    scored.push({ station: crsMatch, score: 0 });
    seen.add(crsMatch.crs);
  }

  for (const s of stations) {
    if (seen.has(s.crs)) continue;

    const nameLower = s.name.toLowerCase();
    const crsLower = s.crs.toLowerCase();

    // CRS prefix match (e.g. "KG" matches "KGX")
    if (crsLower.startsWith(q) && q.length <= 3) {
      scored.push({ station: s, score: 1 });
      seen.add(s.crs);
      continue;
    }

    // Name starts with query
    if (nameLower.startsWith(q)) {
      scored.push({ station: s, score: 2 });
      seen.add(s.crs);
      continue;
    }

    // A word in the name starts with query
    const words = nameLower.split(/[\s\-()]/);
    if (words.some((w) => w.startsWith(q))) {
      scored.push({ station: s, score: 3 });
      seen.add(s.crs);
      continue;
    }

    // Name contains query anywhere
    if (nameLower.includes(q)) {
      scored.push({ station: s, score: 4 });
      seen.add(s.crs);
      continue;
    }
  }

  // Check aliases for additional matches
  const aliasNames = aliasIndex.get(q);
  if (aliasNames) {
    for (const aliasName of aliasNames) {
      const match = stations.find(
        (s) => s.name.toLowerCase() === aliasName.toLowerCase(),
      );
      if (match && !seen.has(match.crs)) {
        scored.push({ station: match, score: 5 });
        seen.add(match.crs);
      }
    }
  }

  // Also check partial alias matches
  for (const [alias, names] of aliasIndex) {
    if (alias.startsWith(q) && alias !== q) {
      for (const aliasName of names) {
        const match = stations.find(
          (s) => s.name.toLowerCase() === aliasName.toLowerCase(),
        );
        if (match && !seen.has(match.crs)) {
          scored.push({ station: match, score: 6 });
          seen.add(match.crs);
        }
      }
    }
  }

  // Sort by score (lower = more relevant), then alphabetically
  scored.sort(
    (a, b) => a.score - b.score || a.station.name.localeCompare(b.station.name),
  );

  return scored.slice(0, limit).map((s) => s.station);
}

/**
 * Look up a single station by its CRS code.
 *
 * @param crs - Three-letter CRS code (case-insensitive)
 * @returns The station, or undefined if not found
 */
export function getStationByCRS(crs: string): Station | undefined {
  return byCRS.get(crs.toUpperCase());
}

/**
 * Get the total number of stations in the dataset.
 * Useful for diagnostics and testing.
 */
export function getStationCount(): number {
  return stations.length;
}
