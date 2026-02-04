// src/data/MilkyWayData.ts

export interface SpiralArm {
  name: string;
  startAngle: number; // radians, angle where arm begins (from galactic center)
  endAngle: number; // radians, angle where arm ends
  pitchAngle: number; // degrees, tightness of spiral (~12° for Milky Way)
  innerRadius: number; // ly, distance from center where arm starts
  width: number; // ly, half-width of the arm
  starCount: number; // number of particle stars to distribute
  cloudCount: number; // number of gas cloud sprites
  color: string; // base color for arm gas
  notable: boolean; // show label
  description: string;
  // Label placement: angle along the arm (0-1 fraction of arm length)
  labelFraction: number;
}

export interface GalacticFeature {
  name: string;
  position: [number, number, number]; // x, y, z in light years (galactic center at origin)
  type: 'marker' | 'center' | 'bar';
  color: string;
  notable: boolean;
  description: string;
}

// Milky Way spiral arms
// Modeled as logarithmic spirals: r = a * e^(b*θ)
// where b = tan(pitchAngle)
export const SPIRAL_ARMS: SpiralArm[] = [
  {
    name: 'Perseus Arm',
    startAngle: 0.5,
    endAngle: 5.8,
    pitchAngle: 12,
    innerRadius: 16000,
    width: 2000,
    starCount: 600,
    cloudCount: 8,
    color: '#6688cc',
    notable: true,
    description: 'Major spiral arm',
    labelFraction: 0.35,
  },
  {
    name: 'Sagittarius Arm',
    startAngle: 1.2,
    endAngle: 6.5,
    pitchAngle: 12,
    innerRadius: 12000,
    width: 1800,
    starCount: 550,
    cloudCount: 7,
    color: '#cc7788',
    notable: true,
    description: 'Major spiral arm',
    labelFraction: 0.4,
  },
  {
    name: 'Scutum–Centaurus Arm',
    startAngle: 2.0,
    endAngle: 7.2,
    pitchAngle: 12,
    innerRadius: 9000,
    width: 2200,
    starCount: 650,
    cloudCount: 9,
    color: '#88aadd',
    notable: true,
    description: 'Major spiral arm',
    labelFraction: 0.35,
  },
  {
    name: 'Norma Arm',
    startAngle: 3.0,
    endAngle: 7.8,
    pitchAngle: 12,
    innerRadius: 7000,
    width: 1500,
    starCount: 400,
    cloudCount: 5,
    color: '#aa88bb',
    notable: true,
    description: 'Inner spiral arm',
    labelFraction: 0.3,
  },
  {
    name: 'Outer Arm',
    startAngle: 0.0,
    endAngle: 4.5,
    pitchAngle: 14,
    innerRadius: 22000,
    width: 1600,
    starCount: 350,
    cloudCount: 5,
    color: '#5577aa',
    notable: true,
    description: 'Outermost major arm',
    labelFraction: 0.4,
  },
  {
    name: 'Orion Arm',
    startAngle: 1.8,
    endAngle: 4.2,
    pitchAngle: 12,
    innerRadius: 15000,
    width: 1200,
    starCount: 300,
    cloudCount: 4,
    color: '#99bbee',
    notable: true,
    description: 'Our spiral arm',
    labelFraction: 0.5,
  },
];

// The Sun's position in galactic coordinates
// ~26,000 ly from galactic center
export const SUN_GALACTIC_POSITION: [number, number, number] = [26000, 0, 0];

export const GALACTIC_FEATURES: GalacticFeature[] = [
  {
    name: 'Galactic Center',
    position: [0, 0, 0],
    type: 'center',
    color: '#ffcc66',
    notable: true,
    description: 'Sagittarius A* · 26,000 ly',
  },
  {
    name: 'Sun',
    position: [26000, 0, 0],
    type: 'marker',
    color: '#ffee88',
    notable: true,
    description: 'You are here · 26,000 ly from center',
  },
];

// Galactic bar parameters
export const GALACTIC_BAR = {
  halfLength: 13000, // ly, half-length of the bar
  halfWidth: 3500, // ly, half-width
  angle: 0.45, // radians, angle of bar relative to Sun-center line (~25°)
  starCount: 800,
  color: '#ddbb77',
};

export const MILKY_WAY_SCALE_FACTOR = 5e13;
