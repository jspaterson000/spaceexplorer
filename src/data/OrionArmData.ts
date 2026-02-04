// src/data/OrionArmData.ts

export interface OrionArmObject {
  name: string;
  position: [number, number, number]; // x, y, z in light years (galactic coords, Sun at origin)
  distance: number; // light years from Sun
  type: 'emission nebula' | 'supernova remnant' | 'ob association' | 'star-forming region' | 'marker';
  radius: number; // approximate visual radius in ly (for sprite sizing)
  color: string; // hex color for the nebula glow
  notable: boolean; // always show label
  description: string;
}

// Notable nebulae, remnants, and associations in the Orion Arm
// Positions derived from real galactic coordinates (l, b, distance):
//   x = d·cos(b)·cos(l)  (toward galactic center)
//   y = d·sin(b)          (galactic north)
//   z = d·cos(b)·sin(l)   (direction of galactic rotation)
export const ORION_ARM_OBJECTS: OrionArmObject[] = [
  {
    name: 'Local Bubble',
    position: [0, 0, 0],
    distance: 0,
    type: 'marker',
    radius: 0,
    color: '#ffee88',
    notable: true,
    description: 'You are here',
  },
  {
    // l=264°, b=-3°
    name: 'Vela Supernova Remnant',
    position: [-84, -42, -794],
    distance: 800,
    type: 'supernova remnant',
    radius: 8,
    color: '#66ddee',
    notable: true,
    description: 'Supernova remnant · 800 ly',
  },
  {
    // l=209°, b=-19°
    name: 'Orion Nebula',
    position: [-1116, -440, -619],
    distance: 1350,
    type: 'emission nebula',
    radius: 12,
    color: '#ff6b9d',
    notable: true,
    description: 'Emission nebula · 1,350 ly',
  },
  {
    // l=264°, b=-5° — enormous shell encompassing Vela SNR
    name: 'Gum Nebula',
    position: [-156, -131, -1485],
    distance: 1500,
    type: 'emission nebula',
    radius: 36,
    color: '#ff8899',
    notable: false,
    description: 'Emission nebula · 1,500 ly',
  },
  {
    // l=74°, b=-9° — the Veil Nebula complex
    name: 'Cygnus Loop',
    position: [653, -375, 2279],
    distance: 2400,
    type: 'supernova remnant',
    radius: 8,
    color: '#44bbcc',
    notable: true,
    description: 'Supernova remnant · 2,400 ly',
  },
  {
    // l=99°, b=+4° — Elephant Trunk Nebula region
    name: 'IC 1396',
    position: [-374, 167, 2365],
    distance: 2400,
    type: 'star-forming region',
    radius: 20,
    color: '#ee6644',
    notable: false,
    description: 'Star-forming region · 2,400 ly',
  },
  {
    // l=85°, b=-1°
    name: 'North America Nebula',
    position: [227, -45, 2589],
    distance: 2600,
    type: 'emission nebula',
    radius: 25,
    color: '#ff7744',
    notable: true,
    description: 'Emission nebula · 2,600 ly',
  },
  {
    // l=94°, b=-5° — reflection/emission nebula in Cygnus
    name: 'Cocoon Nebula',
    position: [-229, -288, 3279],
    distance: 3300,
    type: 'emission nebula',
    radius: 7,
    color: '#dd6655',
    notable: false,
    description: 'Emission nebula · 3,300 ly',
  },
  {
    // l=206°, b=-2°
    name: 'Rosette Nebula',
    position: [-4670, -181, -2278],
    distance: 5200,
    type: 'emission nebula',
    radius: 32,
    color: '#cc3355',
    notable: true,
    description: 'Emission nebula · 5,200 ly',
  },
  {
    // l=80°, b=+1° — one of the most massive OB associations known
    name: 'Cygnus OB2',
    position: [955, 96, 5416],
    distance: 5500,
    type: 'ob association',
    radius: 15,
    color: '#8899ff',
    notable: true,
    description: 'OB association · 5,500 ly',
  },
];

export interface MolecularCloud {
  name: string;
  position: [number, number, number]; // galactic cartesian, ly
  distance: number;
  extent: number; // approximate diameter in ly
  color: string; // base color (rendered very faintly)
  layers: number; // number of overlapping sprite layers for volume
}

// Major molecular cloud complexes in the Orion Arm
// These are vast regions of gas and dust — the raw material of star formation
export const MOLECULAR_CLOUDS: MolecularCloud[] = [
  {
    // l=210°, b=-15° — contains Orion Nebula, Barnard's Loop, Horsehead
    name: 'Orion Molecular Cloud',
    position: [-1050, -350, -580],
    distance: 1300,
    extent: 400,
    color: '#cc6688',
    layers: 3,
  },
  {
    // l=264°, b=-2° — vast region around Vela/Gum, multiple ridges
    name: 'Vela Molecular Ridge',
    position: [-190, -70, -1990],
    distance: 2000,
    extent: 500,
    color: '#8866aa',
    layers: 3,
  },
  {
    // l=80°, b=+1° — one of the richest star-forming complexes in the Galaxy
    name: 'Cygnus X',
    position: [780, 79, 4430],
    distance: 4500,
    extent: 600,
    color: '#5577bb',
    layers: 4,
  },
  {
    // l=205°, b=-1° — host of the Rosette Nebula
    name: 'Monoceros Cloud',
    position: [-2270, -44, -1060],
    distance: 2500,
    extent: 350,
    color: '#aa4466',
    layers: 2,
  },
  {
    // l=103°, b=+5° — massive cloud complex in Cepheus
    name: 'Cepheus Cloud',
    position: [-270, 105, 1170],
    distance: 1200,
    extent: 300,
    color: '#667799',
    layers: 2,
  },
];

export const ORION_ARM_SCALE_FACTOR = 1e12;
