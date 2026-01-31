// src/data/cache.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { TLECache } from './cache';
import type { TLE } from './types';

// Mock IndexedDB for tests
import 'fake-indexeddb/auto';

const mockTLEs: TLE[] = [
  {
    name: 'ISS',
    line1: '1 25544U ...',
    line2: '2 25544 ...',
    catalogNumber: 25544,
    category: 'station',
  },
];

describe('TLECache', () => {
  let cache: TLECache;

  beforeEach(async () => {
    cache = new TLECache();
    await cache.clear();
  });

  it('stores and retrieves TLEs', async () => {
    await cache.store(mockTLEs);
    const retrieved = await cache.getAll();
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].name).toBe('ISS');
  });

  it('returns empty array when cache is empty', async () => {
    const retrieved = await cache.getAll();
    expect(retrieved).toEqual([]);
  });

  it('tracks timestamp', async () => {
    await cache.store(mockTLEs);
    const timestamp = await cache.getTimestamp();
    expect(timestamp).toBeGreaterThan(0);
    expect(Date.now() - timestamp!).toBeLessThan(1000);
  });

  it('reports staleness correctly', async () => {
    await cache.store(mockTLEs);
    expect(await cache.isStale(24 * 60 * 60 * 1000)).toBe(false);
    expect(await cache.isStale(0)).toBe(true);
  });
});
