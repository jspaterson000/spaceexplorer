# Stellar Neighborhood Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Stellar" scale level showing ~52 nearby stars within 15-20 light years of the Sun.

**Architecture:** Extend ScaleLevel with "Stellar" above "SolarSystem". Stars rendered as THREE.Points with glow shader. Two-stage camera transition (fade out solar system → pause → stars fade in). Labels follow existing leader-line pattern.

**Tech Stack:** Three.js (Points, ShaderMaterial), CSS2DRenderer, TypeScript

---

## Task 1: Add Stellar Scale Level

**Files:**
- Modify: `src/state/ScaleLevel.ts`

**Step 1: Add Stellar enum value and update LEVELS array**

```typescript
export enum ScaleLevel {
  Planet = 'planet',
  SolarSystem = 'solar-system',
  Stellar = 'stellar',
}

const LEVELS = [ScaleLevel.Planet, ScaleLevel.SolarSystem, ScaleLevel.Stellar];
```

**Step 2: Add helper method for stellar mode**

Add after `isOrreryMode()`:

```typescript
isStellarMode(): boolean {
  return this._current === ScaleLevel.Stellar;
}
```

**Step 3: Verify build passes**

Run: `npm run build`
Expected: No errors

**Step 4: Commit**

```bash
git add src/state/ScaleLevel.ts
git commit -m "feat: add Stellar scale level"
```

---

## Task 2: Create Nearby Stars Data

**Files:**
- Create: `src/data/NearbyStars.ts`

**Step 1: Create star interface and data file**

```typescript
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
  { name: 'Proxima Centauri', position: [-1.55, -1.18, -3.77], distance: 4.24, spectralType: 'M5.5V', apparentMagnitude: 11.13, notable: true },
  { name: 'Alpha Centauri A', position: [-1.64, -1.36, -3.83], distance: 4.37, spectralType: 'G2V', apparentMagnitude: -0.01, notable: true },
  { name: 'Alpha Centauri B', position: [-1.64, -1.36, -3.83], distance: 4.37, spectralType: 'K1V', apparentMagnitude: 1.33, notable: false },

  // Barnard's Star
  { name: "Barnard's Star", position: [0.01, 1.45, -5.75], distance: 5.96, spectralType: 'M4V', apparentMagnitude: 9.54, notable: true },

  // Wolf 359
  { name: 'Wolf 359', position: [-2.39, -6.90, 2.46], distance: 7.86, spectralType: 'M6.5V', apparentMagnitude: 13.54, notable: true },

  // Lalande 21185
  { name: 'Lalande 21185', position: [-3.46, 0.56, -7.62], distance: 8.31, spectralType: 'M2V', apparentMagnitude: 7.52, notable: true },

  // Sirius system
  { name: 'Sirius', position: [-1.61, 8.08, -2.47], distance: 8.60, spectralType: 'A1V', apparentMagnitude: -1.46, notable: true },
  { name: 'Sirius B', position: [-1.61, 8.08, -2.47], distance: 8.60, spectralType: 'DA2', apparentMagnitude: 8.44, notable: false },

  // Luyten 726-8 system (UV Ceti)
  { name: 'Luyten 726-8 A', position: [2.05, -8.32, -0.73], distance: 8.73, spectralType: 'M5.5V', apparentMagnitude: 12.54, notable: false },
  { name: 'UV Ceti', position: [2.05, -8.32, -0.73], distance: 8.73, spectralType: 'M6V', apparentMagnitude: 12.95, notable: true },

  // Ross 154
  { name: 'Ross 154', position: [1.91, -8.85, -3.91], distance: 9.69, spectralType: 'M3.5V', apparentMagnitude: 10.44, notable: true },

  // Ross 248
  { name: 'Ross 248', position: [7.38, -0.58, -7.18], distance: 10.30, spectralType: 'M5.5V', apparentMagnitude: 12.29, notable: true },

  // Epsilon Eridani
  { name: 'Epsilon Eridani', position: [6.21, 8.32, -1.73], distance: 10.50, spectralType: 'K2V', apparentMagnitude: 3.73, notable: true },

  // Lacaille 9352
  { name: 'Lacaille 9352', position: [8.47, -2.00, -6.29], distance: 10.74, spectralType: 'M1.5V', apparentMagnitude: 7.34, notable: true },

  // Ross 128
  { name: 'Ross 128', position: [10.89, 0.58, -0.15], distance: 11.01, spectralType: 'M4V', apparentMagnitude: 11.13, notable: true },

  // EZ Aquarii system
  { name: 'EZ Aquarii', position: [10.19, -3.81, -3.46], distance: 11.27, spectralType: 'M5V', apparentMagnitude: 13.33, notable: false },

  // Procyon system
  { name: 'Procyon', position: [-4.77, 10.31, 1.04], distance: 11.46, spectralType: 'F5IV', apparentMagnitude: 0.34, notable: true },

  // 61 Cygni system
  { name: '61 Cygni A', position: [6.45, -6.10, 7.13], distance: 11.41, spectralType: 'K5V', apparentMagnitude: 5.21, notable: true },
  { name: '61 Cygni B', position: [6.45, -6.10, 7.13], distance: 11.41, spectralType: 'K7V', apparentMagnitude: 6.03, notable: false },

  // Struve 2398 system
  { name: 'Struve 2398 A', position: [2.01, -2.89, 11.26], distance: 11.64, spectralType: 'M3V', apparentMagnitude: 8.94, notable: false },

  // Groombridge 34 system
  { name: 'Groombridge 34 A', position: [0.29, 2.89, 11.62], distance: 11.62, spectralType: 'M1.5V', apparentMagnitude: 8.08, notable: true },

  // Epsilon Indi
  { name: 'Epsilon Indi', position: [5.66, -3.86, -9.89], distance: 11.87, spectralType: 'K5V', apparentMagnitude: 4.69, notable: true },

  // DX Cancri
  { name: 'DX Cancri', position: [-6.92, 8.75, 4.76], distance: 11.84, spectralType: 'M6.5V', apparentMagnitude: 14.78, notable: false },

  // Tau Ceti
  { name: 'Tau Ceti', position: [10.27, 5.04, -3.26], distance: 11.91, spectralType: 'G8.5V', apparentMagnitude: 3.50, notable: true },

  // GJ 1061
  { name: 'GJ 1061', position: [-5.09, -10.48, 3.04], distance: 12.03, spectralType: 'M5.5V', apparentMagnitude: 13.03, notable: false },

  // YZ Ceti
  { name: 'YZ Ceti', position: [11.67, -3.01, 1.43], distance: 12.13, spectralType: 'M4.5V', apparentMagnitude: 12.02, notable: false },

  // Luyten's Star
  { name: "Luyten's Star", position: [-4.59, 11.43, -2.00], distance: 12.37, spectralType: 'M3.5V', apparentMagnitude: 9.86, notable: true },

  // Teegarden's Star
  { name: "Teegarden's Star", position: [10.30, 6.93, -3.19], distance: 12.50, spectralType: 'M7V', apparentMagnitude: 15.14, notable: true },

  // Kapteyn's Star
  { name: "Kapteyn's Star", position: [1.89, -10.77, -5.95], distance: 12.78, spectralType: 'M1V', apparentMagnitude: 8.85, notable: true },

  // Lacaille 8760
  { name: 'Lacaille 8760', position: [4.35, -0.84, -12.05], distance: 12.87, spectralType: 'M0V', apparentMagnitude: 6.67, notable: false },

  // Kruger 60 system
  { name: 'Kruger 60 A', position: [6.47, 2.67, 11.11], distance: 13.15, spectralType: 'M3V', apparentMagnitude: 9.79, notable: false },

  // Ross 614 system
  { name: 'Ross 614 A', position: [-1.70, 13.29, 0.65], distance: 13.34, spectralType: 'M4.5V', apparentMagnitude: 11.15, notable: false },

  // Wolf 1061
  { name: 'Wolf 1061', position: [5.16, -12.35, -1.58], distance: 13.82, spectralType: 'M3V', apparentMagnitude: 10.07, notable: true },

  // Van Maanen's Star
  { name: "Van Maanen's Star", position: [13.69, 2.98, 1.33], distance: 14.07, spectralType: 'DZ7', apparentMagnitude: 12.38, notable: true },

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
  { name: 'GJ 876', position: [14.00, -4.77, 3.55], distance: 15.24, spectralType: 'M4V', apparentMagnitude: 10.17, notable: true },

  // GJ 832
  { name: 'GJ 832', position: [0.16, -5.08, -15.10], distance: 16.16, spectralType: 'M1.5V', apparentMagnitude: 8.66, notable: false },

  // GJ 682
  { name: 'GJ 682', position: [-4.55, -12.26, 8.62], distance: 16.33, spectralType: 'M3.5V', apparentMagnitude: 10.95, notable: false },

  // Omicron 2 Eridani (40 Eridani) system
  { name: '40 Eridani A', position: [7.17, 14.49, -0.63], distance: 16.34, spectralType: 'K0.5V', apparentMagnitude: 4.43, notable: true },

  // 70 Ophiuchi system
  { name: '70 Ophiuchi A', position: [0.41, -2.53, 16.59], distance: 16.58, spectralType: 'K0V', apparentMagnitude: 4.03, notable: true },

  // Altair
  { name: 'Altair', position: [7.68, -14.61, 2.39], distance: 16.73, spectralType: 'A7V', apparentMagnitude: 0.76, notable: true },

  // GJ 581
  { name: 'GJ 581', position: [-17.91, 6.26, -6.89], distance: 20.56, spectralType: 'M3V', apparentMagnitude: 10.56, notable: true },

  // Sigma Draconis
  { name: 'Sigma Draconis', position: [3.08, 7.48, 17.31], distance: 18.77, spectralType: 'G9V', apparentMagnitude: 4.67, notable: true },

  // 36 Ophiuchi system
  { name: '36 Ophiuchi A', position: [-6.21, -8.00, 16.03], distance: 19.50, spectralType: 'K1V', apparentMagnitude: 5.07, notable: false },

  // Delta Pavonis
  { name: 'Delta Pavonis', position: [4.27, -3.93, -18.97], distance: 19.92, spectralType: 'G8IV', apparentMagnitude: 3.56, notable: true },

  // 82 Eridani
  { name: '82 Eridani', position: [9.21, 11.46, -13.29], distance: 19.71, spectralType: 'G8V', apparentMagnitude: 4.27, notable: true },
];

// Count for info card
export const STAR_COUNT = NEARBY_STARS.length;
export const RADIUS_LY = 20;
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: No errors

**Step 3: Commit**

```bash
git add src/data/NearbyStars.ts
git commit -m "feat: add nearby stars catalog data"
```

---

## Task 3: Create Stars Renderer

**Files:**
- Create: `src/objects/Stars.ts`

**Step 1: Create Stars class with point sprite shader**

```typescript
// src/objects/Stars.ts
import * as THREE from 'three';
import { NEARBY_STARS, getStarColor, type Star } from '../data/NearbyStars';

const LIGHT_YEAR_TO_METERS = 9.461e15;

/**
 * Renders nearby stars as glowing point sprites
 */
export class Stars {
  readonly mesh: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private stars: Star[];

  // Scale factor to compress light years into viewable space
  // Using sqrt scaling similar to orrery mode
  private static readonly SCALE_FACTOR = 1e11; // Compression factor

  constructor() {
    this.stars = NEARBY_STARS;
    this.geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(this.stars.length * 3);
    const colors = new Float32Array(this.stars.length * 3);
    const sizes = new Float32Array(this.stars.length);

    this.stars.forEach((star, i) => {
      // Convert light years to scaled meters with sqrt compression
      const [x, y, z] = star.position;
      const dist = Math.sqrt(x * x + y * y + z * z) || 0.001;
      const scaledDist = Math.sqrt(dist) * Stars.SCALE_FACTOR;
      const scale = dist > 0 ? scaledDist / dist : Stars.SCALE_FACTOR;

      positions[i * 3] = x * scale * LIGHT_YEAR_TO_METERS / Stars.SCALE_FACTOR;
      positions[i * 3 + 1] = y * scale * LIGHT_YEAR_TO_METERS / Stars.SCALE_FACTOR;
      positions[i * 3 + 2] = z * scale * LIGHT_YEAR_TO_METERS / Stars.SCALE_FACTOR;

      // Color from spectral type
      const color = new THREE.Color(getStarColor(star.spectralType));
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Size based on apparent magnitude (brighter = lower magnitude = larger)
      // Sirius (-1.46) should be largest, dim stars (mag 15+) smallest
      const magRange = 17; // from -1.5 to 15.5
      const normalizedMag = (star.apparentMagnitude + 1.5) / magRange;
      const size = Math.max(0.3, 1.5 - normalizedMag * 1.2);
      sizes[i] = size;
    });

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        scale: { value: 1.0 },
        opacity: { value: 0.0 }, // Start hidden for fade-in
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float scale;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          // Size attenuation with distance
          float dist = -mvPosition.z;
          gl_PointSize = size * scale * 800.0 / dist;
          gl_PointSize = clamp(gl_PointSize, 2.0, 40.0);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        uniform float opacity;

        void main() {
          // Distance from center of point
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);

          // Soft circular glow
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          alpha = pow(alpha, 1.5); // Sharper falloff

          // Add bright core
          float core = 1.0 - smoothstep(0.0, 0.15, dist);
          vec3 finalColor = mix(vColor, vec3(1.0), core * 0.5);

          gl_FragColor = vec4(finalColor, alpha * opacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.mesh = new THREE.Points(this.geometry, this.material);
    this.mesh.visible = false;
  }

  setVisible(visible: boolean): void {
    this.mesh.visible = visible;
  }

  setOpacity(opacity: number): void {
    this.material.uniforms.opacity.value = opacity;
  }

  getStarPosition(index: number): THREE.Vector3 {
    const pos = this.geometry.attributes.position;
    return new THREE.Vector3(
      pos.getX(index),
      pos.getY(index),
      pos.getZ(index)
    );
  }

  getStars(): Star[] {
    return this.stars;
  }

  addToScene(scene: THREE.Scene): void {
    scene.add(this.mesh);
  }
}
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: No errors

**Step 3: Commit**

```bash
git add src/objects/Stars.ts
git commit -m "feat: add Stars renderer with glow shader"
```

---

## Task 4: Create Star Labels

**Files:**
- Create: `src/ui/StarLabels.ts`
- Modify: `src/styles/main.css`

**Step 1: Create StarLabels class**

```typescript
// src/ui/StarLabels.ts
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import type { Star } from '../data/NearbyStars';

/**
 * Floating labels for stars in stellar mode
 * Uses CSS2DRenderer for crisp HTML-based labels
 */
export class StarLabels {
  private renderer: CSS2DRenderer;
  private labels: Map<string, CSS2DObject> = new Map();
  private scene: THREE.Scene;
  private visible = false;

  constructor(container: HTMLElement, scene: THREE.Scene) {
    this.scene = scene;

    // Create CSS2D renderer
    this.renderer = new CSS2DRenderer();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.pointerEvents = 'none';
    container.appendChild(this.renderer.domElement);

    // Handle window resize
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  addLabel(star: Star, position: THREE.Vector3, color: string): void {
    const labelDiv = document.createElement('div');
    labelDiv.className = `star-label`;

    // Create line element with star-specific color
    const lineEl = document.createElement('span');
    lineEl.className = 'star-label-line';
    lineEl.style.background = `linear-gradient(90deg, transparent 0%, ${color} 100%)`;

    // Create name element
    const nameEl = document.createElement('span');
    nameEl.className = 'star-label-name';
    nameEl.textContent = star.name;

    // Create distance element
    const distEl = document.createElement('span');
    distEl.className = 'star-label-distance';
    distEl.textContent = star.distance > 0 ? `${star.distance.toFixed(2)} ly` : '';

    labelDiv.appendChild(lineEl);
    const textContainer = document.createElement('span');
    textContainer.className = 'star-label-text';
    textContainer.appendChild(nameEl);
    if (star.distance > 0) {
      textContainer.appendChild(distEl);
    }
    labelDiv.appendChild(textContainer);

    const label = new CSS2DObject(labelDiv);
    label.position.copy(position);
    label.visible = false;

    this.labels.set(star.name, label);
    this.scene.add(label);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.renderer.domElement.style.display = visible ? 'block' : 'none';

    if (visible) {
      // Reset animation classes
      this.labels.forEach((label) => {
        label.visible = true;
        const el = label.element as HTMLElement;
        el.classList.remove('line-visible', 'text-visible');
      });

      // Stage 1: Draw lines with stagger (after a delay for camera transition)
      let lineDelay = 500; // Start after stars fade in
      this.labels.forEach((label) => {
        const el = label.element as HTMLElement;
        setTimeout(() => {
          el.classList.add('line-visible');
        }, lineDelay);
        lineDelay += 60;
      });

      // Stage 2: Fade in text with stagger
      let textDelay = 500 + 400;
      this.labels.forEach((label) => {
        const el = label.element as HTMLElement;
        setTimeout(() => {
          el.classList.add('text-visible');
        }, textDelay);
        textDelay += 50;
      });
    } else {
      this.labels.forEach((label) => {
        label.visible = false;
        const el = label.element as HTMLElement;
        el.classList.remove('line-visible', 'text-visible');
      });
    }
  }

  render(camera: THREE.Camera): void {
    if (this.visible) {
      this.renderer.render(this.scene, camera);
    }
  }
}
```

**Step 2: Add star label styles to CSS**

Add to `src/styles/main.css` after the planet label styles:

```css
/* Star Labels (Stellar Mode) */
.star-label {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  white-space: nowrap;
  pointer-events: none;
  margin-left: 40px;
}

.star-label-line {
  width: 0;
  height: 1px;
  flex-shrink: 0;
  margin-top: 8px;
  background: rgba(255, 255, 255, 0.4);
  transition: width 0.5s ease-out;
}

.star-label.line-visible .star-label-line {
  width: 30px;
}

.star-label-text {
  display: flex;
  flex-direction: column;
  margin-left: 6px;
  opacity: 0;
  transform: translateX(-5px);
  transition: opacity 0.4s ease-out, transform 0.4s ease-out;
}

.star-label.text-visible .star-label-text {
  opacity: 1;
  transform: translateX(0);
}

.star-label-name {
  font-family: 'Playfair Display', serif;
  font-size: 11px;
  font-weight: 400;
  color: rgba(230, 237, 243, 0.9);
  letter-spacing: 0.3px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

.star-label-distance {
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
git add src/ui/StarLabels.ts src/styles/main.css
git commit -m "feat: add StarLabels with animated leader lines"
```

---

## Task 5: Extend Camera for Stellar Transitions

**Files:**
- Modify: `src/engine/Camera.ts`

**Step 1: Add stellar view transition method**

Add after `returnFromOrreryView()`:

```typescript
setStellarView(): void {
  // Start cinematic transition to stellar view
  this.transition = {
    active: true,
    startTime: performance.now(),
    duration: 4000, // 4 seconds for grand pull-back
    startLogDistance: this._logDistance,
    startPhi: this.spherical.phi,
    startTheta: this.spherical.theta,
    startCenter: this.currentCenter.clone(),
    targetLogDistance: 14.5, // Much further out to see stars
    targetPhi: Math.PI / 4, // 45 degrees - slight angle
    targetTheta: this.spherical.theta + Math.PI * 0.1,
    targetCenter: new THREE.Vector3(0, 0, 0),
  };

  this.autoRotateEnabled = false;
}

returnFromStellarView(): void {
  // Return to solar system view
  this.transition = {
    active: true,
    startTime: performance.now(),
    duration: 3000,
    startLogDistance: this._logDistance,
    startPhi: this.spherical.phi,
    startTheta: this.spherical.theta,
    startCenter: this.currentCenter.clone(),
    targetLogDistance: 11.8, // Solar system view distance
    targetPhi: Math.PI / 6, // Orrery angle
    targetTheta: this.spherical.theta - Math.PI * 0.1,
    targetCenter: new THREE.Vector3(0, 0, 0),
  };
}
```

**Step 2: Update maxZoom in constructor**

Change line ~40:

```typescript
maxZoom = 15,  // Extended for stellar view (~100+ light years)
```

**Step 3: Verify build passes**

Run: `npm run build`
Expected: No errors

**Step 4: Commit**

```bash
git add src/engine/Camera.ts
git commit -m "feat: add stellar view camera transitions"
```

---

## Task 6: Update ScaleLevelNav UI

**Files:**
- Modify: `src/ui/ScaleLevelNav.ts`

**Step 1: Read current file**

Check current implementation pattern.

**Step 2: Add Stellar level to navigation**

Update the level labels and handling to include "Stellar" above "System".

**Step 3: Verify build passes**

Run: `npm run build`
Expected: No errors

**Step 4: Commit**

```bash
git add src/ui/ScaleLevelNav.ts
git commit -m "feat: add Stellar to scale level navigation"
```

---

## Task 7: Update Title Card for Stellar Mode

**Files:**
- Modify: `index.html`
- Modify: `src/main.ts`

**Step 1: Add stellar info content to title card**

The title card should show:
```
Stellar Neighborhood
─────────────────────
RADIUS          ~20 light years
STARS           52
NEAREST         Proxima Centauri (4.24 ly)
BRIGHTEST       Sirius (8.6 ly)

Our corner of the Milky Way
```

**Step 2: Update main.ts to switch title card content based on scale level**

**Step 3: Verify build passes**

Run: `npm run build`
Expected: No errors

**Step 4: Commit**

```bash
git add index.html src/main.ts
git commit -m "feat: add stellar neighborhood title card content"
```

---

## Task 8: Integrate Stars into Main App

**Files:**
- Modify: `src/main.ts`

**Step 1: Import Stars and StarLabels**

```typescript
import { Stars } from './objects/Stars';
import { StarLabels } from './ui/StarLabels';
import { getStarColor } from './data/NearbyStars';
```

**Step 2: Create Stars and StarLabels instances**

Add after planet labels setup:

```typescript
// Stars (visible in stellar mode)
const stars = new Stars();
stars.addToScene(scene);

// Star labels
const starLabels = new StarLabels(document.body, scene);

// Add labels for notable stars
stars.getStars().forEach((star, index) => {
  if (star.notable) {
    const position = stars.getStarPosition(index);
    const color = getStarColor(star.spectralType);
    starLabels.addLabel(star, position, color);
  }
});
```

**Step 3: Handle scale level transitions for stellar mode**

Update the scale level change handler to:
- Fade out solar system when entering stellar mode
- Show stars and star labels
- Update title card
- Hide planet dock
- Reverse when leaving stellar mode

**Step 4: Update animate loop to render star labels**

Add after planet labels render:

```typescript
starLabels.render(orbitCamera.camera);
```

**Step 5: Verify build passes**

Run: `npm run build`
Expected: No errors

**Step 6: Test full flow**

1. Start at Planet level (Earth)
2. Go up to System (Solar System)
3. Go up to Stellar (stars appear with animation)
4. Go back down to System
5. Go back down to Planet

**Step 7: Commit**

```bash
git add src/main.ts
git commit -m "feat: integrate stellar neighborhood into main app"
```

---

## Task 9: Polish Transitions

**Files:**
- Modify: `src/main.ts`
- Modify: `src/styles/main.css`

**Step 1: Implement two-stage transition for System → Stellar**

- Stage 1: Fade out orbital paths, planet labels, Oort Cloud
- Stage 2: After delay, fade in stars and star labels

**Step 2: Add fade transitions to stars**

Animate opacity from 0 to 1 over ~1 second after camera arrives.

**Step 3: Test and adjust timing**

Ensure smooth, cinematic feel.

**Step 4: Commit**

```bash
git add src/main.ts src/styles/main.css
git commit -m "feat: polish stellar transition animations"
```

---

## Task 10: Final Testing & Deploy

**Step 1: Full test of all scale levels**

- Planet → System → Stellar → System → Planet
- Verify all animations trigger correctly
- Check label positioning
- Verify title card content updates

**Step 2: Build for production**

```bash
npm run build
```

**Step 3: Commit any final fixes**

**Step 4: Push and deploy**

```bash
git push origin main
npx wrangler pages deploy dist --project-name=cosmic-explorer
```

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Add Stellar scale level to state |
| 2 | Create nearby stars data catalog |
| 3 | Create Stars renderer with glow shader |
| 4 | Create StarLabels with animations |
| 5 | Extend Camera for stellar transitions |
| 6 | Update ScaleLevelNav UI |
| 7 | Update title card for stellar mode |
| 8 | Integrate stars into main app |
| 9 | Polish transition animations |
| 10 | Final testing and deploy |
