// src/data/NearbyStars.ts

export interface Star {
  name: string;
  position: [number, number, number]; // x, y, z in light years (Sun at origin)
  distance: number; // light years
  spectralType: string;
  apparentMagnitude: number;
  notable: boolean; // show label
}

// Spectral type to color mapping
export const SPECTRAL_COLORS: Record<string, string> = {
  'O': '#9bb0ff',
  'B': '#aabfff',
  'A': '#cad7ff',
  'F': '#f8f7ff',
  'G': '#fff4ea',
  'K': '#ffd2a1',
  'M': '#ffcc6f',
};

export function getStarColor(spectralType: string): string {
  const type = spectralType.charAt(0).toUpperCase();
  return SPECTRAL_COLORS[type] || SPECTRAL_COLORS['G'];
}

// Nearby stars within ~20 light years
// Positions calculated from RA/Dec/Distance, converted to cartesian (x=toward galactic center, y=galactic north, z=toward galactic rotation)
// Simplified: using approximate positions for visualization
export const NEARBY_STARS: Star[] = [
  // Sun at origin (for reference)
  { name: 'Sun', position: [0, 0, 0], distance: 0, spectralType: 'G2V', apparentMagnitude: -26.74, notable: true },

  // Alpha Centauri system
  { name: 'Proxima Centauri', position: [-1.55, -1.18, -3.77], distance: 4.24, spectralType: 'M5.5V', apparentMagnitude: 11.13, notable: false },
  { name: 'Alpha Centauri', position: [-1.64, -1.36, -3.83], distance: 4.37, spectralType: 'G2V', apparentMagnitude: -0.01, notable: true },
  { name: 'Alpha Centauri B', position: [-1.64, -1.36, -3.83], distance: 4.37, spectralType: 'K1V', apparentMagnitude: 1.33, notable: false },

  // Barnard's Star
  { name: "Barnard's Star", position: [0.01, 1.45, -5.75], distance: 5.96, spectralType: 'M4V', apparentMagnitude: 9.54, notable: false },

  // Wolf 359
  { name: 'Wolf 359', position: [-2.39, -6.90, 2.46], distance: 7.86, spectralType: 'M6.5V', apparentMagnitude: 13.54, notable: false },

  // Lalande 21185
  { name: 'Lalande 21185', position: [-3.46, 0.56, -7.62], distance: 8.31, spectralType: 'M2V', apparentMagnitude: 7.52, notable: false },

  // Sirius system
  { name: 'Sirius', position: [-1.61, 8.08, -2.47], distance: 8.60, spectralType: 'A1V', apparentMagnitude: -1.46, notable: true },
  { name: 'Sirius B', position: [-1.61, 8.08, -2.47], distance: 8.60, spectralType: 'DA2', apparentMagnitude: 8.44, notable: false },

  // Luyten 726-8 system (UV Ceti)
  { name: 'Luyten 726-8 A', position: [2.05, -8.32, -0.73], distance: 8.73, spectralType: 'M5.5V', apparentMagnitude: 12.54, notable: false },
  { name: 'UV Ceti', position: [2.05, -8.32, -0.73], distance: 8.73, spectralType: 'M6V', apparentMagnitude: 12.95, notable: false },

  // Ross 154
  { name: 'Ross 154', position: [1.91, -8.85, -3.91], distance: 9.69, spectralType: 'M3.5V', apparentMagnitude: 10.44, notable: false },

  // Ross 248
  { name: 'Ross 248', position: [7.38, -0.58, -7.18], distance: 10.30, spectralType: 'M5.5V', apparentMagnitude: 12.29, notable: false },

  // Epsilon Eridani
  { name: 'Epsilon Eridani', position: [6.21, 8.32, -1.73], distance: 10.50, spectralType: 'K2V', apparentMagnitude: 3.73, notable: true },

  // Lacaille 9352
  { name: 'Lacaille 9352', position: [8.47, -2.00, -6.29], distance: 10.74, spectralType: 'M1.5V', apparentMagnitude: 7.34, notable: false },

  // Ross 128
  { name: 'Ross 128', position: [10.89, 0.58, -0.15], distance: 11.01, spectralType: 'M4V', apparentMagnitude: 11.13, notable: false },

  // EZ Aquarii system
  { name: 'EZ Aquarii', position: [10.19, -3.81, -3.46], distance: 11.27, spectralType: 'M5V', apparentMagnitude: 13.33, notable: false },

  // Procyon system
  { name: 'Procyon', position: [-4.77, 10.31, 1.04], distance: 11.46, spectralType: 'F5IV', apparentMagnitude: 0.34, notable: true },

  // 61 Cygni system
  { name: '61 Cygni A', position: [6.45, -6.10, 7.13], distance: 11.41, spectralType: 'K5V', apparentMagnitude: 5.21, notable: false },
  { name: '61 Cygni B', position: [6.45, -6.10, 7.13], distance: 11.41, spectralType: 'K7V', apparentMagnitude: 6.03, notable: false },

  // Struve 2398 system
  { name: 'Struve 2398 A', position: [2.01, -2.89, 11.26], distance: 11.64, spectralType: 'M3V', apparentMagnitude: 8.94, notable: false },

  // Groombridge 34 system
  { name: 'Groombridge 34 A', position: [0.29, 2.89, 11.62], distance: 11.62, spectralType: 'M1.5V', apparentMagnitude: 8.08, notable: false },

  // Epsilon Indi
  { name: 'Epsilon Indi', position: [5.66, -3.86, -9.89], distance: 11.87, spectralType: 'K5V', apparentMagnitude: 4.69, notable: false },

  // DX Cancri
  { name: 'DX Cancri', position: [-6.92, 8.75, 4.76], distance: 11.84, spectralType: 'M6.5V', apparentMagnitude: 14.78, notable: false },

  // Tau Ceti
  { name: 'Tau Ceti', position: [10.27, 5.04, -3.26], distance: 11.91, spectralType: 'G8.5V', apparentMagnitude: 3.50, notable: true },

  // GJ 1061
  { name: 'GJ 1061', position: [-5.09, -10.48, 3.04], distance: 12.03, spectralType: 'M5.5V', apparentMagnitude: 13.03, notable: false },

  // YZ Ceti
  { name: 'YZ Ceti', position: [11.67, -3.01, 1.43], distance: 12.13, spectralType: 'M4.5V', apparentMagnitude: 12.02, notable: false },

  // Luyten's Star
  { name: "Luyten's Star", position: [-4.59, 11.43, -2.00], distance: 12.37, spectralType: 'M3.5V', apparentMagnitude: 9.86, notable: false },

  // Teegarden's Star
  { name: "Teegarden's Star", position: [10.30, 6.93, -3.19], distance: 12.50, spectralType: 'M7V', apparentMagnitude: 15.14, notable: false },

  // Kapteyn's Star
  { name: "Kapteyn's Star", position: [1.89, -10.77, -5.95], distance: 12.78, spectralType: 'M1V', apparentMagnitude: 8.85, notable: false },

  // Lacaille 8760
  { name: 'Lacaille 8760', position: [4.35, -0.84, -12.05], distance: 12.87, spectralType: 'M0V', apparentMagnitude: 6.67, notable: false },

  // Kruger 60 system
  { name: 'Kruger 60 A', position: [6.47, 2.67, 11.11], distance: 13.15, spectralType: 'M3V', apparentMagnitude: 9.79, notable: false },

  // Ross 614 system
  { name: 'Ross 614 A', position: [-1.70, 13.29, 0.65], distance: 13.34, spectralType: 'M4.5V', apparentMagnitude: 11.15, notable: false },

  // Wolf 1061
  { name: 'Wolf 1061', position: [5.16, -12.35, -1.58], distance: 13.82, spectralType: 'M3V', apparentMagnitude: 10.07, notable: false },

  // Van Maanen's Star
  { name: "Van Maanen's Star", position: [13.69, 2.98, 1.33], distance: 14.07, spectralType: 'DZ7', apparentMagnitude: 12.38, notable: false },

  // GJ 1002
  { name: 'GJ 1002', position: [14.34, -2.06, 0.33], distance: 15.78, spectralType: 'M5.5V', apparentMagnitude: 13.76, notable: false },

  // Wolf 424 system
  { name: 'Wolf 424 A', position: [-4.02, 13.73, 4.43], distance: 14.31, spectralType: 'M5.5V', apparentMagnitude: 13.18, notable: false },

  // TZ Arietis
  { name: 'TZ Arietis', position: [12.19, 7.30, 3.36], distance: 14.58, spectralType: 'M4.5V', apparentMagnitude: 12.22, notable: false },

  // GJ 687
  { name: 'GJ 687', position: [3.38, 3.98, 14.04], distance: 14.84, spectralType: 'M3V', apparentMagnitude: 9.17, notable: false },

  // LHS 292
  { name: 'LHS 292', position: [-2.67, 14.68, 1.91], distance: 14.89, spectralType: 'M6.5V', apparentMagnitude: 15.60, notable: false },

  // GJ 674
  { name: 'GJ 674', position: [4.03, -9.90, -10.63], distance: 14.81, spectralType: 'M2.5V', apparentMagnitude: 9.38, notable: false },

  // GJ 876
  { name: 'GJ 876', position: [14.00, -4.77, 3.55], distance: 15.24, spectralType: 'M4V', apparentMagnitude: 10.17, notable: false },

  // GJ 832
  { name: 'GJ 832', position: [0.16, -5.08, -15.10], distance: 16.16, spectralType: 'M1.5V', apparentMagnitude: 8.66, notable: false },

  // GJ 682
  { name: 'GJ 682', position: [-4.55, -12.26, 8.62], distance: 16.33, spectralType: 'M3.5V', apparentMagnitude: 10.95, notable: false },

  // Omicron 2 Eridani (40 Eridani) system
  { name: '40 Eridani A', position: [7.17, 14.49, -0.63], distance: 16.34, spectralType: 'K0.5V', apparentMagnitude: 4.43, notable: false },

  // 70 Ophiuchi system
  { name: '70 Ophiuchi A', position: [0.41, -2.53, 16.59], distance: 16.58, spectralType: 'K0V', apparentMagnitude: 4.03, notable: false },

  // Altair
  { name: 'Altair', position: [7.68, -14.61, 2.39], distance: 16.73, spectralType: 'A7V', apparentMagnitude: 0.76, notable: true },

  // GJ 581
  { name: 'GJ 581', position: [-17.91, 6.26, -6.89], distance: 20.56, spectralType: 'M3V', apparentMagnitude: 10.56, notable: false },

  // Sigma Draconis
  { name: 'Sigma Draconis', position: [3.08, 7.48, 17.31], distance: 18.77, spectralType: 'G9V', apparentMagnitude: 4.67, notable: false },

  // 36 Ophiuchi system
  { name: '36 Ophiuchi A', position: [-6.21, -8.00, 16.03], distance: 19.50, spectralType: 'K1V', apparentMagnitude: 5.07, notable: false },

  // Delta Pavonis
  { name: 'Delta Pavonis', position: [4.27, -3.93, -18.97], distance: 19.92, spectralType: 'G8IV', apparentMagnitude: 3.56, notable: false },

  // 82 Eridani
  { name: '82 Eridani', position: [9.21, 11.46, -13.29], distance: 19.71, spectralType: 'G8V', apparentMagnitude: 4.27, notable: false },
];

// Count for info card
export const STAR_COUNT = NEARBY_STARS.length;
export const RADIUS_LY = 20;
