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

// Notable nebulae, remnants, and associations within ~10,000 ly
// Positions in galactic cartesian coordinates (x=toward galactic center, y=galactic north, z=toward galactic rotation)
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
    name: 'Vela Supernova Remnant',
    position: [-400, -50, 680],
    distance: 800,
    type: 'supernova remnant',
    radius: 4,
    color: '#66ddee',
    notable: true,
    description: 'Supernova remnant · 800 ly',
  },
  {
    name: 'Orion Nebula',
    position: [-750, -300, -1050],
    distance: 1350,
    type: 'emission nebula',
    radius: 12,
    color: '#ff6b9d',
    notable: true,
    description: 'Emission nebula · 1,350 ly',
  },
  {
    name: 'Gum Nebula',
    position: [-600, -100, 1330],
    distance: 1500,
    type: 'emission nebula',
    radius: 18,
    color: '#ff8899',
    notable: false,
    description: 'Emission nebula · 1,500 ly',
  },
  {
    name: 'North America Nebula',
    position: [1200, 400, 2220],
    distance: 2600,
    type: 'emission nebula',
    radius: 25,
    color: '#ff7744',
    notable: true,
    description: 'Emission nebula · 2,600 ly',
  },
  {
    name: 'Lagoon Nebula',
    position: [-2500, -800, -3000],
    distance: 4100,
    type: 'star-forming region',
    radius: 27,
    color: '#ff5577',
    notable: true,
    description: 'Star-forming region · 4,100 ly',
  },
  {
    name: 'Rosette Nebula',
    position: [2800, 200, -4250],
    distance: 5200,
    type: 'emission nebula',
    radius: 32,
    color: '#cc3355',
    notable: false,
    description: 'Emission nebula · 5,200 ly',
  },
  {
    name: 'Cygnus OB2',
    position: [2000, 800, 4900],
    distance: 5500,
    type: 'ob association',
    radius: 15,
    color: '#8899ff',
    notable: true,
    description: 'OB association · 5,500 ly',
  },
  {
    name: 'Crab Nebula',
    position: [3500, 200, -5480],
    distance: 6500,
    type: 'supernova remnant',
    radius: 5.5,
    color: '#aabbff',
    notable: true,
    description: 'Supernova remnant · 6,500 ly',
  },
  {
    name: 'Eagle Nebula',
    position: [-4000, -600, 5600],
    distance: 7000,
    type: 'star-forming region',
    radius: 35,
    color: '#aacc44',
    notable: true,
    description: 'Star-forming region · 7,000 ly',
  },
  {
    name: 'Carina Nebula',
    position: [-4500, -1500, 6800],
    distance: 8500,
    type: 'star-forming region',
    radius: 115,
    color: '#ff8855',
    notable: true,
    description: 'Star-forming region · 8,500 ly',
  },
];

export const ORION_ARM_SCALE_FACTOR = 1e12;
