// src/data/types.ts
export interface TLE {
  name: string;
  line1: string;
  line2: string;
  catalogNumber: number;
  category: SatelliteCategory;
}

export type SatelliteCategory = 'station' | 'science' | 'communication' | 'navigation' | 'other';

export interface SatellitePosition {
  x: number;  // meters, ECI coordinates
  y: number;
  z: number;
  vx: number; // velocity m/s
  vy: number;
  vz: number;
}

export interface SatelliteData extends TLE {
  position?: SatellitePosition;
}
