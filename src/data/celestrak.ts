// src/data/celestrak.ts
import type { TLE, SatelliteCategory } from './types';

export function parseTLE(text: string): TLE[] {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(l => l);
  const tles: TLE[] = [];

  for (let i = 0; i < lines.length; i += 3) {
    if (i + 2 >= lines.length) break;

    const name = lines[i];
    const line1 = lines[i + 1];
    const line2 = lines[i + 2];

    // Validate TLE format
    if (!line1.startsWith('1 ') || !line2.startsWith('2 ')) {
      continue;
    }

    const catalogNumber = parseInt(line1.substring(2, 7), 10);

    tles.push({
      name,
      line1,
      line2,
      catalogNumber,
      category: categorizeSatellite(name),
    });
  }

  return tles;
}

export function categorizeSatellite(name: string): SatelliteCategory {
  const upper = name.toUpperCase();

  if (upper.includes('ISS') || upper.includes('ZARYA') || upper.includes('TIANGONG')) {
    return 'station';
  }
  if (upper.includes('STARLINK') || upper.includes('ONEWEB') || upper.includes('IRIDIUM')) {
    return 'communication';
  }
  if (upper.includes('GPS') || upper.includes('NAVSTAR') || upper.includes('GLONASS') || upper.includes('GALILEO')) {
    return 'navigation';
  }
  if (upper.includes('HUBBLE') || upper.includes('JWST') || upper.includes('GOES') || upper.includes('NOAA')) {
    return 'science';
  }
  return 'other';
}

// Always use proxy to avoid CORS issues
// In dev: Vite proxy handles /api/celestrak
// In prod: Cloudflare Pages Function handles /api/celestrak
const CELESTRAK_BASE = '/api/celestrak/NORAD/elements/gp.php';

export async function fetchTLEs(category: string): Promise<TLE[]> {
  const url = `${CELESTRAK_BASE}?GROUP=${category}&FORMAT=TLE`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const text = await response.text();
    return parseTLE(text);
  } catch (error) {
    console.error(`Failed to fetch ${category}:`, error);
    return [];
  }
}

export async function fetchAllTLEs(): Promise<TLE[]> {
  const categories = ['stations', 'active', 'starlink', 'gps-ops', 'science'];

  const results = await Promise.all(
    categories.map(cat => fetchTLEs(cat))
  );

  // Deduplicate by catalog number
  const seen = new Set<number>();
  const all: TLE[] = [];

  for (const tles of results) {
    for (const tle of tles) {
      if (!seen.has(tle.catalogNumber)) {
        seen.add(tle.catalogNumber);
        all.push(tle);
      }
    }
  }

  return all;
}
