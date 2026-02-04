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
    position: [100, 80, -75],
    distance: 150,
    type: 'open cluster',
    starCount: 30,
    notable: true,
    description: 'Open cluster · 150 ly',
  },
  {
    name: 'Ursa Major Group',
    position: [40, 55, 40],
    distance: 80,
    type: 'moving group',
    starCount: 20,
    notable: true,
    description: 'Moving group · 80 ly',
  },
  {
    name: 'Coma Berenices',
    position: [160, 200, 80],
    distance: 280,
    type: 'open cluster',
    starCount: 25,
    notable: false,
    description: 'Open cluster · 280 ly',
  },
  {
    name: 'Lower Centaurus Crux',
    position: [-200, -100, -290],
    distance: 380,
    type: 'association',
    starCount: 35,
    notable: false,
    description: 'OB association · 380 ly',
  },
  {
    name: 'Pleiades',
    position: [280, 200, -250],
    distance: 440,
    type: 'open cluster',
    starCount: 40,
    notable: true,
    description: 'Open cluster · 440 ly',
  },
  {
    name: 'Upper Centaurus Lupus',
    position: [-300, 100, 310],
    distance: 460,
    type: 'association',
    starCount: 30,
    notable: false,
    description: 'OB association · 460 ly',
  },
  {
    name: 'Scorpius–Centaurus',
    position: [-300, -250, -220],
    distance: 470,
    type: 'association',
    starCount: 35,
    notable: true,
    description: 'OB association · 470 ly',
  },
  {
    name: 'IC 2602',
    position: [-200, -350, 220],
    distance: 480,
    type: 'open cluster',
    starCount: 25,
    notable: false,
    description: 'Open cluster · 480 ly',
  },
  {
    name: 'Alpha Persei',
    position: [350, -200, 370],
    distance: 570,
    type: 'open cluster',
    starCount: 30,
    notable: false,
    description: 'Open cluster · 570 ly',
  },
];

export const BUBBLE_BOUNDARY: Array<{ direction: [number, number, number]; radius: number }> = [
  { direction: [1, 0, 0], radius: 500 },
  { direction: [-1, 0, 0], radius: 550 },
  { direction: [0, 0, 1], radius: 520 },
  { direction: [0, 0, -1], radius: 450 },
  { direction: [0, 1, 0], radius: 700 },
  { direction: [0, -1, 0], radius: 480 },
  { direction: [1, 1, 0], radius: 550 },
  { direction: [-1, 1, 0], radius: 600 },
  { direction: [1, -1, 0], radius: 450 },
  { direction: [-1, -1, 0], radius: 470 },
  { direction: [0, 1, 1], radius: 620 },
  { direction: [0, 1, -1], radius: 550 },
  { direction: [0, -1, 1], radius: 480 },
  { direction: [0, -1, -1], radius: 400 },
  { direction: [1, 0, 1], radius: 500 },
  { direction: [-1, 0, 1], radius: 530 },
  { direction: [1, 0, -1], radius: 470 },
  { direction: [-1, 0, -1], radius: 480 },
];

export const LOCAL_BUBBLE_SCALE_FACTOR = 1e11;
