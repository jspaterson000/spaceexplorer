// src/data/LocalBubbleData.ts

export interface StarCluster {
  name: string;
  position: [number, number, number]; // x, y, z in light years (galactic coords, Sun at origin)
  distance: number; // light years from Sun
  type: 'open cluster' | 'association' | 'moving group' | 'marker';
  starCount: number; // approximate, used for sizing the rendered cloud
  notable: boolean; // always show label
  description: string; // short descriptor for label
}

// Major star clusters and associations within ~600 ly
// Positions in galactic cartesian coordinates (x=toward galactic center, y=galactic north, z=toward galactic rotation)
export const LOCAL_BUBBLE_CLUSTERS: StarCluster[] = [
  {
    name: 'Sun',
    position: [0, 0, 0],
    distance: 0,
    type: 'marker',
    starCount: 0,
    notable: true,
    description: 'You are here',
  },
  {
    name: 'Hyades',
    position: [13, 80, -125],
    distance: 150,
    type: 'open cluster',
    starCount: 30,
    notable: true,
    description: 'Open cluster · 150 ly',
  },
  {
    name: 'Ursa Major Group',
    position: [-10, 60, -50],
    distance: 80,
    type: 'moving group',
    starCount: 20,
    notable: false,
    description: 'Moving group · 80 ly',
  },
  {
    name: 'Coma Berenices',
    position: [-60, 250, -70],
    distance: 280,
    type: 'open cluster',
    starCount: 25,
    notable: false,
    description: 'Open cluster · 280 ly',
  },
  {
    name: 'Lower Centaurus Crux',
    position: [-120, -20, -360],
    distance: 380,
    type: 'association',
    starCount: 35,
    notable: false,
    description: 'OB association · 380 ly',
  },
  {
    name: 'Pleiades',
    position: [50, 100, -420],
    distance: 440,
    type: 'open cluster',
    starCount: 40,
    notable: true,
    description: 'Open cluster · 440 ly',
  },
  {
    name: 'Upper Centaurus Lupus',
    position: [-200, -30, -400],
    distance: 460,
    type: 'association',
    starCount: 30,
    notable: false,
    description: 'OB association · 460 ly',
  },
  {
    name: 'Scorpius–Centaurus',
    position: [-180, -80, -420],
    distance: 470,
    type: 'association',
    starCount: 35,
    notable: true,
    description: 'OB association · 470 ly',
  },
  {
    name: 'IC 2602',
    position: [-200, -120, -410],
    distance: 480,
    type: 'open cluster',
    starCount: 25,
    notable: false,
    description: 'Open cluster · 480 ly',
  },
  {
    name: 'Alpha Persei',
    position: [160, 130, -530],
    distance: 570,
    type: 'open cluster',
    starCount: 30,
    notable: false,
    description: 'Open cluster · 570 ly',
  },
];

export const BUBBLE_BOUNDARY: Array<{ direction: [number, number, number]; radius: number }> = [
  { direction: [1, 0, 0], radius: 200 },
  { direction: [-1, 0, 0], radius: 250 },
  { direction: [0, 0, 1], radius: 220 },
  { direction: [0, 0, -1], radius: 180 },
  { direction: [0, 1, 0], radius: 350 },
  { direction: [0, -1, 0], radius: 200 },
  { direction: [1, 1, 0], radius: 250 },
  { direction: [-1, 1, 0], radius: 280 },
  { direction: [1, -1, 0], radius: 180 },
  { direction: [-1, -1, 0], radius: 190 },
  { direction: [0, 1, 1], radius: 300 },
  { direction: [0, 1, -1], radius: 250 },
  { direction: [0, -1, 1], radius: 200 },
  { direction: [0, -1, -1], radius: 160 },
  { direction: [1, 0, 1], radius: 210 },
  { direction: [-1, 0, 1], radius: 230 },
  { direction: [1, 0, -1], radius: 190 },
  { direction: [-1, 0, -1], radius: 200 },
];

export const LOCAL_BUBBLE_SCALE_FACTOR = 1e11;
