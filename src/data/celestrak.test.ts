// src/data/celestrak.test.ts
import { describe, it, expect } from 'vitest';
import { parseTLE, categorizeSatellite } from './celestrak';

const SAMPLE_TLE = `ISS (ZARYA)
1 25544U 98067A   24031.50000000  .00016717  00000-0  10270-3 0  9025
2 25544  51.6400 208.9163 0006703  35.0282 325.1202 15.49571570479473`;

const STARLINK_TLE = `STARLINK-1007
1 44713U 19074A   24031.50000000  .00001234  00000-0  12345-4 0  9999
2 44713  53.0000 123.4567 0001234  90.0000 270.0000 15.00000000 12345`;

describe('parseTLE', () => {
  it('parses a valid 3-line TLE', () => {
    const tles = parseTLE(SAMPLE_TLE);
    expect(tles).toHaveLength(1);
    expect(tles[0].name).toBe('ISS (ZARYA)');
    expect(tles[0].line1).toContain('25544U');
    expect(tles[0].line2).toContain('51.6400');
    expect(tles[0].catalogNumber).toBe(25544);
  });

  it('parses multiple TLEs', () => {
    const tles = parseTLE(SAMPLE_TLE + '\n' + STARLINK_TLE);
    expect(tles).toHaveLength(2);
    expect(tles[0].name).toBe('ISS (ZARYA)');
    expect(tles[1].name).toBe('STARLINK-1007');
  });

  it('handles empty input', () => {
    expect(parseTLE('')).toEqual([]);
  });
});

describe('categorizeSatellite', () => {
  it('identifies space stations', () => {
    expect(categorizeSatellite('ISS (ZARYA)')).toBe('station');
    expect(categorizeSatellite('TIANGONG')).toBe('station');
  });

  it('identifies Starlink as communication', () => {
    expect(categorizeSatellite('STARLINK-1007')).toBe('communication');
  });

  it('identifies GPS as navigation', () => {
    expect(categorizeSatellite('GPS BIIR-2')).toBe('navigation');
    expect(categorizeSatellite('NAVSTAR 43')).toBe('navigation');
  });

  it('defaults to other', () => {
    expect(categorizeSatellite('RANDOM SAT')).toBe('other');
  });
});
