// src/objects/planets/PlanetData.ts
// Orbital elements and physical properties for all planets

// Keplerian orbital elements at J2000 epoch (Jan 1, 2000, 12:00 UTC)
// With secular rates per Julian century
export interface OrbitalElements {
  // Semi-major axis in meters
  a: number;
  // Eccentricity
  e: number;
  // Inclination to ecliptic in radians
  i: number;
  // Longitude of ascending node in radians
  omega: number;
  // Argument of perihelion in radians
  w: number;
  // Mean anomaly at epoch in radians
  M0: number;
  // Mean motion (radians per day)
  n: number;
}

export interface PlanetPhysicalData {
  name: string;
  // Real radius in meters
  radiusReal: number;
  // Visual scale multiplier (to make small planets visible)
  visualScale: number;
  // Default camera zoom level (log10 of distance in meters)
  defaultZoom: number;
  // Fallback color if texture not loaded
  fallbackColor: number;
  // Axial tilt in radians
  axialTilt: number;
  // Rotation period in hours (for animation)
  rotationPeriod: number;
  // Has atmosphere
  hasAtmosphere: boolean;
  // Atmosphere color (if applicable)
  atmosphereColor?: number;
  // Atmosphere thickness as fraction of radius
  atmosphereThickness?: number;
}

// Orbital elements from JPL Horizons, J2000 epoch
// https://ssd.jpl.nasa.gov/planets/approx_pos.html
export const ORBITAL_ELEMENTS: Record<string, OrbitalElements> = {
  mercury: {
    a: 57.909e9,           // 57.909 million km
    e: 0.20563,
    i: 7.005 * Math.PI / 180,
    omega: 48.331 * Math.PI / 180,
    w: 29.124 * Math.PI / 180,
    M0: 174.796 * Math.PI / 180,
    n: 4.09233445 * Math.PI / 180,  // deg/day -> rad/day
  },
  venus: {
    a: 108.21e9,
    e: 0.00677,
    i: 3.3947 * Math.PI / 180,
    omega: 76.680 * Math.PI / 180,
    w: 54.884 * Math.PI / 180,
    M0: 50.115 * Math.PI / 180,
    n: 1.60213049 * Math.PI / 180,
  },
  earth: {
    a: 149.598e9,
    e: 0.01671,
    i: 0,
    omega: 0,
    w: 102.937 * Math.PI / 180,
    M0: 357.529 * Math.PI / 180,
    n: 0.98560028 * Math.PI / 180,
  },
  mars: {
    a: 227.94e9,
    e: 0.09339,
    i: 1.850 * Math.PI / 180,
    omega: 49.558 * Math.PI / 180,
    w: 286.502 * Math.PI / 180,
    M0: 19.373 * Math.PI / 180,
    n: 0.52402068 * Math.PI / 180,
  },
  jupiter: {
    a: 778.57e9,
    e: 0.04839,
    i: 1.304 * Math.PI / 180,
    omega: 100.464 * Math.PI / 180,
    w: 273.867 * Math.PI / 180,
    M0: 20.020 * Math.PI / 180,
    n: 0.08308529 * Math.PI / 180,
  },
  saturn: {
    a: 1433.53e9,
    e: 0.05415,
    i: 2.485 * Math.PI / 180,
    omega: 113.665 * Math.PI / 180,
    w: 339.392 * Math.PI / 180,
    M0: 317.020 * Math.PI / 180,
    n: 0.03340556 * Math.PI / 180,
  },
  uranus: {
    a: 2872.46e9,
    e: 0.04717,
    i: 0.773 * Math.PI / 180,
    omega: 74.006 * Math.PI / 180,
    w: 96.998 * Math.PI / 180,
    M0: 142.238 * Math.PI / 180,
    n: 0.01172528 * Math.PI / 180,
  },
  neptune: {
    a: 4495.06e9,
    e: 0.00859,
    i: 1.770 * Math.PI / 180,
    omega: 131.783 * Math.PI / 180,
    w: 276.336 * Math.PI / 180,
    M0: 256.228 * Math.PI / 180,
    n: 0.00598103 * Math.PI / 180,
  },
};

// Physical properties for each planet
export const PLANET_DATA: Record<string, PlanetPhysicalData> = {
  mercury: {
    name: 'Mercury',
    radiusReal: 2_439_700,      // 2,439.7 km
    visualScale: 8,             // Scale up 8x for visibility
    defaultZoom: 7.0,
    fallbackColor: 0x8c8c8c,    // Gray
    axialTilt: 0.034 * Math.PI / 180,
    rotationPeriod: 1407.6,     // hours
    hasAtmosphere: false,
  },
  venus: {
    name: 'Venus',
    radiusReal: 6_051_800,
    visualScale: 3,
    defaultZoom: 7.5,
    fallbackColor: 0xe6c65c,    // Yellow-white
    axialTilt: 177.4 * Math.PI / 180,  // Retrograde
    rotationPeriod: -5832.5,    // Retrograde rotation
    hasAtmosphere: true,
    atmosphereColor: 0xffe4b5,
    atmosphereThickness: 0.15,
  },
  mars: {
    name: 'Mars',
    radiusReal: 3_389_500,
    visualScale: 5,
    defaultZoom: 7.3,
    fallbackColor: 0xc1440e,    // Red
    axialTilt: 25.19 * Math.PI / 180,
    rotationPeriod: 24.62,
    hasAtmosphere: true,
    atmosphereColor: 0x87ceeb,  // Light blue (thin atmosphere)
    atmosphereThickness: 0.02,
  },
  jupiter: {
    name: 'Jupiter',
    radiusReal: 69_911_000,
    visualScale: 1,             // Already huge
    defaultZoom: 8.2,
    fallbackColor: 0xd8ca9d,    // Tan
    axialTilt: 3.13 * Math.PI / 180,
    rotationPeriod: 9.93,
    hasAtmosphere: true,
    atmosphereColor: 0xffd700,
    atmosphereThickness: 0.05,
  },
  saturn: {
    name: 'Saturn',
    radiusReal: 58_232_000,
    visualScale: 1,
    defaultZoom: 8.5,
    fallbackColor: 0xead6b8,    // Pale gold
    axialTilt: 26.73 * Math.PI / 180,
    rotationPeriod: 10.7,
    hasAtmosphere: true,
    atmosphereColor: 0xf5deb3,
    atmosphereThickness: 0.05,
  },
  uranus: {
    name: 'Uranus',
    radiusReal: 25_362_000,
    visualScale: 2,
    defaultZoom: 8.0,
    fallbackColor: 0xb1e1e6,    // Cyan
    axialTilt: 97.77 * Math.PI / 180,  // Extreme tilt
    rotationPeriod: -17.24,     // Retrograde
    hasAtmosphere: true,
    atmosphereColor: 0xafeeee,
    atmosphereThickness: 0.04,
  },
  neptune: {
    name: 'Neptune',
    radiusReal: 24_622_000,
    visualScale: 2,
    defaultZoom: 8.0,
    fallbackColor: 0x5b5ddf,    // Deep blue
    axialTilt: 28.32 * Math.PI / 180,
    rotationPeriod: 16.11,
    hasAtmosphere: true,
    atmosphereColor: 0x4169e1,
    atmosphereThickness: 0.04,
  },
};

// J2000 epoch in milliseconds
export const J2000_EPOCH = Date.UTC(2000, 0, 1, 12, 0, 0);

// Milliseconds per day
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Distance compression factor (Sun shown at 30M km instead of 150M km)
// This makes the solar system more navigable while keeping relative positions
export const DISTANCE_COMPRESSION = 0.2;

/**
 * Solve Kepler's equation to get eccentric anomaly from mean anomaly
 * Uses Newton-Raphson iteration
 */
export function solveKepler(M: number, e: number, tolerance = 1e-8): number {
  // Normalize mean anomaly to [0, 2π)
  M = M % (2 * Math.PI);
  if (M < 0) M += 2 * Math.PI;

  // Initial guess
  let E = M + e * Math.sin(M);

  // Newton-Raphson iteration
  for (let i = 0; i < 30; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < tolerance) break;
  }

  return E;
}

/**
 * Calculate heliocentric position from orbital elements
 * Returns position in meters [x, y, z]
 */
function calculateHeliocentricPosition(
  elements: OrbitalElements,
  date: Date = new Date()
): [number, number, number] {
  const { a, e, i, omega, w, M0, n } = elements;

  // Days since J2000
  const daysSinceEpoch = (date.getTime() - J2000_EPOCH) / MS_PER_DAY;

  // Mean anomaly at current time
  const M = M0 + n * daysSinceEpoch;

  // Solve Kepler's equation for eccentric anomaly
  const E = solveKepler(M, e);

  // True anomaly
  const nu = 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(E / 2),
    Math.sqrt(1 - e) * Math.cos(E / 2)
  );

  // Distance from Sun
  const r = a * (1 - e * Math.cos(E));

  // Position in orbital plane
  const xOrbital = r * Math.cos(nu);
  const yOrbital = r * Math.sin(nu);

  // Rotation matrices to convert from orbital plane to ecliptic coordinates
  const cosW = Math.cos(w);
  const sinW = Math.sin(w);
  const cosI = Math.cos(i);
  const sinI = Math.sin(i);
  const cosOmega = Math.cos(omega);
  const sinOmega = Math.sin(omega);

  // Combined rotation
  const x = (cosOmega * cosW - sinOmega * sinW * cosI) * xOrbital +
            (-cosOmega * sinW - sinOmega * cosW * cosI) * yOrbital;
  const y = (sinOmega * cosW + cosOmega * sinW * cosI) * xOrbital +
            (-sinOmega * sinW + cosOmega * cosW * cosI) * yOrbital;
  const z = (sinW * sinI) * xOrbital + (cosW * sinI) * yOrbital;

  return [x, y, z];
}

/**
 * Calculate Earth-centric position from orbital elements
 * This app uses Earth at origin, so we need to subtract Earth's position
 * and apply distance compression for navigability
 * Returns position in meters [x, y, z]
 */
export function calculateOrbitalPosition(
  elements: OrbitalElements,
  date: Date = new Date()
): [number, number, number] {
  // Get heliocentric positions
  const [px, py, pz] = calculateHeliocentricPosition(elements, date);
  const [ex, ey, ez] = calculateHeliocentricPosition(ORBITAL_ELEMENTS.earth, date);

  // Convert to Earth-centric by subtracting Earth's position
  // Then apply compression factor for visual navigability
  const x = (px - ex) * DISTANCE_COMPRESSION;
  const y = (py - ey) * DISTANCE_COMPRESSION;
  const z = (pz - ez) * DISTANCE_COMPRESSION;

  return [x, y, z];
}

// Astronomical Unit in meters
const AU_IN_METERS = 149_597_870_700;

/**
 * Calculate orrery-mode position from orbital elements
 * Uses heliocentric (Sun-centered) coordinates with sqrt scaling
 * to match the orbital path rendering exactly
 * Returns position in meters [x, y, z]
 */
export function calculateOrreryPosition(
  elements: OrbitalElements,
  date: Date = new Date()
): [number, number, number] {
  // Get heliocentric position (sun at origin)
  const [x, y, z] = calculateHeliocentricPosition(elements, date);

  // Calculate distance from sun in AU
  const distance = Math.sqrt(x * x + y * y + z * z);
  const distanceAU = distance / AU_IN_METERS;

  // Apply sqrt scaling to compress outer orbits (same as OrbitalPath)
  // Scale factor: sqrt(d) / d where d is distance in AU
  // This keeps direction but scales down outer planets
  const scale = distanceAU > 0 ? Math.sqrt(distanceAU) / distanceAU : 1;

  // Apply scale - matches OrbitalPath.calculateOrbitPoints exactly
  return [x * scale, y * scale, z * scale];
}
