# Local Bubble Layer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Local Bubble" scale level (~500 ly) above Stellar, showing the Local Bubble cavity boundary, major star clusters, and a Sun marker.

**Architecture:** Extend `ScaleLevel` enum with `LocalBubble` above `Stellar`. Bubble rendered as a `THREE.Group` containing a Fresnel-glowing shell mesh, boundary particles, cluster point clouds, and a pulsing Sun marker. Labels use CSS2DRenderer (same pattern as `StarLabels`). Transition uses existing fade-to-black pattern.

**Tech Stack:** Three.js (Points, ShaderMaterial, SphereGeometry), CSS2DRenderer, TypeScript, Vitest

---

## Task 1: Update ScaleLevel State

**Files:**
- Modify: `src/state/ScaleLevel.ts`
- Modify: `src/state/ScaleLevel.test.ts`

**Step 1: Write failing tests for the new level**

Add to `src/state/ScaleLevel.test.ts`:

```typescript
it('can go up from stellar to local bubble', () => {
  const state = new ScaleLevelState();
  state.goUp(); // Planet -> SolarSystem
  state.goUp(); // SolarSystem -> Stellar
  expect(state.canGoUp()).toBe(true);
  state.goUp(); // Stellar -> LocalBubble
  expect(state.current).toBe(ScaleLevel.LocalBubble);
});

it('cannot go up from local bubble (top level)', () => {
  const state = new ScaleLevelState();
  state.goUp(); // Planet -> SolarSystem
  state.goUp(); // SolarSystem -> Stellar
  state.goUp(); // Stellar -> LocalBubble
  expect(state.canGoUp()).toBe(false);
});

it('can go down from local bubble to stellar', () => {
  const state = new ScaleLevelState();
  state.goUp();
  state.goUp();
  state.goUp();
  expect(state.canGoDown()).toBe(true);
  state.goDown();
  expect(state.current).toBe(ScaleLevel.Stellar);
});

it('isLocalBubbleMode returns true at local bubble level', () => {
  const state = new ScaleLevelState();
  state.goUp();
  state.goUp();
  state.goUp();
  expect(state.isLocalBubbleMode()).toBe(true);
});

it('isLocalBubbleMode returns false at other levels', () => {
  const state = new ScaleLevelState();
  expect(state.isLocalBubbleMode()).toBe(false);
  state.goUp();
  expect(state.isLocalBubbleMode()).toBe(false);
  state.goUp();
  expect(state.isLocalBubbleMode()).toBe(false);
});
```

Also update the existing test `'cannot go up from solar system (top level)'` — it should now read:

```typescript
it('can go up from stellar (not top level anymore)', () => {
  const state = new ScaleLevelState();
  state.goUp(); // Planet -> SolarSystem
  state.goUp(); // SolarSystem -> Stellar
  expect(state.canGoUp()).toBe(true);
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- --run`
Expected: FAIL — `ScaleLevel.LocalBubble` doesn't exist, `isLocalBubbleMode` doesn't exist

**Step 3: Implement the changes in ScaleLevel.ts**

Replace the full contents of `src/state/ScaleLevel.ts`:

```typescript
export enum ScaleLevel {
  Planet = 'planet',
  SolarSystem = 'solar-system',
  Stellar = 'stellar',
  LocalBubble = 'local-bubble',
}

const LEVELS = [ScaleLevel.Planet, ScaleLevel.SolarSystem, ScaleLevel.Stellar, ScaleLevel.LocalBubble];

export class ScaleLevelState {
  private _current: ScaleLevel = ScaleLevel.Planet;
  private _lastFocusedBody: string = 'earth';

  get current(): ScaleLevel {
    return this._current;
  }

  get lastFocusedBody(): string {
    return this._lastFocusedBody;
  }

  setLastFocusedBody(body: string): void {
    this._lastFocusedBody = body;
  }

  canGoUp(): boolean {
    const idx = LEVELS.indexOf(this._current);
    return idx < LEVELS.length - 1;
  }

  canGoDown(): boolean {
    const idx = LEVELS.indexOf(this._current);
    return idx > 0;
  }

  goUp(): void {
    if (this.canGoUp()) {
      const idx = LEVELS.indexOf(this._current);
      this._current = LEVELS[idx + 1];
    }
  }

  goDown(): void {
    if (this.canGoDown()) {
      const idx = LEVELS.indexOf(this._current);
      this._current = LEVELS[idx - 1];
    }
  }

  isOrreryMode(): boolean {
    return this._current === ScaleLevel.SolarSystem;
  }

  isStellarMode(): boolean {
    return this._current === ScaleLevel.Stellar;
  }

  isLocalBubbleMode(): boolean {
    return this._current === ScaleLevel.LocalBubble;
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- --run`
Expected: All PASS

**Step 5: Verify build passes**

Run: `npm run build`
Expected: No errors (main.ts already handles `ScaleLevel.Stellar` as top, the new enum value doesn't break existing switch/if chains because they use explicit checks)

**Step 6: Commit**

```bash
git add src/state/ScaleLevel.ts src/state/ScaleLevel.test.ts
git commit -m "feat: add LocalBubble scale level"
```

---

## Task 2: Create Local Bubble Data

**Files:**
- Create: `src/data/LocalBubbleData.ts`

**Step 1: Create the data file with cluster and boundary data**

Create `src/data/LocalBubbleData.ts`:

```typescript
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
  // Sun's position (marker)
  {
    name: 'Sun',
    position: [0, 0, 0],
    distance: 0,
    type: 'marker',
    starCount: 0,
    notable: true,
    description: 'You are here',
  },

  // Hyades - nearest open cluster
  {
    name: 'Hyades',
    position: [13, 80, -125],
    distance: 150,
    type: 'open cluster',
    starCount: 30,
    notable: true,
    description: 'Open cluster · 150 ly',
  },

  // Ursa Major Moving Group
  {
    name: 'Ursa Major Group',
    position: [-10, 60, -50],
    distance: 80,
    type: 'moving group',
    starCount: 20,
    notable: false,
    description: 'Moving group · 80 ly',
  },

  // Coma Berenices cluster
  {
    name: 'Coma Berenices',
    position: [-60, 250, -70],
    distance: 280,
    type: 'open cluster',
    starCount: 25,
    notable: false,
    description: 'Open cluster · 280 ly',
  },

  // Lower Centaurus Crux (part of Sco-Cen)
  {
    name: 'Lower Centaurus Crux',
    position: [-120, -20, -360],
    distance: 380,
    type: 'association',
    starCount: 35,
    notable: false,
    description: 'OB association · 380 ly',
  },

  // Pleiades (Seven Sisters)
  {
    name: 'Pleiades',
    position: [50, 100, -420],
    distance: 440,
    type: 'open cluster',
    starCount: 40,
    notable: true,
    description: 'Open cluster · 440 ly',
  },

  // Upper Centaurus Lupus (part of Sco-Cen)
  {
    name: 'Upper Centaurus Lupus',
    position: [-200, -30, -400],
    distance: 460,
    type: 'association',
    starCount: 30,
    notable: false,
    description: 'OB association · 460 ly',
  },

  // Upper Scorpius (part of Sco-Cen) — the notable label for the Sco-Cen complex
  {
    name: 'Scorpius–Centaurus',
    position: [-180, -80, -420],
    distance: 470,
    type: 'association',
    starCount: 35,
    notable: true,
    description: 'OB association · 470 ly',
  },

  // IC 2602 (Southern Pleiades)
  {
    name: 'IC 2602',
    position: [-200, -120, -410],
    distance: 480,
    type: 'open cluster',
    starCount: 25,
    notable: false,
    description: 'Open cluster · 480 ly',
  },

  // Alpha Persei cluster
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

// Bubble boundary control points — defines the irregular shell shape
// These are approximate positions (in light years) of the Local Bubble wall.
// The bubble is elongated toward galactic north and compressed toward Sco-Cen.
// Format: [x, y, z, radius_at_this_direction]
// We'll use these as direction vectors with radii to build a deformed sphere.
export const BUBBLE_BOUNDARY: Array<{ direction: [number, number, number]; radius: number }> = [
  // Galactic plane directions
  { direction: [1, 0, 0], radius: 200 },      // toward galactic center
  { direction: [-1, 0, 0], radius: 250 },     // anti-center (slightly larger)
  { direction: [0, 0, 1], radius: 220 },      // galactic rotation direction
  { direction: [0, 0, -1], radius: 180 },     // anti-rotation (compressed near Sco-Cen)
  // Galactic north/south
  { direction: [0, 1, 0], radius: 350 },      // galactic north — elongated (chimney)
  { direction: [0, -1, 0], radius: 200 },     // galactic south
  // Diagonal directions for better shape definition
  { direction: [1, 1, 0], radius: 250 },
  { direction: [-1, 1, 0], radius: 280 },
  { direction: [1, -1, 0], radius: 180 },
  { direction: [-1, -1, 0], radius: 190 },
  { direction: [0, 1, 1], radius: 300 },
  { direction: [0, 1, -1], radius: 250 },
  { direction: [0, -1, 1], radius: 200 },
  { direction: [0, -1, -1], radius: 160 },    // compressed toward Sco-Cen below
  { direction: [1, 0, 1], radius: 210 },
  { direction: [-1, 0, 1], radius: 230 },
  { direction: [1, 0, -1], radius: 190 },
  { direction: [-1, 0, -1], radius: 200 },
];

// Scale factor: same sqrt compression and scale factor used by Stars.ts
// Stars.ts uses: Math.sign(x) * Math.sqrt(Math.abs(x)) * 1e11
// We reuse the same approach so everything stays in the same coordinate space.
export const LOCAL_BUBBLE_SCALE_FACTOR = 1e11;
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: No errors

**Step 3: Commit**

```bash
git add src/data/LocalBubbleData.ts
git commit -m "feat: add Local Bubble cluster and boundary data"
```

---

## Task 3: Create Local Bubble Renderer

**Files:**
- Create: `src/objects/LocalBubble.ts`

**Step 1: Create the LocalBubble class**

Create `src/objects/LocalBubble.ts`. This class creates a `THREE.Group` containing:
1. A deformed sphere shell with Fresnel edge-glow (like OortCloud)
2. Boundary particles scattered on the shell surface
3. Star cluster point clouds at each cluster position
4. A pulsing Sun marker at origin

```typescript
// src/objects/LocalBubble.ts
import * as THREE from 'three';
import {
  LOCAL_BUBBLE_CLUSTERS,
  BUBBLE_BOUNDARY,
  LOCAL_BUBBLE_SCALE_FACTOR,
  type StarCluster,
} from '../data/LocalBubbleData';
import { SPECTRAL_COLORS } from '../data/NearbyStars';

/**
 * Visual representation of the Local Bubble — a ~300 ly cavity in the ISM.
 * Contains: deformed shell, boundary particles, star cluster clouds, Sun marker.
 */
export class LocalBubble {
  readonly mesh: THREE.Group;
  private shell: THREE.Mesh;
  private shellMaterial: THREE.ShaderMaterial;
  private boundaryParticles: THREE.Points;
  private boundaryMaterial: THREE.ShaderMaterial;
  private clusterPoints: THREE.Points;
  private clusterMaterial: THREE.ShaderMaterial;
  private sunMarker: THREE.Mesh;
  private sunMarkerMaterial: THREE.ShaderMaterial;
  private targetOpacity = 1.0;
  private currentOpacity = 1.0;

  private static readonly SF = LOCAL_BUBBLE_SCALE_FACTOR;

  constructor() {
    this.mesh = new THREE.Group();

    // 1. Shell
    const shellResult = this.createShell();
    this.shell = shellResult.mesh;
    this.shellMaterial = shellResult.material;
    this.mesh.add(this.shell);

    // 2. Boundary particles
    const bpResult = this.createBoundaryParticles();
    this.boundaryParticles = bpResult.mesh;
    this.boundaryMaterial = bpResult.material;
    this.mesh.add(this.boundaryParticles);

    // 3. Star clusters
    const clResult = this.createClusterPoints();
    this.clusterPoints = clResult.mesh;
    this.clusterMaterial = clResult.material;
    this.mesh.add(this.clusterPoints);

    // 4. Sun marker
    const smResult = this.createSunMarker();
    this.sunMarker = smResult.mesh;
    this.sunMarkerMaterial = smResult.material;
    this.mesh.add(this.sunMarker);

    this.mesh.visible = false;
  }

  // --- Helpers for converting light-year positions to scaled coordinates ---
  private static scaleCoord(ly: number): number {
    return Math.sign(ly) * Math.sqrt(Math.abs(ly)) * LocalBubble.SF;
  }

  private static scalePosition(pos: [number, number, number]): THREE.Vector3 {
    return new THREE.Vector3(
      LocalBubble.scaleCoord(pos[0]),
      LocalBubble.scaleCoord(pos[1]),
      LocalBubble.scaleCoord(pos[2]),
    );
  }

  // --- Shell: deformed sphere with Fresnel glow ---
  private createShell(): { mesh: THREE.Mesh; material: THREE.ShaderMaterial } {
    // Start with an icosphere, then deform vertices based on boundary data
    const baseRadius = Math.sqrt(250) * LocalBubble.SF; // ~250 ly average radius scaled
    const geometry = new THREE.IcosahedronGeometry(baseRadius, 4);
    const posAttr = geometry.attributes.position;

    // For each vertex, find the direction and interpolate the radius from boundary data
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);
      const len = Math.sqrt(x * x + y * y + z * z);
      if (len === 0) continue;
      const nx = x / len;
      const ny = y / len;
      const nz = z / len;

      // Weighted average of boundary radii based on dot product with each direction
      let weightedRadius = 0;
      let totalWeight = 0;
      for (const bp of BUBBLE_BOUNDARY) {
        const [dx, dy, dz] = bp.direction;
        const dLen = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const dot = (nx * dx + ny * dy + nz * dz) / dLen;
        // Use a power function to sharpen the influence
        const weight = Math.pow(Math.max(0, dot), 4);
        weightedRadius += bp.radius * weight;
        totalWeight += weight;
      }

      const finalRadiusLy = totalWeight > 0 ? weightedRadius / totalWeight : 250;
      const finalRadius = Math.sqrt(finalRadiusLy) * LocalBubble.SF;

      posAttr.setXYZ(i, nx * finalRadius, ny * finalRadius, nz * finalRadius);
    }

    geometry.computeVertexNormals();

    const material = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0x4455aa) },
        baseOpacity: { value: 0.03 },
        fadeOpacity: { value: 1.0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float baseOpacity;
        uniform float fadeOpacity;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vec3 viewDir = normalize(-vPosition);
          float fresnel = 1.0 - abs(dot(viewDir, vNormal));
          fresnel = pow(fresnel, 2.0);

          // Blend from base color to lighter edge color
          vec3 edgeColor = vec3(0.4, 0.47, 0.8); // #6677cc
          vec3 finalColor = mix(color, edgeColor, fresnel);

          gl_FragColor = vec4(finalColor, fresnel * baseOpacity * 5.0 * fadeOpacity);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { mesh: new THREE.Mesh(geometry, material), material };
  }

  // --- Boundary particles: scattered along the shell surface ---
  private createBoundaryParticles(): { mesh: THREE.Points; material: THREE.ShaderMaterial } {
    const particleCount = 500;
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Random direction on unit sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const nx = Math.sin(phi) * Math.cos(theta);
      const ny = Math.sin(phi) * Math.sin(theta);
      const nz = Math.cos(phi);

      // Interpolate radius from boundary data (same logic as shell)
      let weightedRadius = 0;
      let totalWeight = 0;
      for (const bp of BUBBLE_BOUNDARY) {
        const [dx, dy, dz] = bp.direction;
        const dLen = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const dot = (nx * dx + ny * dy + nz * dz) / dLen;
        const weight = Math.pow(Math.max(0, dot), 4);
        weightedRadius += bp.radius * weight;
        totalWeight += weight;
      }
      const radiusLy = (totalWeight > 0 ? weightedRadius / totalWeight : 250);
      // Scatter slightly around the shell (±10% radial variation)
      const jitter = 0.9 + Math.random() * 0.2;
      const radius = Math.sqrt(radiusLy * jitter) * LocalBubble.SF;

      positions[i * 3] = nx * radius;
      positions[i * 3 + 1] = ny * radius;
      positions[i * 3 + 2] = nz * radius;
      sizes[i] = 0.5 + Math.random() * 1.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0x6688cc) },
        scale: { value: 1.0 },
        fadeOpacity: { value: 1.0 },
        time: { value: 0.0 },
      },
      vertexShader: `
        attribute float size;
        uniform float scale;
        uniform float time;
        varying float vAlpha;

        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          gl_PointSize = size * scale * (300.0 / -mvPosition.z);
          gl_PointSize = clamp(gl_PointSize, 1.0, 8.0);

          // Subtle shimmer
          float shimmer = sin(time * 0.001 + position.x * 0.00001) * 0.3 + 0.7;
          vAlpha = clamp(1.0 - (-mvPosition.z / 1e13), 0.1, 0.5) * shimmer;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float fadeOpacity;
        varying float vAlpha;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = (1.0 - dist * 2.0) * vAlpha;
          gl_FragColor = vec4(color, alpha * 0.4 * fadeOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { mesh: new THREE.Points(geometry, material), material };
  }

  // --- Star cluster point clouds ---
  private createClusterPoints(): { mesh: THREE.Points; material: THREE.ShaderMaterial } {
    // Only create points for non-marker clusters
    const clusters = LOCAL_BUBBLE_CLUSTERS.filter(c => c.type !== 'marker');

    // Total points = sum of starCount across all clusters
    const totalPoints = clusters.reduce((sum, c) => sum + c.starCount, 0);
    const positions = new Float32Array(totalPoints * 3);
    const colors = new Float32Array(totalPoints * 3);
    const sizes = new Float32Array(totalPoints);

    // Spectral type distribution weights for generating random stars
    const spectralTypes = ['B', 'A', 'F', 'G', 'K', 'M'];
    const spectralWeights = [0.05, 0.1, 0.15, 0.2, 0.2, 0.3]; // M most common

    let idx = 0;
    for (const cluster of clusters) {
      const center = LocalBubble.scalePosition(cluster.position);
      // Spread radius scales with cluster size, but capped
      const spreadLy = Math.min(30, cluster.starCount * 0.5);
      const spread = Math.sqrt(spreadLy) * LocalBubble.SF;

      for (let i = 0; i < cluster.starCount; i++) {
        // Random position within gaussian-ish cloud around center
        const ox = (Math.random() - 0.5) * 2 * spread;
        const oy = (Math.random() - 0.5) * 2 * spread;
        const oz = (Math.random() - 0.5) * 2 * spread;

        positions[idx * 3] = center.x + ox;
        positions[idx * 3 + 1] = center.y + oy;
        positions[idx * 3 + 2] = center.z + oz;

        // Random spectral type based on weights
        let rand = Math.random();
        let spectral = 'G';
        let cumulative = 0;
        for (let j = 0; j < spectralTypes.length; j++) {
          cumulative += spectralWeights[j];
          if (rand <= cumulative) {
            spectral = spectralTypes[j];
            break;
          }
        }
        const hex = SPECTRAL_COLORS[spectral] || SPECTRAL_COLORS['G'];
        const color = new THREE.Color(hex);
        colors[idx * 3] = color.r;
        colors[idx * 3 + 1] = color.g;
        colors[idx * 3 + 2] = color.b;

        sizes[idx] = 1.0 + Math.random() * 3.0;
        idx++;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        scale: { value: 1.0 },
        opacity: { value: 1.0 },
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        varying float vSize;
        uniform float scale;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          float distanceAttenuation = 5000.0 / max(-mvPosition.z, 1.0);
          gl_PointSize = size * scale * distanceAttenuation;
          gl_PointSize = clamp(gl_PointSize, 4.0, 40.0);
          vSize = gl_PointSize;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vSize;
        uniform float opacity;

        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;

          float core = exp(-dist * 6.0);
          float glow = exp(-dist * 2.0) * 0.8;
          float intensity = (core + glow) * 1.5;

          vec3 coreColor = mix(vColor, vec3(1.0), 0.7);
          vec3 finalColor = mix(vColor * intensity, coreColor * intensity, core);

          gl_FragColor = vec4(finalColor, intensity * opacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });

    return { mesh: new THREE.Points(geometry, material), material };
  }

  // --- Sun marker: pulsing ring at origin ---
  private createSunMarker(): { mesh: THREE.Mesh; material: THREE.ShaderMaterial } {
    const radius = Math.sqrt(3) * LocalBubble.SF; // Small ring, ~3 ly equivalent
    const geometry = new THREE.RingGeometry(radius * 0.8, radius, 32);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0xffee88) },
        time: { value: 0.0 },
        fadeOpacity: { value: 1.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float time;
        uniform float fadeOpacity;
        varying vec2 vUv;

        void main() {
          // Pulsing effect
          float pulse = sin(time * 0.002) * 0.3 + 0.7;
          gl_FragColor = vec4(color, pulse * fadeOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });

    const mesh = new THREE.Mesh(geometry, material);
    // Face the ring toward the camera by default (billboard later or just face Y)
    mesh.rotation.x = -Math.PI / 2;
    return { mesh, material };
  }

  // --- Public API (matches OortCloud/Stars pattern) ---

  setVisible(visible: boolean): void {
    this.mesh.visible = visible;
    if (visible) {
      this.currentOpacity = 1.0;
      this.targetOpacity = 1.0;
      this.updateAllOpacities(1.0);
    }
  }

  setOpacity(opacity: number): void {
    this.targetOpacity = opacity;
  }

  setOpacityImmediate(opacity: number): void {
    this.currentOpacity = opacity;
    this.targetOpacity = opacity;
    this.updateAllOpacities(opacity);
  }

  updateOpacity(damping = 0.08): void {
    this.currentOpacity += (this.targetOpacity - this.currentOpacity) * damping;
    this.updateAllOpacities(this.currentOpacity);
  }

  /** Call each frame to update time-based animations (shimmer, pulse) */
  update(time: number): void {
    this.boundaryMaterial.uniforms.time.value = time;
    this.sunMarkerMaterial.uniforms.time.value = time;
  }

  addToScene(scene: THREE.Scene): void {
    scene.add(this.mesh);
  }

  /** Get cluster data for label creation */
  getClusters(): StarCluster[] {
    return LOCAL_BUBBLE_CLUSTERS;
  }

  /** Get the scaled position of a cluster by index */
  getClusterPosition(index: number): THREE.Vector3 {
    const cluster = LOCAL_BUBBLE_CLUSTERS[index];
    if (!cluster) return new THREE.Vector3();
    return LocalBubble.scalePosition(cluster.position);
  }

  private updateAllOpacities(opacity: number): void {
    this.shellMaterial.uniforms.fadeOpacity.value = opacity;
    this.boundaryMaterial.uniforms.fadeOpacity.value = opacity;
    this.clusterMaterial.uniforms.opacity.value = opacity;
    this.sunMarkerMaterial.uniforms.fadeOpacity.value = opacity;
  }
}
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: No errors

**Step 3: Commit**

```bash
git add src/objects/LocalBubble.ts
git commit -m "feat: add LocalBubble renderer with shell, clusters, and Sun marker"
```

---

## Task 4: Create Local Bubble Labels

**Files:**
- Create: `src/ui/LocalBubbleLabels.ts`
- Modify: `src/styles/main.css`

**Step 1: Create LocalBubbleLabels class**

Create `src/ui/LocalBubbleLabels.ts`. This follows the exact same pattern as `StarLabels.ts` — CSS2DRenderer with leader lines, notable/hover split, staggered animation.

```typescript
// src/ui/LocalBubbleLabels.ts
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import type { StarCluster } from '../data/LocalBubbleData';

/**
 * Floating labels for star clusters in Local Bubble mode.
 * Uses CSS2DRenderer for crisp HTML-based labels with animated leader lines.
 * Notable clusters show labels always; non-notable show on hover.
 */
export class LocalBubbleLabels {
  private renderer: CSS2DRenderer;
  private labels: Map<string, CSS2DObject> = new Map();
  private notableLabels: Set<string> = new Set();
  private hoverLabels: Set<string> = new Set();
  private scene: THREE.Scene;
  private visible = false;
  private currentHover: string | null = null;
  private clusterPositions: Map<string, THREE.Vector3> = new Map();

  constructor(container: HTMLElement, scene: THREE.Scene) {
    this.scene = scene;

    this.renderer = new CSS2DRenderer();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.pointerEvents = 'none';
    container.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  addLabel(cluster: StarCluster, position: THREE.Vector3, color: string, notable: boolean): void {
    const labelDiv = document.createElement('div');
    labelDiv.className = 'local-bubble-label';

    const contentEl = document.createElement('span');
    contentEl.className = 'local-bubble-label-content';

    const lineEl = document.createElement('span');
    lineEl.className = 'local-bubble-label-line';
    lineEl.style.background = `linear-gradient(90deg, transparent 0%, ${color} 100%)`;

    const textEl = document.createElement('span');
    textEl.className = 'local-bubble-label-text';

    const nameEl = document.createElement('span');
    nameEl.className = 'local-bubble-label-name';
    nameEl.textContent = cluster.name;

    const descEl = document.createElement('span');
    descEl.className = 'local-bubble-label-desc';
    descEl.textContent = cluster.description;

    textEl.appendChild(nameEl);
    textEl.appendChild(descEl);
    contentEl.appendChild(textEl);
    contentEl.appendChild(lineEl);
    labelDiv.appendChild(contentEl);

    const label = new CSS2DObject(labelDiv);
    label.position.copy(position);
    label.center.set(1, 0.5); // Anchor right, so label appears to the left
    label.visible = notable ? this.visible : false;

    this.labels.set(cluster.name, label);
    this.clusterPositions.set(cluster.name, position.clone());

    if (notable) {
      this.notableLabels.add(cluster.name);
    } else {
      this.hoverLabels.add(cluster.name);
    }

    this.scene.add(label);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.renderer.domElement.style.display = visible ? 'block' : 'none';

    if (visible) {
      this.labels.forEach((label, name) => {
        const isNotable = this.notableLabels.has(name);
        label.visible = isNotable;
        const el = label.element as HTMLElement;
        el.classList.remove('line-visible', 'text-visible', 'hover-visible');
      });

      // Stage 1: Draw lines with stagger
      let lineDelay = 500;
      this.notableLabels.forEach((name) => {
        const label = this.labels.get(name);
        if (label) {
          const el = label.element as HTMLElement;
          setTimeout(() => el.classList.add('line-visible'), lineDelay);
          lineDelay += 100;
        }
      });

      // Stage 2: Fade in text with stagger
      let textDelay = 500 + 500;
      this.notableLabels.forEach((name) => {
        const label = this.labels.get(name);
        if (label) {
          const el = label.element as HTMLElement;
          setTimeout(() => el.classList.add('text-visible'), textDelay);
          textDelay += 80;
        }
      });
    } else {
      this.currentHover = null;
      this.labels.forEach((label) => {
        label.visible = false;
        const el = label.element as HTMLElement;
        el.classList.remove('line-visible', 'text-visible', 'hover-visible');
      });
    }
  }

  render(camera: THREE.Camera): void {
    if (this.visible) {
      this.renderer.render(this.scene, camera);
    }
  }

  getClusterPositions(): Map<string, THREE.Vector3> {
    return this.clusterPositions;
  }

  getHoverLabels(): Set<string> {
    return this.hoverLabels;
  }

  showHoverLabel(name: string): void {
    if (!this.visible || !this.hoverLabels.has(name)) return;
    if (this.currentHover === name) return;

    this.hideHoverLabel();

    const label = this.labels.get(name);
    if (label) {
      this.currentHover = name;
      label.visible = true;
      const el = label.element as HTMLElement;
      el.classList.add('line-visible', 'text-visible', 'hover-visible');
    }
  }

  hideHoverLabel(): void {
    if (this.currentHover && this.hoverLabels.has(this.currentHover)) {
      const label = this.labels.get(this.currentHover);
      if (label) {
        label.visible = false;
        const el = label.element as HTMLElement;
        el.classList.remove('line-visible', 'text-visible', 'hover-visible');
      }
    }
    this.currentHover = null;
  }
}
```

**Step 2: Add CSS styles for Local Bubble labels**

Append to `src/styles/main.css` (after the star label styles):

```css
/* Local Bubble Labels */
.local-bubble-label {
  white-space: nowrap;
  pointer-events: none;
}

.local-bubble-label-content {
  display: flex;
  flex-direction: row;
  align-items: center;
  transform: translateX(-6px);
}

.local-bubble-label-line {
  width: 0;
  height: 1px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.5);
  transition: width 0.5s ease-out;
}

.local-bubble-label.line-visible .local-bubble-label-line {
  width: 25px;
}

.local-bubble-label-text {
  display: flex;
  flex-direction: column;
  margin-right: 6px;
  opacity: 0;
  transform: translateX(-5px);
  transition: opacity 0.4s ease-out, transform 0.4s ease-out;
}

.local-bubble-label.text-visible .local-bubble-label-text {
  opacity: 1;
  transform: translateX(0);
}

.local-bubble-label.hover-visible .local-bubble-label-line {
  width: 25px;
  transition: none;
}

.local-bubble-label.hover-visible .local-bubble-label-text {
  opacity: 1;
  transform: translateX(0);
  transition: none;
}

.local-bubble-label-name {
  font-family: 'Playfair Display', serif;
  font-size: 11px;
  font-weight: 400;
  color: rgba(230, 237, 243, 0.9);
  letter-spacing: 0.3px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

.local-bubble-label-desc {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px;
  color: rgba(180, 190, 200, 0.6);
  margin-top: 2px;
}
```

**Step 3: Verify build passes**

Run: `npm run build`
Expected: No errors

**Step 4: Commit**

```bash
git add src/ui/LocalBubbleLabels.ts src/styles/main.css
git commit -m "feat: add LocalBubbleLabels with animated leader lines"
```

---

## Task 5: Update ScaleLevelNav for 4 Levels

**Files:**
- Modify: `src/ui/ScaleLevelNav.ts`

**Step 1: Add the LocalBubble label to getLevelLabel()**

In `src/ui/ScaleLevelNav.ts`, add a case to the `getLevelLabel()` switch statement:

```typescript
case ScaleLevel.LocalBubble:
  return 'Bubble';
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: No errors

**Step 3: Commit**

```bash
git add src/ui/ScaleLevelNav.ts
git commit -m "feat: add Local Bubble to scale level navigation"
```

---

## Task 6: Add Title Card and HTML Template for Local Bubble

**Files:**
- Modify: `index.html`
- Modify: `src/main.ts` (the `updateTitleCardForLevel` function only)

**Step 1: Add Local Bubble facts template to index.html**

Add after the `stellar-facts-template` template element (after line 36):

```html
<!-- Local Bubble mode content template (hidden) -->
<template id="local-bubble-facts-template">
  <div class="fact-row"><span class="fact-label">Radius</span><span class="fact-value">~300 light years</span></div>
  <div class="fact-row"><span class="fact-label">Clusters</span><span class="fact-value">10+</span></div>
  <div class="fact-row"><span class="fact-label">Nearest</span><span class="fact-value">Ursa Major Group (80 ly)</span></div>
  <div class="fact-row"><span class="fact-label">Age</span><span class="fact-value">~14 million years</span></div>
  <div class="fact-highlight">A cavity in the interstellar medium carved by ancient supernovae</div>
</template>
```

**Step 2: Update updateTitleCardForLevel in main.ts**

Add an `else if` branch for LocalBubble in the `updateTitleCardForLevel` function. After the `else if (level === ScaleLevel.Stellar)` block, add:

```typescript
else if (level === ScaleLevel.LocalBubble) {
  titleElement.textContent = 'Local Bubble';
  const localBubbleFactsTemplate = document.getElementById('local-bubble-facts-template') as HTMLTemplateElement;
  if (localBubbleFactsTemplate) {
    factsElement.innerHTML = localBubbleFactsTemplate.innerHTML;
  }
  statsElement.classList.add('hidden');
}
```

**Step 3: Verify build passes**

Run: `npm run build`
Expected: No errors

**Step 4: Commit**

```bash
git add index.html src/main.ts
git commit -m "feat: add Local Bubble title card content"
```

---

## Task 7: Integrate Local Bubble into Main App

**Files:**
- Modify: `src/main.ts`

This is the largest task — wiring everything together in `main.ts`.

**Step 1: Add imports**

Add after the existing imports at the top of `src/main.ts`:

```typescript
import { LocalBubble } from './objects/LocalBubble';
import { LocalBubbleLabels } from './ui/LocalBubbleLabels';
```

**Step 2: Instantiate LocalBubble and LocalBubbleLabels**

Add after the star labels setup (after `starLabels.addLabel(...)` loop, around line 139):

```typescript
// Local Bubble (visible in local bubble mode)
const localBubble = new LocalBubble();
localBubble.addToScene(scene);

// Local Bubble labels
const localBubbleLabels = new LocalBubbleLabels(document.body, scene);

// Add labels for all clusters
localBubble.getClusters().forEach((cluster, index) => {
  const position = localBubble.getClusterPosition(index);
  // Use a blue-violet color for cluster labels
  const color = cluster.type === 'marker' ? '#ffee88' : '#6677cc';
  localBubbleLabels.addLabel(cluster, position, color, cluster.notable);
});
```

**Step 3: Add Local Bubble transition in the scale level change handler**

In the `scaleLevelNav.setOnLevelChange` callback, add a variable at the top:

```typescript
const isLocalBubble = level === ScaleLevel.LocalBubble;
```

Then add a new `else if (isLocalBubble)` block inside the `setup` function, after the `isStellar` block (around line 351):

```typescript
} else if (isLocalBubble) {
  // ========================================
  // Stellar → Local Bubble
  // ========================================
  orbitCamera.setPositionImmediate(12.5, Math.PI / 3, new THREE.Vector3(0, 0, 0));

  // Hide all solar system objects
  earth.mesh.visible = false;
  earth.atmosphere.visible = false;
  mercury.mesh.visible = false;
  venus.mesh.visible = false;
  mars.mesh.visible = false;
  jupiter.mesh.visible = false;
  saturn.mesh.visible = false;
  uranus.mesh.visible = false;
  neptune.mesh.visible = false;
  moon.mesh.visible = false;
  satellites.mesh.visible = false;
  sun.mesh.visible = false;
  sun.hideFlares();

  // Hide solar system overlays
  orbitalPaths.forEach(({ path }) => path.setVisible(false));
  oortCloud.setVisible(false);
  planetLabels.setVisible(false);

  // Hide stellar elements
  stars.setVisible(false);
  starLabels.setVisible(false);

  // Show Local Bubble
  localBubble.setVisible(true);
  localBubble.setOpacityImmediate(1);

  // Hide journey dock and time controls
  journeyDock.style.display = 'none';
  timeControls.hide();

  // Enable auto-rotation
  orbitCamera.setAutoRotate(true);

  // Zoom out during fade-in
  orbitCamera.animateZoomTo(13.0);
}
```

Also update the `afterReveal` callback to handle LocalBubble. Add after the `isStellar` branch:

```typescript
} else if (isLocalBubble) {
  // Show local bubble labels after zoom completes
  setTimeout(() => {
    localBubbleLabels.setVisible(true);
  }, 3000);
}
```

**Step 4: Update the existing `isStellar` and `isOrrery` setup blocks to also hide Local Bubble**

In the `isOrrery` block (setup function), add:

```typescript
// Hide local bubble elements
localBubble.setVisible(false);
localBubbleLabels.setVisible(false);
```

In the `isStellar` block (setup function), add:

```typescript
// Hide local bubble elements
localBubble.setVisible(false);
localBubbleLabels.setVisible(false);
```

In the `isPlanet` block (setup function), add:

```typescript
localBubble.setVisible(false);
localBubbleLabels.setVisible(false);
```

**Step 5: Update the animation loop**

In the `animate()` function, add after `oortCloud.updateOpacity(0.06);`:

```typescript
// Update Local Bubble animations and opacity
localBubble.update(time);
localBubble.updateOpacity(0.06);
```

Add after `starLabels.render(orbitCamera.camera);`:

```typescript
// Render local bubble labels
localBubbleLabels.render(orbitCamera.camera);
```

**Step 6: Verify build passes**

Run: `npm run build`
Expected: No errors

**Step 7: Commit**

```bash
git add src/main.ts
git commit -m "feat: integrate Local Bubble into main app with transitions"
```

---

## Task 8: Test, Polish, and Deploy

**Step 1: Run unit tests**

Run: `npm test -- --run`
Expected: All PASS

**Step 2: Run dev server and manually test all transitions**

Run: `npm run dev`

Test the following sequence:
1. Start at Planet level (Earth) — verify normal view
2. Go up to Solar System — verify orrery with labels, Oort Cloud
3. Go up to Stellar — verify stars and star labels appear
4. Go up to Local Bubble — verify:
   - Fade to black, stars disappear
   - Bubble shell visible with Fresnel glow at edges
   - Star clusters visible as colored point clouds
   - Sun marker visible and pulsing at center
   - Labels appear after zoom (Sun "You are here", Hyades, Pleiades, Scorpius-Centaurus)
   - Auto-rotation active
   - Title card shows "Local Bubble" with facts
   - Up arrow disabled (no level above)
5. Go back down to Stellar — verify stars reappear
6. Go back down to Solar System — verify orrery
7. Go back down to Planet — verify normal Earth view

**Step 3: Fix any visual issues found during testing**

Adjust if needed:
- Shell opacity/color
- Cluster point spread
- Camera zoom distances
- Label positions
- Animation timing

**Step 4: Build for production**

Run: `npm run build`
Expected: No errors, clean build

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: polish Local Bubble visuals and transitions"
```

**Step 6: Push and deploy**

```bash
git push origin main
npm run deploy
```

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Update ScaleLevel state with LocalBubble + tests |
| 2 | Create Local Bubble cluster and boundary data |
| 3 | Create LocalBubble renderer (shell, particles, clusters, Sun marker) |
| 4 | Create LocalBubbleLabels with CSS2D animations |
| 5 | Update ScaleLevelNav for 4 levels |
| 6 | Add title card and HTML template |
| 7 | Integrate into main app (transitions, visibility, animation loop) |
| 8 | Test, polish, and deploy |
