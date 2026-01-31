# Phase 1: Earth & Orbit — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an interactive 3D viewer showing Earth with real-time positions of all ~10,000 tracked satellites.

**Architecture:** WebGPU-first Three.js renderer with WebGL2 fallback. Satellite positions computed in Web Worker using SGP4, transferred to main thread each frame. IndexedDB caches TLE data for offline support.

**Tech Stack:** TypeScript, Vite, Three.js r160+, satellite.js, Vitest, Playwright

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/styles/main.css`

**Step 1: Initialize npm project**

```bash
npm init -y
```

**Step 2: Install dependencies**

```bash
npm install three satellite.js
npm install -D typescript vite @types/three vitest playwright @vitest/coverage-v8
```

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client", "@webgpu/types"]
  },
  "include": ["src"]
}
```

**Step 4: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
  },
  worker: {
    format: 'es',
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
```

**Step 5: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cosmic Explorer</title>
  <link rel="stylesheet" href="/src/styles/main.css">
</head>
<body>
  <canvas id="canvas"></canvas>
  <div id="hud"></div>
  <div id="info-card"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

**Step 6: Create src/styles/main.css with Observatory Dark theme**

```css
:root {
  --void: #05060a;
  --cosmos: #0d1117;
  --nebula: #1c1f26;
  --starlight: #e6edf3;
  --stardust: #7d8590;
  --sol: #f4a623;
  --ice: #58a6ff;
  --pulse: #f97316;
}

@font-face {
  font-family: 'JetBrains Mono';
  src: url('https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxjPVmUsaaDhw.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--void);
  font-family: 'JetBrains Mono', monospace;
  color: var(--starlight);
}

#canvas {
  width: 100%;
  height: 100%;
  display: block;
}

#hud {
  position: fixed;
  bottom: 32px;
  left: 32px;
  z-index: 10;
}

#info-card {
  position: fixed;
  top: 50%;
  right: 0;
  transform: translateY(-50%) translateX(100%);
  z-index: 20;
  transition: transform 0.3s ease-out, opacity 0.3s ease-out;
  opacity: 0;
}

#info-card.visible {
  transform: translateY(-50%) translateX(0);
  opacity: 1;
}
```

**Step 7: Create minimal src/main.ts**

```typescript
import './styles/main.css';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
console.log('Cosmic Explorer starting...', canvas);
```

**Step 8: Add scripts to package.json**

Edit `package.json` to add:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:e2e": "playwright test"
  }
}
```

**Step 9: Verify dev server starts**

```bash
npm run dev
```

Expected: Server starts at localhost:5173, page loads with black background.

**Step 10: Commit**

```bash
git add -A && git commit -m "feat: scaffold project with Vite, TypeScript, Three.js"
```

---

## Task 2: LogScale Utilities

**Files:**
- Create: `src/engine/LogScale.ts`
- Create: `src/engine/LogScale.test.ts`

**Step 1: Write failing tests for LogScale**

```typescript
// src/engine/LogScale.test.ts
import { describe, it, expect } from 'vitest';
import { LogScale } from './LogScale';

describe('LogScale', () => {
  describe('metersToLogDistance', () => {
    it('converts 1000 meters to log10(1000) = 3', () => {
      expect(LogScale.metersToLogDistance(1000)).toBeCloseTo(3, 5);
    });

    it('converts Earth radius (~6.371e6m) to ~6.8', () => {
      expect(LogScale.metersToLogDistance(6_371_000)).toBeCloseTo(6.804, 2);
    });

    it('handles very small distances with floor of 1 meter', () => {
      expect(LogScale.metersToLogDistance(0.1)).toBe(0);
    });
  });

  describe('logDistanceToMeters', () => {
    it('converts log 3 to 1000 meters', () => {
      expect(LogScale.logDistanceToMeters(3)).toBe(1000);
    });

    it('converts log 6 to 1,000,000 meters', () => {
      expect(LogScale.logDistanceToMeters(6)).toBe(1_000_000);
    });
  });

  describe('clampZoom', () => {
    it('clamps zoom within Phase 1 range (0-6)', () => {
      expect(LogScale.clampZoom(-1, 0, 6)).toBe(0);
      expect(LogScale.clampZoom(7, 0, 6)).toBe(6);
      expect(LogScale.clampZoom(3, 0, 6)).toBe(3);
    });
  });

  describe('formatDistance', () => {
    it('formats meters for small distances', () => {
      expect(LogScale.formatDistance(500)).toBe('500 m');
    });

    it('formats kilometers for medium distances', () => {
      expect(LogScale.formatDistance(42_000)).toBe('42 km');
    });

    it('formats with decimal for km', () => {
      expect(LogScale.formatDistance(1_500)).toBe('1.5 km');
    });
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- --run src/engine/LogScale.test.ts
```

Expected: FAIL - module not found

**Step 3: Implement LogScale**

```typescript
// src/engine/LogScale.ts
export const LogScale = {
  metersToLogDistance(meters: number): number {
    return Math.log10(Math.max(1, meters));
  },

  logDistanceToMeters(logDistance: number): number {
    return Math.pow(10, logDistance);
  },

  clampZoom(zoom: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, zoom));
  },

  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    const km = meters / 1000;
    if (km < 10) {
      return `${km.toFixed(1)} km`;
    }
    return `${Math.round(km)} km`;
  },
} as const;
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- --run src/engine/LogScale.test.ts
```

Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/engine && git commit -m "feat(engine): add LogScale utilities with tests"
```

---

## Task 3: Renderer Abstraction

**Files:**
- Create: `src/engine/Renderer.ts`

**Step 1: Create Renderer with WebGPU detection and fallback**

```typescript
// src/engine/Renderer.ts
import * as THREE from 'three';

export interface RendererConfig {
  canvas: HTMLCanvasElement;
  antialias?: boolean;
}

export interface RendererCapabilities {
  isWebGPU: boolean;
  maxSatellites: number;
}

export class Renderer {
  private renderer: THREE.WebGLRenderer;
  private _capabilities: RendererCapabilities;

  constructor(private config: RendererConfig) {
    // For now, use WebGL2 - WebGPU support in Three.js requires async init
    // We'll upgrade to WebGPU in a later task
    this.renderer = new THREE.WebGLRenderer({
      canvas: config.canvas,
      antialias: config.antialias ?? true,
      alpha: false,
    });

    this._capabilities = {
      isWebGPU: false,
      maxSatellites: 5000,
    };

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.resize();
  }

  get capabilities(): RendererCapabilities {
    return this._capabilities;
  }

  get domElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height);
  }

  render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.renderer.render(scene, camera);
  }

  dispose(): void {
    this.renderer.dispose();
  }
}
```

**Step 2: Update main.ts to test renderer**

```typescript
// src/main.ts
import './styles/main.css';
import * as THREE from 'three';
import { Renderer } from './engine/Renderer';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const renderer = new Renderer({ canvas });

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a); // --void

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1e12
);
camera.position.z = 2e7; // 20,000 km

// Test sphere
const geometry = new THREE.SphereGeometry(6_371_000, 32, 32);
const material = new THREE.MeshBasicMaterial({ color: 0x58a6ff, wireframe: true });
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

function animate() {
  requestAnimationFrame(animate);
  sphere.rotation.y += 0.001;
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.resize();
});

animate();
console.log('Renderer capabilities:', renderer.capabilities);
```

**Step 3: Verify it runs**

```bash
npm run dev
```

Expected: Blue wireframe sphere rotating on black background.

**Step 4: Commit**

```bash
git add src/engine/Renderer.ts src/main.ts && git commit -m "feat(engine): add Renderer with WebGL2 support"
```

---

## Task 4: Orbital Camera

**Files:**
- Create: `src/engine/Camera.ts`

**Step 1: Create orbital camera with log-scale zoom**

```typescript
// src/engine/Camera.ts
import * as THREE from 'three';
import { LogScale } from './LogScale';

export interface CameraConfig {
  fov?: number;
  near?: number;
  far?: number;
  minZoom?: number;
  maxZoom?: number;
  initialZoom?: number;
  damping?: number;
}

export class Camera {
  readonly camera: THREE.PerspectiveCamera;

  private _logDistance: number;
  private targetLogDistance: number;
  private spherical = new THREE.Spherical();
  private targetSpherical = new THREE.Spherical();

  private readonly minZoom: number;
  private readonly maxZoom: number;
  private readonly damping: number;

  constructor(config: CameraConfig = {}) {
    const {
      fov = 60,
      near = 1,
      far = 1e15,
      minZoom = 6.5, // ~3000km - just above Earth surface
      maxZoom = 9,   // ~1M km - edge of Phase 1
      initialZoom = 7.5, // ~30,000 km
      damping = 0.1,
    } = config;

    this.camera = new THREE.PerspectiveCamera(fov, 1, near, far);
    this.minZoom = minZoom;
    this.maxZoom = maxZoom;
    this.damping = damping;

    this._logDistance = initialZoom;
    this.targetLogDistance = initialZoom;

    // Start looking at Earth from above equator
    this.spherical.set(
      LogScale.logDistanceToMeters(initialZoom),
      Math.PI / 3, // theta (polar angle from top)
      0            // phi (azimuth)
    );
    this.targetSpherical.copy(this.spherical);

    this.updateCameraPosition();
  }

  get logDistance(): number {
    return this._logDistance;
  }

  get distanceMeters(): number {
    return LogScale.logDistanceToMeters(this._logDistance);
  }

  zoom(delta: number): void {
    this.targetLogDistance = LogScale.clampZoom(
      this.targetLogDistance + delta,
      this.minZoom,
      this.maxZoom
    );
  }

  rotate(deltaTheta: number, deltaPhi: number): void {
    this.targetSpherical.theta = Math.max(
      0.1,
      Math.min(Math.PI - 0.1, this.targetSpherical.theta + deltaTheta)
    );
    this.targetSpherical.phi += deltaPhi;
  }

  update(): void {
    // Smooth interpolation
    this._logDistance += (this.targetLogDistance - this._logDistance) * this.damping;
    this.spherical.theta += (this.targetSpherical.theta - this.spherical.theta) * this.damping;
    this.spherical.phi += (this.targetSpherical.phi - this.spherical.phi) * this.damping;
    this.spherical.radius = LogScale.logDistanceToMeters(this._logDistance);

    this.updateCameraPosition();
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  private updateCameraPosition(): void {
    const position = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(position);
    this.camera.lookAt(0, 0, 0);
  }
}
```

**Step 2: Update main.ts to use Camera**

```typescript
// src/main.ts
import './styles/main.css';
import * as THREE from 'three';
import { Renderer } from './engine/Renderer';
import { Camera } from './engine/Camera';
import { LogScale } from './engine/LogScale';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const renderer = new Renderer({ canvas });
const orbitCamera = new Camera();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

// Earth placeholder
const geometry = new THREE.SphereGeometry(6_371_000, 64, 64);
const material = new THREE.MeshBasicMaterial({ color: 0x58a6ff, wireframe: true });
const earth = new THREE.Mesh(geometry, material);
scene.add(earth);

// Input handling
let isDragging = false;
let lastMouse = { x: 0, y: 0 };

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.1 : -0.1;
  orbitCamera.zoom(delta);
}, { passive: false });

canvas.addEventListener('mousedown', (e) => {
  isDragging = true;
  lastMouse = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const deltaX = e.clientX - lastMouse.x;
  const deltaY = e.clientY - lastMouse.y;
  orbitCamera.rotate(deltaY * 0.005, -deltaX * 0.005);
  lastMouse = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('mouseup', () => { isDragging = false; });
canvas.addEventListener('mouseleave', () => { isDragging = false; });

// HUD
const hud = document.getElementById('hud')!;
function updateHUD() {
  const altitude = orbitCamera.distanceMeters - 6_371_000;
  hud.innerHTML = `
    <div style="color: var(--stardust); font-size: 14px;">
      <div>Altitude: ${LogScale.formatDistance(Math.max(0, altitude))}</div>
      <div style="opacity: 0.6; font-size: 12px;">Scroll to zoom • Drag to rotate</div>
    </div>
  `;
}

function animate() {
  requestAnimationFrame(animate);
  orbitCamera.update();
  earth.rotation.y += 0.0005;
  renderer.render(scene, orbitCamera.camera);
  updateHUD();
}

window.addEventListener('resize', () => {
  orbitCamera.setAspect(window.innerWidth / window.innerHeight);
  renderer.resize();
});

orbitCamera.setAspect(window.innerWidth / window.innerHeight);
animate();
```

**Step 3: Test interactions**

```bash
npm run dev
```

Expected: Scroll zooms in/out smoothly, drag rotates around Earth.

**Step 4: Commit**

```bash
git add src/engine/Camera.ts src/main.ts && git commit -m "feat(engine): add orbital Camera with log-scale zoom"
```

---

## Task 5: Earth with Textures

**Files:**
- Create: `src/objects/Earth.ts`
- Create: `public/textures/.gitkeep`

**Step 1: Create Earth object with shader material**

```typescript
// src/objects/Earth.ts
import * as THREE from 'three';

export interface EarthConfig {
  radius?: number;
  segments?: number;
}

export class Earth {
  readonly mesh: THREE.Mesh;
  readonly atmosphere: THREE.Mesh;
  private dayTexture: THREE.Texture | null = null;
  private nightTexture: THREE.Texture | null = null;
  private cloudsTexture: THREE.Texture | null = null;
  private material: THREE.ShaderMaterial;

  private static vertexShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  private static fragmentShader = `
    uniform sampler2D dayMap;
    uniform sampler2D nightMap;
    uniform sampler2D cloudsMap;
    uniform vec3 sunDirection;
    uniform float cloudsOpacity;
    uniform bool hasDay;
    uniform bool hasNight;
    uniform bool hasClouds;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vec3 normal = normalize(vNormal);
      float sunDot = dot(normal, sunDirection);
      float dayFactor = smoothstep(-0.1, 0.2, sunDot);

      vec3 dayColor = hasDay ? texture2D(dayMap, vUv).rgb : vec3(0.1, 0.3, 0.6);
      vec3 nightColor = hasNight ? texture2D(nightMap, vUv).rgb * 1.5 : vec3(0.02, 0.02, 0.05);

      vec3 color = mix(nightColor, dayColor, dayFactor);

      if (hasClouds) {
        float clouds = texture2D(cloudsMap, vUv).r;
        color = mix(color, vec3(1.0), clouds * cloudsOpacity * dayFactor);
      }

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  private static atmosphereVertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  private static atmosphereFragmentShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vec3 viewDir = normalize(-vPosition);
      float fresnel = 1.0 - dot(viewDir, vNormal);
      fresnel = pow(fresnel, 3.0);

      vec3 atmosphereColor = vec3(0.3, 0.6, 1.0);
      gl_FragColor = vec4(atmosphereColor, fresnel * 0.6);
    }
  `;

  constructor(config: EarthConfig = {}) {
    const { radius = 6_371_000, segments = 128 } = config;

    // Earth sphere
    const geometry = new THREE.SphereGeometry(radius, segments, segments);

    this.material = new THREE.ShaderMaterial({
      vertexShader: Earth.vertexShader,
      fragmentShader: Earth.fragmentShader,
      uniforms: {
        dayMap: { value: null },
        nightMap: { value: null },
        cloudsMap: { value: null },
        sunDirection: { value: new THREE.Vector3(1, 0, 0) },
        cloudsOpacity: { value: 0.4 },
        hasDay: { value: false },
        hasNight: { value: false },
        hasClouds: { value: false },
      },
    });

    this.mesh = new THREE.Mesh(geometry, this.material);

    // Atmosphere
    const atmosphereGeometry = new THREE.SphereGeometry(radius * 1.015, 64, 64);
    const atmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: Earth.atmosphereVertexShader,
      fragmentShader: Earth.atmosphereFragmentShader,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    this.atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);

    this.loadTextures();
  }

  private async loadTextures(): Promise<void> {
    const loader = new THREE.TextureLoader();

    // Use placeholder colors initially, load real textures when available
    // For now, we'll use procedural colors defined in the shader
    // Real NASA textures would be loaded like:
    // this.dayTexture = await loader.loadAsync('/textures/earth_day_2k.jpg');

    try {
      this.dayTexture = await loader.loadAsync('/textures/earth_day_2k.jpg');
      this.material.uniforms.dayMap.value = this.dayTexture;
      this.material.uniforms.hasDay.value = true;
    } catch {
      console.log('Day texture not found, using procedural color');
    }

    try {
      this.nightTexture = await loader.loadAsync('/textures/earth_night_2k.jpg');
      this.material.uniforms.nightMap.value = this.nightTexture;
      this.material.uniforms.hasNight.value = true;
    } catch {
      console.log('Night texture not found, using procedural color');
    }

    try {
      this.cloudsTexture = await loader.loadAsync('/textures/earth_clouds_2k.jpg');
      this.material.uniforms.cloudsMap.value = this.cloudsTexture;
      this.material.uniforms.hasClouds.value = true;
    } catch {
      console.log('Clouds texture not found, skipping');
    }
  }

  update(time: number): void {
    // Rotate Earth (one rotation per 24 hours, sped up for demo)
    this.mesh.rotation.y = time * 0.00001;
    this.atmosphere.rotation.y = this.mesh.rotation.y;

    // Update sun direction based on time
    const sunAngle = time * 0.0001;
    this.material.uniforms.sunDirection.value.set(
      Math.cos(sunAngle),
      0.2,
      Math.sin(sunAngle)
    ).normalize();
  }

  addToScene(scene: THREE.Scene): void {
    scene.add(this.mesh);
    scene.add(this.atmosphere);
  }
}
```

**Step 2: Create textures directory**

```bash
mkdir -p public/textures && touch public/textures/.gitkeep
```

**Step 3: Update main.ts to use Earth**

```typescript
// src/main.ts
import './styles/main.css';
import * as THREE from 'three';
import { Renderer } from './engine/Renderer';
import { Camera } from './engine/Camera';
import { LogScale } from './engine/LogScale';
import { Earth } from './objects/Earth';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const renderer = new Renderer({ canvas });
const orbitCamera = new Camera();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

// Add ambient light
const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);

// Earth
const earth = new Earth();
earth.addToScene(scene);

// Input handling
let isDragging = false;
let lastMouse = { x: 0, y: 0 };

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.1 : -0.1;
  orbitCamera.zoom(delta);
}, { passive: false });

canvas.addEventListener('mousedown', (e) => {
  isDragging = true;
  lastMouse = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const deltaX = e.clientX - lastMouse.x;
  const deltaY = e.clientY - lastMouse.y;
  orbitCamera.rotate(deltaY * 0.005, -deltaX * 0.005);
  lastMouse = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('mouseup', () => { isDragging = false; });
canvas.addEventListener('mouseleave', () => { isDragging = false; });

// HUD
const hud = document.getElementById('hud')!;
function updateHUD() {
  const altitude = orbitCamera.distanceMeters - 6_371_000;
  hud.innerHTML = `
    <div style="color: var(--stardust); font-size: 14px;">
      <div>Altitude: ${LogScale.formatDistance(Math.max(0, altitude))}</div>
      <div style="opacity: 0.6; font-size: 12px; margin-top: 4px;">Scroll to zoom • Drag to rotate</div>
    </div>
  `;
}

let startTime = performance.now();

function animate() {
  requestAnimationFrame(animate);
  const time = performance.now() - startTime;

  orbitCamera.update();
  earth.update(time);
  renderer.render(scene, orbitCamera.camera);
  updateHUD();
}

window.addEventListener('resize', () => {
  orbitCamera.setAspect(window.innerWidth / window.innerHeight);
  renderer.resize();
});

orbitCamera.setAspect(window.innerWidth / window.innerHeight);
animate();
```

**Step 4: Test Earth renders**

```bash
npm run dev
```

Expected: Blue Earth with atmosphere glow, day/night terminator moving.

**Step 5: Commit**

```bash
git add src/objects public/textures && git commit -m "feat(objects): add Earth with atmosphere shader"
```

---

## Task 6: TLE Parser

**Files:**
- Create: `src/data/celestrak.ts`
- Create: `src/data/celestrak.test.ts`
- Create: `src/data/types.ts`

**Step 1: Create types**

```typescript
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
```

**Step 2: Write failing tests**

```typescript
// src/data/celestrak.test.ts
import { describe, it, expect } from 'vitest';
import { parseTLE, categorizeSatellite } from './celestrak';

const SAMPLE_TLE = `ISS (ZARYA)
1 25544U 98067A   24031.50000000  .00016717  00000-0  10270-3 0  9025
2 25544  51.6400 208.9163 0006703  35.0282 325.1202 15.49571570479473`;

const STARLINK_TLE = `STARLINK-1007
1 44713U 19074A   24031.50000000  .00001234  00000-0  12345-4 0  9999
2 44713  53.0000 123.4567 0001234  90.0000 270.0000 15.00000000 12345`;

describe('parseTLE', () => {
  it('parses a valid 3-line TLE', () => {
    const tles = parseTLE(SAMPLE_TLE);
    expect(tles).toHaveLength(1);
    expect(tles[0].name).toBe('ISS (ZARYA)');
    expect(tles[0].line1).toContain('25544U');
    expect(tles[0].line2).toContain('51.6400');
    expect(tles[0].catalogNumber).toBe(25544);
  });

  it('parses multiple TLEs', () => {
    const tles = parseTLE(SAMPLE_TLE + '\n' + STARLINK_TLE);
    expect(tles).toHaveLength(2);
    expect(tles[0].name).toBe('ISS (ZARYA)');
    expect(tles[1].name).toBe('STARLINK-1007');
  });

  it('handles empty input', () => {
    expect(parseTLE('')).toEqual([]);
  });
});

describe('categorizeSatellite', () => {
  it('identifies space stations', () => {
    expect(categorizeSatellite('ISS (ZARYA)')).toBe('station');
    expect(categorizeSatellite('TIANGONG')).toBe('station');
  });

  it('identifies Starlink as communication', () => {
    expect(categorizeSatellite('STARLINK-1007')).toBe('communication');
  });

  it('identifies GPS as navigation', () => {
    expect(categorizeSatellite('GPS BIIR-2')).toBe('navigation');
    expect(categorizeSatellite('NAVSTAR 43')).toBe('navigation');
  });

  it('defaults to other', () => {
    expect(categorizeSatellite('RANDOM SAT')).toBe('other');
  });
});
```

**Step 3: Run tests to verify they fail**

```bash
npm test -- --run src/data/celestrak.test.ts
```

Expected: FAIL - module not found

**Step 4: Implement celestrak.ts**

```typescript
// src/data/celestrak.ts
import type { TLE, SatelliteCategory } from './types';

export function parseTLE(text: string): TLE[] {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(l => l);
  const tles: TLE[] = [];

  for (let i = 0; i < lines.length; i += 3) {
    if (i + 2 >= lines.length) break;

    const name = lines[i];
    const line1 = lines[i + 1];
    const line2 = lines[i + 2];

    // Validate TLE format
    if (!line1.startsWith('1 ') || !line2.startsWith('2 ')) {
      continue;
    }

    const catalogNumber = parseInt(line1.substring(2, 7), 10);

    tles.push({
      name,
      line1,
      line2,
      catalogNumber,
      category: categorizeSatellite(name),
    });
  }

  return tles;
}

export function categorizeSatellite(name: string): SatelliteCategory {
  const upper = name.toUpperCase();

  if (upper.includes('ISS') || upper.includes('ZARYA') || upper.includes('TIANGONG')) {
    return 'station';
  }
  if (upper.includes('STARLINK') || upper.includes('ONEWEB') || upper.includes('IRIDIUM')) {
    return 'communication';
  }
  if (upper.includes('GPS') || upper.includes('NAVSTAR') || upper.includes('GLONASS') || upper.includes('GALILEO')) {
    return 'navigation';
  }
  if (upper.includes('HUBBLE') || upper.includes('JWST') || upper.includes('GOES') || upper.includes('NOAA')) {
    return 'science';
  }
  return 'other';
}

const CELESTRAK_BASE = 'https://celestrak.org/NORAD/elements/gp.php';

export async function fetchTLEs(category: string): Promise<TLE[]> {
  const url = `${CELESTRAK_BASE}?GROUP=${category}&FORMAT=TLE`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const text = await response.text();
    return parseTLE(text);
  } catch (error) {
    console.error(`Failed to fetch ${category}:`, error);
    return [];
  }
}

export async function fetchAllTLEs(): Promise<TLE[]> {
  const categories = ['stations', 'active', 'starlink', 'gps-ops', 'science'];

  const results = await Promise.all(
    categories.map(cat => fetchTLEs(cat))
  );

  // Deduplicate by catalog number
  const seen = new Set<number>();
  const all: TLE[] = [];

  for (const tles of results) {
    for (const tle of tles) {
      if (!seen.has(tle.catalogNumber)) {
        seen.add(tle.catalogNumber);
        all.push(tle);
      }
    }
  }

  return all;
}
```

**Step 5: Run tests to verify they pass**

```bash
npm test -- --run src/data/celestrak.test.ts
```

Expected: All tests PASS

**Step 6: Commit**

```bash
git add src/data && git commit -m "feat(data): add TLE parser and CelesTrak client"
```

---

## Task 7: IndexedDB Cache

**Files:**
- Create: `src/data/cache.ts`
- Create: `src/data/cache.test.ts`

**Step 1: Write failing tests**

```typescript
// src/data/cache.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { TLECache } from './cache';
import type { TLE } from './types';

// Mock IndexedDB for tests
import 'fake-indexeddb/auto';

const mockTLEs: TLE[] = [
  {
    name: 'ISS',
    line1: '1 25544U ...',
    line2: '2 25544 ...',
    catalogNumber: 25544,
    category: 'station',
  },
];

describe('TLECache', () => {
  let cache: TLECache;

  beforeEach(async () => {
    cache = new TLECache();
    await cache.clear();
  });

  it('stores and retrieves TLEs', async () => {
    await cache.store(mockTLEs);
    const retrieved = await cache.getAll();
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].name).toBe('ISS');
  });

  it('returns empty array when cache is empty', async () => {
    const retrieved = await cache.getAll();
    expect(retrieved).toEqual([]);
  });

  it('tracks timestamp', async () => {
    await cache.store(mockTLEs);
    const timestamp = await cache.getTimestamp();
    expect(timestamp).toBeGreaterThan(0);
    expect(Date.now() - timestamp!).toBeLessThan(1000);
  });

  it('reports staleness correctly', async () => {
    await cache.store(mockTLEs);
    expect(await cache.isStale(24 * 60 * 60 * 1000)).toBe(false);
    expect(await cache.isStale(0)).toBe(true);
  });
});
```

**Step 2: Install fake-indexeddb for tests**

```bash
npm install -D fake-indexeddb
```

**Step 3: Run tests to verify they fail**

```bash
npm test -- --run src/data/cache.test.ts
```

Expected: FAIL - module not found

**Step 4: Implement cache.ts**

```typescript
// src/data/cache.ts
import type { TLE } from './types';

const DB_NAME = 'cosmic-explorer';
const DB_VERSION = 1;
const STORE_NAME = 'tles';
const META_STORE = 'meta';

export class TLECache {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = this.openDB();
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'catalogNumber' });
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: 'key' });
        }
      };
    });
  }

  async store(tles: TLE[]): Promise<void> {
    const db = await this.dbPromise;

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME, META_STORE], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const metaStore = tx.objectStore(META_STORE);

      // Clear existing and add new
      store.clear();
      for (const tle of tles) {
        store.put(tle);
      }

      // Update timestamp
      metaStore.put({ key: 'timestamp', value: Date.now() });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getAll(): Promise<TLE[]> {
    const db = await this.dbPromise;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getTimestamp(): Promise<number | null> {
    const db = await this.dbPromise;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readonly');
      const store = tx.objectStore(META_STORE);
      const request = store.get('timestamp');

      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(request.error);
    });
  }

  async isStale(maxAgeMs: number): Promise<boolean> {
    const timestamp = await this.getTimestamp();
    if (!timestamp) return true;
    return Date.now() - timestamp > maxAgeMs;
  }

  async clear(): Promise<void> {
    const db = await this.dbPromise;

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME, META_STORE], 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.objectStore(META_STORE).clear();

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
```

**Step 5: Run tests to verify they pass**

```bash
npm test -- --run src/data/cache.test.ts
```

Expected: All tests PASS

**Step 6: Commit**

```bash
git add src/data/cache.ts src/data/cache.test.ts package.json package-lock.json && git commit -m "feat(data): add IndexedDB cache for TLEs"
```

---

## Task 8: SGP4 Web Worker

**Files:**
- Create: `src/data/worker.ts`
- Create: `src/data/SatelliteWorker.ts`

**Step 1: Create the Web Worker**

```typescript
// src/data/worker.ts
import * as satellite from 'satellite.js';
import type { TLE } from './types';

interface WorkerMessage {
  type: 'init' | 'propagate';
  tles?: TLE[];
  time?: number;
}

interface WorkerResponse {
  type: 'ready' | 'positions';
  positions?: Float32Array;
  count?: number;
}

let satRecs: satellite.SatRec[] = [];
let tleData: TLE[] = [];

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type } = event.data;

  if (type === 'init' && event.data.tles) {
    tleData = event.data.tles;
    satRecs = tleData.map(tle => {
      try {
        return satellite.twoline2satrec(tle.line1, tle.line2);
      } catch {
        return null;
      }
    }).filter((s): s is satellite.SatRec => s !== null);

    const response: WorkerResponse = { type: 'ready', count: satRecs.length };
    self.postMessage(response);
  }

  if (type === 'propagate' && event.data.time !== undefined) {
    const date = new Date(event.data.time);
    const positions = new Float32Array(satRecs.length * 6); // x,y,z,vx,vy,vz

    for (let i = 0; i < satRecs.length; i++) {
      try {
        const posVel = satellite.propagate(satRecs[i], date);

        if (posVel.position && typeof posVel.position !== 'boolean') {
          const pos = posVel.position as satellite.EciVec3<number>;
          const vel = posVel.velocity as satellite.EciVec3<number>;

          // Convert from km to meters
          positions[i * 6 + 0] = pos.x * 1000;
          positions[i * 6 + 1] = pos.y * 1000;
          positions[i * 6 + 2] = pos.z * 1000;
          positions[i * 6 + 3] = vel.x * 1000;
          positions[i * 6 + 4] = vel.y * 1000;
          positions[i * 6 + 5] = vel.z * 1000;
        }
      } catch {
        // Leave as zeros
      }
    }

    const response: WorkerResponse = { type: 'positions', positions };
    self.postMessage(response, [positions.buffer]);
  }
};
```

**Step 2: Create worker wrapper class**

```typescript
// src/data/SatelliteWorker.ts
import type { TLE } from './types';

export class SatelliteWorker {
  private worker: Worker;
  private positionsCallback: ((positions: Float32Array) => void) | null = null;
  private readyPromise: Promise<number>;
  private resolveReady!: (count: number) => void;

  constructor() {
    this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

    this.readyPromise = new Promise(resolve => {
      this.resolveReady = resolve;
    });

    this.worker.onmessage = (event) => {
      const { type } = event.data;

      if (type === 'ready') {
        this.resolveReady(event.data.count);
      }

      if (type === 'positions' && this.positionsCallback) {
        this.positionsCallback(event.data.positions);
      }
    };
  }

  async init(tles: TLE[]): Promise<number> {
    this.worker.postMessage({ type: 'init', tles });
    return this.readyPromise;
  }

  requestPositions(time: number): void {
    this.worker.postMessage({ type: 'propagate', time });
  }

  onPositions(callback: (positions: Float32Array) => void): void {
    this.positionsCallback = callback;
  }

  terminate(): void {
    this.worker.terminate();
  }
}
```

**Step 3: Commit**

```bash
git add src/data/worker.ts src/data/SatelliteWorker.ts && git commit -m "feat(data): add SGP4 Web Worker for satellite propagation"
```

---

## Task 9: Satellite Renderer

**Files:**
- Create: `src/objects/Satellites.ts`

**Step 1: Create instanced satellite renderer**

```typescript
// src/objects/Satellites.ts
import * as THREE from 'three';
import type { TLE, SatelliteCategory } from '../data/types';

const CATEGORY_COLORS: Record<SatelliteCategory, THREE.Color> = {
  station: new THREE.Color(0xf97316),    // --pulse (orange)
  science: new THREE.Color(0x58a6ff),    // --ice (blue)
  communication: new THREE.Color(0x7d8590), // --stardust (gray)
  navigation: new THREE.Color(0xf4a623), // --sol (amber)
  other: new THREE.Color(0x7d8590),      // --stardust (gray)
};

export class Satellites {
  readonly mesh: THREE.InstancedMesh;
  private tles: TLE[] = [];
  private dummy = new THREE.Object3D();
  private colors: Float32Array;
  private maxCount: number;

  constructor(maxCount: number = 10000) {
    this.maxCount = maxCount;

    // Simple octahedron geometry
    const geometry = new THREE.OctahedronGeometry(50000, 0); // 50km radius visible at distance

    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    });

    this.mesh = new THREE.InstancedMesh(geometry, material, maxCount);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;

    // Pre-allocate color buffer
    this.colors = new Float32Array(maxCount * 3);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(this.colors, 3);
  }

  setTLEs(tles: TLE[]): void {
    this.tles = tles.slice(0, this.maxCount);
    this.mesh.count = this.tles.length;

    // Set colors based on category
    for (let i = 0; i < this.tles.length; i++) {
      const color = CATEGORY_COLORS[this.tles[i].category];
      this.colors[i * 3 + 0] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;
    }

    (this.mesh.instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true;
  }

  updatePositions(positions: Float32Array): void {
    const count = Math.min(positions.length / 6, this.mesh.count);

    for (let i = 0; i < count; i++) {
      const x = positions[i * 6 + 0];
      const y = positions[i * 6 + 1];
      const z = positions[i * 6 + 2];

      // Skip invalid positions
      if (x === 0 && y === 0 && z === 0) continue;

      this.dummy.position.set(x, y, z);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
  }

  getTLEAtIndex(index: number): TLE | null {
    return this.tles[index] || null;
  }

  get count(): number {
    return this.mesh.count;
  }

  addToScene(scene: THREE.Scene): void {
    scene.add(this.mesh);
  }
}
```

**Step 2: Commit**

```bash
git add src/objects/Satellites.ts && git commit -m "feat(objects): add instanced Satellites renderer"
```

---

## Task 10: Integrate Satellites into Main

**Files:**
- Modify: `src/main.ts`

**Step 1: Update main.ts with full satellite integration**

```typescript
// src/main.ts
import './styles/main.css';
import * as THREE from 'three';
import { Renderer } from './engine/Renderer';
import { Camera } from './engine/Camera';
import { LogScale } from './engine/LogScale';
import { Earth } from './objects/Earth';
import { Satellites } from './objects/Satellites';
import { SatelliteWorker } from './data/SatelliteWorker';
import { fetchAllTLEs } from './data/celestrak';
import { TLECache } from './data/cache';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const renderer = new Renderer({ canvas });
const orbitCamera = new Camera();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

// Add ambient light
const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);

// Earth
const earth = new Earth();
earth.addToScene(scene);

// Satellites
const satellites = new Satellites(renderer.capabilities.maxSatellites);
satellites.addToScene(scene);

// Worker for orbital propagation
const worker = new SatelliteWorker();
worker.onPositions((positions) => {
  satellites.updatePositions(positions);
});

// Cache
const cache = new TLECache();

// Load satellite data
async function loadSatellites() {
  const hud = document.getElementById('hud')!;

  // Try cache first
  let tles = await cache.getAll();

  if (tles.length > 0) {
    satellites.setTLEs(tles);
    const count = await worker.init(tles);
    console.log(`Loaded ${count} satellites from cache`);
  }

  // Fetch fresh data if stale or empty
  if (await cache.isStale(24 * 60 * 60 * 1000) || tles.length === 0) {
    try {
      hud.innerHTML = '<div style="color: var(--stardust);">Loading satellite data...</div>';
      tles = await fetchAllTLEs();

      if (tles.length > 0) {
        await cache.store(tles);
        satellites.setTLEs(tles);
        const count = await worker.init(tles);
        console.log(`Loaded ${count} satellites from CelesTrak`);
      }
    } catch (error) {
      console.error('Failed to fetch TLEs:', error);
    }
  }
}

loadSatellites();

// Input handling
let isDragging = false;
let lastMouse = { x: 0, y: 0 };

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.1 : -0.1;
  orbitCamera.zoom(delta);
}, { passive: false });

canvas.addEventListener('mousedown', (e) => {
  isDragging = true;
  lastMouse = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const deltaX = e.clientX - lastMouse.x;
  const deltaY = e.clientY - lastMouse.y;
  orbitCamera.rotate(deltaY * 0.005, -deltaX * 0.005);
  lastMouse = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('mouseup', () => { isDragging = false; });
canvas.addEventListener('mouseleave', () => { isDragging = false; });

// HUD
const hud = document.getElementById('hud')!;
function updateHUD() {
  const altitude = orbitCamera.distanceMeters - 6_371_000;
  hud.innerHTML = `
    <div style="color: var(--stardust); font-size: 14px;">
      <div style="color: var(--starlight);">${satellites.count.toLocaleString()} satellites</div>
      <div style="margin-top: 8px;">Altitude: ${LogScale.formatDistance(Math.max(0, altitude))}</div>
      <div style="opacity: 0.6; font-size: 12px; margin-top: 4px;">Scroll to zoom • Drag to rotate</div>
    </div>
  `;
}

let startTime = performance.now();

function animate() {
  requestAnimationFrame(animate);
  const time = performance.now() - startTime;
  const now = Date.now();

  orbitCamera.update();
  earth.update(time);

  // Request new satellite positions
  worker.requestPositions(now);

  renderer.render(scene, orbitCamera.camera);
  updateHUD();
}

window.addEventListener('resize', () => {
  orbitCamera.setAspect(window.innerWidth / window.innerHeight);
  renderer.resize();
});

orbitCamera.setAspect(window.innerWidth / window.innerHeight);
animate();
```

**Step 2: Test with live data**

```bash
npm run dev
```

Expected: Earth with satellites appearing as colored dots, positions updating in real-time.

**Step 3: Commit**

```bash
git add src/main.ts && git commit -m "feat: integrate satellites with live CelesTrak data"
```

---

## Task 11: Satellite Selection & InfoCard

**Files:**
- Modify: `src/main.ts`
- Create: `src/ui/InfoCard.ts`

**Step 1: Create InfoCard component**

```typescript
// src/ui/InfoCard.ts
import type { TLE } from '../data/types';

export class InfoCard {
  private element: HTMLElement;
  private currentTLE: TLE | null = null;
  private onCloseCallback: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.element = container;
    this.element.innerHTML = this.render(null);

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hide();
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (this.element.classList.contains('visible') &&
          !this.element.contains(e.target as Node)) {
        // Small delay to avoid closing on the click that opened it
        setTimeout(() => this.hide(), 10);
      }
    });
  }

  show(tle: TLE, position?: { altitude: number; velocity: number }): void {
    this.currentTLE = tle;
    this.element.innerHTML = this.render(tle, position);
    this.element.classList.add('visible');

    // Attach close button handler
    const closeBtn = this.element.querySelector('.info-card-close');
    closeBtn?.addEventListener('click', () => this.hide());
  }

  hide(): void {
    this.element.classList.remove('visible');
    this.currentTLE = null;
    if (this.onCloseCallback) this.onCloseCallback();
  }

  onClose(callback: () => void): void {
    this.onCloseCallback = callback;
  }

  private render(tle: TLE | null, position?: { altitude: number; velocity: number }): string {
    if (!tle) return '';

    const categoryLabel = {
      station: 'Space Station',
      science: 'Science Satellite',
      communication: 'Communication Satellite',
      navigation: 'Navigation Satellite',
      other: 'Satellite',
    }[tle.category];

    const categoryColor = {
      station: 'var(--pulse)',
      science: 'var(--ice)',
      communication: 'var(--stardust)',
      navigation: 'var(--sol)',
      other: 'var(--stardust)',
    }[tle.category];

    return `
      <div class="info-card-content">
        <div class="info-card-header">
          <span class="info-card-indicator" style="background: ${categoryColor}"></span>
          <div class="info-card-title">
            <div class="info-card-name">${tle.name}</div>
            <div class="info-card-type">${categoryLabel}</div>
          </div>
          <button class="info-card-close">&times;</button>
        </div>
        <div class="info-card-body">
          ${position ? `
            <div class="info-card-row">
              <span class="info-card-label">Altitude</span>
              <span class="info-card-value">${Math.round(position.altitude).toLocaleString()} km</span>
            </div>
            <div class="info-card-row">
              <span class="info-card-label">Velocity</span>
              <span class="info-card-value">${position.velocity.toFixed(2)} km/s</span>
            </div>
          ` : ''}
          <div class="info-card-row">
            <span class="info-card-label">NORAD ID</span>
            <span class="info-card-value">${tle.catalogNumber}</span>
          </div>
        </div>
        <div class="info-card-footer">
          <a href="https://celestrak.org/satcat/search.php?CATNR=${tle.catalogNumber}"
             target="_blank" rel="noopener" class="info-card-link">
            Track on CelesTrak →
          </a>
        </div>
      </div>
    `;
  }
}
```

**Step 2: Add InfoCard styles to main.css**

Add to `src/styles/main.css`:

```css
/* InfoCard Styles */
#info-card {
  right: 32px;
}

.info-card-content {
  background: rgba(13, 17, 23, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid var(--nebula);
  border-radius: 12px;
  width: 320px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}

.info-card-header {
  display: flex;
  align-items: flex-start;
  padding: 20px;
  border-bottom: 1px solid var(--nebula);
  gap: 12px;
}

.info-card-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-top: 5px;
  flex-shrink: 0;
}

.info-card-title {
  flex: 1;
  min-width: 0;
}

.info-card-name {
  font-size: 16px;
  font-weight: 500;
  color: var(--starlight);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.info-card-type {
  font-size: 12px;
  color: var(--stardust);
  margin-top: 2px;
}

.info-card-close {
  background: none;
  border: none;
  color: var(--stardust);
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 0.2s;
}

.info-card-close:hover {
  color: var(--starlight);
}

.info-card-body {
  padding: 16px 20px;
}

.info-card-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
}

.info-card-label {
  color: var(--stardust);
  font-size: 13px;
}

.info-card-value {
  color: var(--starlight);
  font-size: 13px;
}

.info-card-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--nebula);
}

.info-card-link {
  color: var(--ice);
  text-decoration: none;
  font-size: 13px;
  transition: opacity 0.2s;
}

.info-card-link:hover {
  opacity: 0.8;
}
```

**Step 3: Add raycaster selection to main.ts**

Add these imports and code to `src/main.ts`:

```typescript
import { InfoCard } from './ui/InfoCard';

// After satellites setup, add:
const infoCard = new InfoCard(document.getElementById('info-card')!);
const raycaster = new THREE.Raycaster();
raycaster.params.Points = { threshold: 100000 }; // 100km threshold
const mouse = new THREE.Vector2();

let selectedIndex: number | null = null;

canvas.addEventListener('click', (e) => {
  if (isDragging) return;

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, orbitCamera.camera);
  const intersects = raycaster.intersectObject(satellites.mesh);

  if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
    const index = intersects[0].instanceId;
    const tle = satellites.getTLEAtIndex(index);

    if (tle) {
      selectedIndex = index;
      const point = intersects[0].point;
      const altitude = (point.length() - 6_371_000) / 1000; // km
      // Rough velocity estimate
      const velocity = 7.5; // km/s placeholder
      infoCard.show(tle, { altitude, velocity });
    }
  }
});

infoCard.onClose(() => {
  selectedIndex = null;
});
```

**Step 4: Test selection**

```bash
npm run dev
```

Expected: Clicking a satellite opens InfoCard with details.

**Step 5: Commit**

```bash
git add src/ui src/styles/main.css src/main.ts && git commit -m "feat(ui): add satellite selection and InfoCard"
```

---

## Task 12: Final Polish & Build Test

**Files:**
- Modify: `src/styles/main.css`
- Add: `.gitignore`

**Step 1: Add .gitignore**

```bash
cat > .gitignore << 'EOF'
node_modules/
dist/
.DS_Store
*.log
.env
.env.local
EOF
```

**Step 2: Test production build**

```bash
npm run build
```

Expected: Build succeeds, outputs to `dist/`

**Step 3: Preview production build**

```bash
npm run preview
```

Expected: Production build runs correctly at localhost:4173

**Step 4: Commit**

```bash
git add .gitignore && git commit -m "chore: add gitignore and verify build"
```

---

## Task 13: Cloudflare Pages Deployment

**Step 1: Create wrangler.toml for Cloudflare**

```bash
cat > wrangler.toml << 'EOF'
name = "cosmic-explorer"
compatibility_date = "2024-01-01"

[site]
bucket = "./dist"
EOF
```

**Step 2: Add deploy script to package.json**

Add to scripts:
```json
"deploy": "npm run build && wrangler pages deploy dist"
```

**Step 3: Commit**

```bash
git add wrangler.toml package.json && git commit -m "chore: add Cloudflare Pages deployment config"
```

**Step 4: Deploy (manual)**

```bash
npm run deploy
```

Or connect GitHub repo to Cloudflare Pages dashboard for auto-deploy.

---

## Summary

This plan builds Phase 1 in 13 tasks:

| Task | Component | Commits |
|------|-----------|---------|
| 1 | Project scaffolding | 1 |
| 2 | LogScale utilities | 1 |
| 3 | Renderer abstraction | 1 |
| 4 | Orbital camera | 1 |
| 5 | Earth with textures | 1 |
| 6 | TLE parser | 1 |
| 7 | IndexedDB cache | 1 |
| 8 | SGP4 Web Worker | 1 |
| 9 | Satellite renderer | 1 |
| 10 | Main integration | 1 |
| 11 | InfoCard selection | 1 |
| 12 | Polish & build | 1 |
| 13 | Cloudflare deploy | 1 |

**Definition of Done:**
- [ ] Earth renders with day/night, atmosphere
- [ ] ~10K satellites visible and updating
- [ ] Click satellite → InfoCard
- [ ] Works offline with cache
- [ ] Deployed to Cloudflare Pages
