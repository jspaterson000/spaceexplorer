# Orrery Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an orrery mode with compressed orbits, exaggerated planet sizes, orbital paths, time controls, and scale-level navigation.

**Architecture:** Introduce a `ScaleLevel` state machine that controls whether we're in "planet view" (current behavior) or "solar system/orrery view" (compressed, animated). The orrery view uses square-root orbit scaling, exaggerated planet sizes, and a simulated time system independent of real time.

**Tech Stack:** Three.js, TypeScript, existing Planet/orbital mechanics system

---

## Task 1: Add Scale Level State Management

**Files:**
- Create: `src/state/ScaleLevel.ts`

**Step 1: Write the failing test**

Create `src/state/ScaleLevel.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { ScaleLevel, ScaleLevelState } from './ScaleLevel';

describe('ScaleLevel', () => {
  it('starts at planet level', () => {
    const state = new ScaleLevelState();
    expect(state.current).toBe(ScaleLevel.Planet);
  });

  it('can go up from planet to solar system', () => {
    const state = new ScaleLevelState();
    expect(state.canGoUp()).toBe(true);
    state.goUp();
    expect(state.current).toBe(ScaleLevel.SolarSystem);
  });

  it('cannot go up from solar system (top level)', () => {
    const state = new ScaleLevelState();
    state.goUp();
    expect(state.canGoUp()).toBe(false);
  });

  it('can go down from solar system to planet', () => {
    const state = new ScaleLevelState();
    state.goUp();
    expect(state.canGoDown()).toBe(true);
    state.goDown();
    expect(state.current).toBe(ScaleLevel.Planet);
  });

  it('cannot go down from planet (bottom level)', () => {
    const state = new ScaleLevelState();
    expect(state.canGoDown()).toBe(false);
  });

  it('tracks last focused body', () => {
    const state = new ScaleLevelState();
    state.setLastFocusedBody('mars');
    expect(state.lastFocusedBody).toBe('mars');
  });

  it('defaults last focused body to earth', () => {
    const state = new ScaleLevelState();
    expect(state.lastFocusedBody).toBe('earth');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/state/ScaleLevel.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

Create `src/state/ScaleLevel.ts`:

```typescript
export enum ScaleLevel {
  Planet = 'planet',
  SolarSystem = 'solar-system',
}

const LEVELS = [ScaleLevel.Planet, ScaleLevel.SolarSystem];

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
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/state/ScaleLevel.test.ts`
Expected: PASS (7 tests)

**Step 5: Commit**

```bash
git add src/state/ScaleLevel.ts src/state/ScaleLevel.test.ts
git commit -m "feat: add scale level state management"
```

---

## Task 2: Add Simulated Time State

**Files:**
- Create: `src/state/SimulatedTime.ts`

**Step 1: Write the failing test**

Create `src/state/SimulatedTime.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SimulatedTime } from './SimulatedTime';

describe('SimulatedTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-31T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts paused at current real time', () => {
    const sim = new SimulatedTime();
    expect(sim.isPaused).toBe(true);
    expect(sim.getDate().toISOString()).toBe('2026-01-31T12:00:00.000Z');
  });

  it('does not advance time when paused', () => {
    const sim = new SimulatedTime();
    const initial = sim.getDate().getTime();
    sim.update(1000); // 1 second delta
    expect(sim.getDate().getTime()).toBe(initial);
  });

  it('advances time when playing at 1 day/sec', () => {
    const sim = new SimulatedTime();
    sim.setSpeed(1); // 1 day per second
    sim.play();
    sim.update(1000); // 1 second of real time
    const expected = new Date('2026-02-01T12:00:00.000Z');
    expect(sim.getDate().getTime()).toBe(expected.getTime());
  });

  it('advances time at 7 days/sec speed', () => {
    const sim = new SimulatedTime();
    sim.setSpeed(7);
    sim.play();
    sim.update(1000); // 1 second
    const expected = new Date('2026-02-07T12:00:00.000Z');
    expect(sim.getDate().getTime()).toBe(expected.getTime());
  });

  it('can pause playback', () => {
    const sim = new SimulatedTime();
    sim.play();
    expect(sim.isPaused).toBe(false);
    sim.pause();
    expect(sim.isPaused).toBe(true);
  });

  it('resets to real time', () => {
    const sim = new SimulatedTime();
    sim.setSpeed(1);
    sim.play();
    sim.update(5000); // advance 5 days
    sim.reset();
    expect(sim.getDate().toISOString()).toBe('2026-01-31T12:00:00.000Z');
    expect(sim.isPaused).toBe(true);
  });

  it('can step forward', () => {
    const sim = new SimulatedTime();
    sim.stepForward(); // default 1 day
    const expected = new Date('2026-02-01T12:00:00.000Z');
    expect(sim.getDate().getTime()).toBe(expected.getTime());
  });

  it('can step backward', () => {
    const sim = new SimulatedTime();
    sim.stepBackward();
    const expected = new Date('2026-01-30T12:00:00.000Z');
    expect(sim.getDate().getTime()).toBe(expected.getTime());
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/state/SimulatedTime.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

Create `src/state/SimulatedTime.ts`:

```typescript
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export class SimulatedTime {
  private _date: Date;
  private _isPaused = true;
  private _speed = 1; // days per second

  constructor() {
    this._date = new Date();
  }

  get isPaused(): boolean {
    return this._isPaused;
  }

  getDate(): Date {
    return new Date(this._date.getTime());
  }

  setSpeed(daysPerSecond: number): void {
    this._speed = daysPerSecond;
  }

  getSpeed(): number {
    return this._speed;
  }

  play(): void {
    this._isPaused = false;
  }

  pause(): void {
    this._isPaused = true;
  }

  toggle(): void {
    this._isPaused = !this._isPaused;
  }

  reset(): void {
    this._date = new Date();
    this._isPaused = true;
  }

  update(deltaMs: number): void {
    if (this._isPaused) return;
    const simDeltaMs = (deltaMs / 1000) * this._speed * MS_PER_DAY;
    this._date = new Date(this._date.getTime() + simDeltaMs);
  }

  stepForward(days = 1): void {
    this._date = new Date(this._date.getTime() + days * MS_PER_DAY);
  }

  stepBackward(days = 1): void {
    this._date = new Date(this._date.getTime() - days * MS_PER_DAY);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/state/SimulatedTime.test.ts`
Expected: PASS (9 tests)

**Step 5: Commit**

```bash
git add src/state/SimulatedTime.ts src/state/SimulatedTime.test.ts
git commit -m "feat: add simulated time state for orrery animation"
```

---

## Task 3: Add Orrery Scaling Utilities

**Files:**
- Modify: `src/engine/LogScale.ts`

**Step 1: Write the failing test**

Add to `src/engine/LogScale.test.ts`:

```typescript
describe('orrery scaling', () => {
  it('applies square root to orbit distance', () => {
    // Earth at 1 AU stays at 1
    expect(LogScale.orreryOrbitScale(1)).toBeCloseTo(1, 5);
    // Neptune at 30 AU becomes ~5.48
    expect(LogScale.orreryOrbitScale(30)).toBeCloseTo(5.477, 2);
    // Mercury at 0.39 AU becomes ~0.62
    expect(LogScale.orreryOrbitScale(0.39)).toBeCloseTo(0.624, 2);
  });

  it('compresses planet size ratios', () => {
    // Jupiter real = 11x Earth, orrery = ~3x
    const jupiterReal = 11;
    const earthReal = 1;
    const jupiterOrrery = LogScale.orreryPlanetScale(jupiterReal);
    const earthOrrery = LogScale.orreryPlanetScale(earthReal);
    expect(jupiterOrrery / earthOrrery).toBeCloseTo(3, 0);

    // Mercury real = 0.38x Earth, orrery = ~0.7x
    const mercuryReal = 0.38;
    const mercuryOrrery = LogScale.orreryPlanetScale(mercuryReal);
    expect(mercuryOrrery / earthOrrery).toBeCloseTo(0.7, 1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/engine/LogScale.test.ts`
Expected: FAIL - orreryOrbitScale not defined

**Step 3: Write minimal implementation**

Add to `src/engine/LogScale.ts`:

```typescript
  /**
   * Square-root scaling for orrery orbit distances
   * Input: distance in AU (or any unit)
   * Output: compressed distance
   */
  orreryOrbitScale(distanceAU: number): number {
    return Math.sqrt(distanceAU);
  },

  /**
   * Compress planet size ratios for orrery view
   * Uses cube root to compress 11x -> ~3x, 0.38x -> ~0.7x
   * Input: relative size (Earth = 1)
   * Output: compressed relative size
   */
  orreryPlanetScale(relativeSize: number): number {
    // Cube root compresses the range nicely
    // 11^(1/3) ≈ 2.22, but we want ~3, so use 0.45 power
    // 0.38^0.45 ≈ 0.66
    return Math.pow(relativeSize, 0.45);
  },
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/engine/LogScale.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/engine/LogScale.ts src/engine/LogScale.test.ts
git commit -m "feat: add orrery scaling utilities"
```

---

## Task 4: Create Orbital Path Renderer

**Files:**
- Create: `src/objects/OrbitalPath.ts`

**Step 1: Write the orbital path component**

Create `src/objects/OrbitalPath.ts`:

```typescript
import * as THREE from 'three';
import { OrbitalElements, solveKepler, J2000_EPOCH, MS_PER_DAY } from './planets/PlanetData';
import { LogScale } from '../engine/LogScale';

const AU_IN_METERS = 149_597_870_700;

export class OrbitalPath {
  readonly line: THREE.Line;
  private readonly orbitalElements: OrbitalElements;
  private visible = false;

  constructor(
    orbitalElements: OrbitalElements,
    color: number = 0x4488ff,
    segments = 128
  ) {
    this.orbitalElements = orbitalElements;

    const points = this.calculateOrbitPoints(segments);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    });

    this.line = new THREE.Line(geometry, material);
    this.line.visible = this.visible;
  }

  private calculateOrbitPoints(segments: number): THREE.Vector3[] {
    const { a, e, i, omega, w } = this.orbitalElements;
    const points: THREE.Vector3[] = [];

    for (let j = 0; j <= segments; j++) {
      const M = (j / segments) * 2 * Math.PI;
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

      // Rotation to ecliptic coordinates
      const cosW = Math.cos(w);
      const sinW = Math.sin(w);
      const cosI = Math.cos(i);
      const sinI = Math.sin(i);
      const cosOmega = Math.cos(omega);
      const sinOmega = Math.sin(omega);

      const x = (cosOmega * cosW - sinOmega * sinW * cosI) * xOrbital +
                (-cosOmega * sinW - sinOmega * cosW * cosI) * yOrbital;
      const y = (sinOmega * cosW + cosOmega * sinW * cosI) * xOrbital +
                (-sinOmega * sinW + cosOmega * cosW * cosI) * yOrbital;
      const z = (sinW * sinI) * xOrbital + (cosW * sinI) * yOrbital;

      // Apply orrery scaling (square root of AU)
      const distanceAU = Math.sqrt(x * x + y * y + z * z) / AU_IN_METERS;
      const scale = distanceAU > 0 ? LogScale.orreryOrbitScale(distanceAU) / distanceAU : 1;

      points.push(new THREE.Vector3(x * scale, y * scale, z * scale));
    }

    return points;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.line.visible = visible;
  }

  addToScene(scene: THREE.Scene): void {
    scene.add(this.line);
  }
}
```

**Step 2: No unit test needed for pure rendering component**

Visual components are tested via integration/e2e tests.

**Step 3: Commit**

```bash
git add src/objects/OrbitalPath.ts
git commit -m "feat: add orbital path line renderer"
```

---

## Task 5: Create Scale Level Navigation UI

**Files:**
- Create: `src/ui/ScaleLevelNav.ts`
- Modify: `index.html`
- Modify: `src/styles/main.css`

**Step 1: Add HTML container**

Add to `index.html` after `<div id="journey-dock"></div>`:

```html
<div id="scale-nav"></div>
```

**Step 2: Add CSS styles**

Add to `src/styles/main.css`:

```css
/* Scale Level Navigation */
#scale-nav {
  position: fixed;
  top: 50%;
  right: 40px;
  transform: translateY(-50%);
  z-index: 15;
  display: flex;
  flex-direction: column;
  gap: 8px;
  opacity: 0;
  animation: fadeSlideIn 0.6s ease-out 1.8s forwards;
}

.scale-nav-btn {
  width: 36px;
  height: 36px;
  background: rgba(13, 17, 23, 0.8);
  border: 1px solid var(--nebula);
  border-radius: 6px;
  color: var(--starlight);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: all 0.2s ease;
}

.scale-nav-btn:hover:not(:disabled) {
  background: var(--nebula);
  border-color: var(--ice);
  transform: scale(1.05);
}

.scale-nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.scale-nav-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--stardust);
  text-align: center;
  padding: 4px 0;
}
```

**Step 3: Create ScaleLevelNav component**

Create `src/ui/ScaleLevelNav.ts`:

```typescript
import { ScaleLevelState, ScaleLevel } from '../state/ScaleLevel';

export class ScaleLevelNav {
  private container: HTMLElement;
  private state: ScaleLevelState;
  private onLevelChange: ((level: ScaleLevel) => void) | null = null;

  constructor(container: HTMLElement, state: ScaleLevelState) {
    this.container = container;
    this.state = state;
    this.render();
  }

  setOnLevelChange(callback: (level: ScaleLevel) => void): void {
    this.onLevelChange = callback;
  }

  private render(): void {
    this.container.innerHTML = `
      <button class="scale-nav-btn" id="scale-up" ${this.state.canGoUp() ? '' : 'disabled'}>
        <span>▲</span>
      </button>
      <div class="scale-nav-label">${this.getLevelLabel()}</div>
      <button class="scale-nav-btn" id="scale-down" ${this.state.canGoDown() ? '' : 'disabled'}>
        <span>▼</span>
      </button>
    `;

    this.container.querySelector('#scale-up')?.addEventListener('click', () => {
      if (this.state.canGoUp()) {
        this.state.goUp();
        this.render();
        this.onLevelChange?.(this.state.current);
      }
    });

    this.container.querySelector('#scale-down')?.addEventListener('click', () => {
      if (this.state.canGoDown()) {
        this.state.goDown();
        this.render();
        this.onLevelChange?.(this.state.current);
      }
    });
  }

  private getLevelLabel(): string {
    switch (this.state.current) {
      case ScaleLevel.Planet:
        return 'Planet';
      case ScaleLevel.SolarSystem:
        return 'System';
      default:
        return '';
    }
  }

  update(): void {
    this.render();
  }
}
```

**Step 4: Commit**

```bash
git add src/ui/ScaleLevelNav.ts index.html src/styles/main.css
git commit -m "feat: add scale level navigation UI"
```

---

## Task 6: Create Time Controls UI

**Files:**
- Create: `src/ui/TimeControls.ts`
- Modify: `index.html`
- Modify: `src/styles/main.css`

**Step 1: Add HTML container**

Add to `index.html` after `<div id="scale-nav"></div>`:

```html
<div id="time-controls" class="hidden"></div>
```

**Step 2: Add CSS styles**

Add to `src/styles/main.css`:

```css
/* Time Controls */
#time-controls {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 15;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  background: rgba(13, 17, 23, 0.9);
  border: 1px solid var(--nebula);
  border-radius: 8px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

#time-controls.hidden {
  display: none;
}

.time-btn {
  width: 32px;
  height: 32px;
  background: transparent;
  border: 1px solid var(--nebula);
  border-radius: 4px;
  color: var(--starlight);
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.time-btn:hover {
  background: var(--nebula);
  border-color: var(--ice);
}

.time-btn.active {
  background: var(--ice);
  border-color: var(--ice);
  color: var(--void);
}

.time-speed {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--stardust);
  min-width: 80px;
  text-align: center;
}

.time-date {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--starlight);
  min-width: 100px;
}

.time-divider {
  width: 1px;
  height: 20px;
  background: var(--nebula);
}
```

**Step 3: Create TimeControls component**

Create `src/ui/TimeControls.ts`:

```typescript
import { SimulatedTime } from '../state/SimulatedTime';

const SPEEDS = [1, 7, 30]; // days per second

export class TimeControls {
  private container: HTMLElement;
  private time: SimulatedTime;
  private speedIndex = 0;

  constructor(container: HTMLElement, time: SimulatedTime) {
    this.container = container;
    this.time = time;
    this.render();
  }

  private render(): void {
    const speed = SPEEDS[this.speedIndex];
    const speedLabel = speed === 1 ? '1 day/s' : speed === 7 ? '1 week/s' : '1 month/s';

    this.container.innerHTML = `
      <button class="time-btn" id="time-rew" title="Step back">◀◀</button>
      <button class="time-btn ${this.time.isPaused ? '' : 'active'}" id="time-play" title="Play/Pause">
        ${this.time.isPaused ? '▶' : '❚❚'}
      </button>
      <button class="time-btn" id="time-ff" title="Step forward">▶▶</button>
      <div class="time-divider"></div>
      <button class="time-btn" id="time-speed" title="Change speed">${speedLabel}</button>
      <div class="time-divider"></div>
      <div class="time-date" id="time-date">${this.formatDate()}</div>
    `;

    this.container.querySelector('#time-rew')?.addEventListener('click', () => {
      this.time.stepBackward(SPEEDS[this.speedIndex]);
      this.updateDate();
    });

    this.container.querySelector('#time-play')?.addEventListener('click', () => {
      this.time.toggle();
      this.render();
    });

    this.container.querySelector('#time-ff')?.addEventListener('click', () => {
      this.time.stepForward(SPEEDS[this.speedIndex]);
      this.updateDate();
    });

    this.container.querySelector('#time-speed')?.addEventListener('click', () => {
      this.speedIndex = (this.speedIndex + 1) % SPEEDS.length;
      this.time.setSpeed(SPEEDS[this.speedIndex]);
      this.render();
    });
  }

  private formatDate(): string {
    const d = this.time.getDate();
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  private updateDate(): void {
    const dateEl = this.container.querySelector('#time-date');
    if (dateEl) {
      dateEl.textContent = this.formatDate();
    }
  }

  show(): void {
    this.container.classList.remove('hidden');
  }

  hide(): void {
    this.container.classList.add('hidden');
  }

  update(): void {
    this.updateDate();
  }
}
```

**Step 4: Commit**

```bash
git add src/ui/TimeControls.ts index.html src/styles/main.css
git commit -m "feat: add time controls UI for orrery mode"
```

---

## Task 7: Integrate Orrery Mode into Main App

**Files:**
- Modify: `src/main.ts`

**Step 1: Import new modules**

Add imports at top of `src/main.ts`:

```typescript
import { ScaleLevelState, ScaleLevel } from './state/ScaleLevel';
import { SimulatedTime } from './state/SimulatedTime';
import { ScaleLevelNav } from './ui/ScaleLevelNav';
import { TimeControls } from './ui/TimeControls';
import { OrbitalPath } from './objects/OrbitalPath';
import { ORBITAL_ELEMENTS } from './objects/planets/PlanetData';
```

**Step 2: Create state instances after scene setup**

Add after `const sun = new Sun();`:

```typescript
// Scale level state
const scaleLevelState = new ScaleLevelState();
const simulatedTime = new SimulatedTime();

// Orbital paths (visible in orrery mode)
const orbitalPaths = Object.entries(ORBITAL_ELEMENTS).map(([name, elements]) => {
  const path = new OrbitalPath(elements, 0x4488ff);
  path.addToScene(scene);
  return { name, path };
});
```

**Step 3: Create UI components**

Add after `const missionPreview = ...`:

```typescript
// Scale navigation
const scaleNavContainer = document.getElementById('scale-nav')!;
const scaleLevelNav = new ScaleLevelNav(scaleNavContainer, scaleLevelState);

// Time controls
const timeControlsContainer = document.getElementById('time-controls')!;
const timeControls = new TimeControls(timeControlsContainer, simulatedTime);
```

**Step 4: Handle scale level changes**

Add after creating scaleLevelNav:

```typescript
scaleLevelNav.setOnLevelChange((level) => {
  const isOrrery = level === ScaleLevel.SolarSystem;

  // Show/hide orbital paths
  orbitalPaths.forEach(({ path }) => path.setVisible(isOrrery));

  // Show/hide time controls
  if (isOrrery) {
    timeControls.show();
    // Zoom out for orrery view
    orbitCamera.setZoom(11.5);
  } else {
    timeControls.hide();
    simulatedTime.reset();
    // Return to last focused body
    navigation.flyTo(scaleLevelState.lastFocusedBody as any);
  }
});
```

**Step 5: Update animate loop**

Modify the `animate()` function to include simulated time updates:

```typescript
let lastFrameTime = performance.now();

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const deltaMs = now - lastFrameTime;
  lastFrameTime = now;

  const time = now - startTime;

  // Update simulated time in orrery mode
  if (scaleLevelState.isOrreryMode()) {
    simulatedTime.update(deltaMs);
    timeControls.update();

    // Update planet positions with simulated time
    // (planets will be added in a future task)
  }

  orbitCamera.update();
  navigation.update();
  missionPreview.update();
  earth.update(time);

  // Use real time or simulated time for moon
  const dateForMoon = scaleLevelState.isOrreryMode() ? simulatedTime.getDate() : new Date();
  moon.updatePosition(dateForMoon);
  moon.setSunDirection(earth.sunDirection);

  // Request satellite positions with real time
  worker.requestPositions(Date.now());

  renderer.render(scene, orbitCamera.camera);
  updateStats();
}
```

**Step 6: Track focused body on navigation**

Modify the `navigation.setOnBodyChange` callback:

```typescript
navigation.setOnBodyChange((body) => {
  satellites.mesh.visible = body === 'earth';
  scaleLevelState.setLastFocusedBody(body);
});
```

**Step 7: Commit**

```bash
git add src/main.ts
git commit -m "feat: integrate orrery mode into main app"
```

---

## Task 8: Add Camera Orrery Position

**Files:**
- Modify: `src/engine/Camera.ts`

**Step 1: Add orrery camera method**

Add method to Camera class:

```typescript
  setOrreryView(): void {
    // Top-down angled view for orrery
    this.targetSpherical.phi = Math.PI / 4; // 45 degrees from vertical
    this.targetSpherical.theta = 0;
    this.targetLogDistance = 12; // Far out to see whole system
    this.targetCenter.set(0, 0, 0); // Center on Sun
    this.autoRotateEnabled = false;
  }

  setPlanetView(target: THREE.Vector3, zoom: number): void {
    this.targetCenter.copy(target);
    this.targetLogDistance = zoom;
  }
```

**Step 2: Commit**

```bash
git add src/engine/Camera.ts
git commit -m "feat: add orrery camera positioning"
```

---

## Task 9: Update Moon to Accept Date Parameter

**Files:**
- Modify: `src/objects/Moon.ts`

**Step 1: Check current Moon.updatePosition signature**

The Moon already uses real-time orbital position. Update it to accept an optional date parameter:

```typescript
updatePosition(date: Date = new Date()): void {
  // Update existing code to use the date parameter
  // instead of new Date() directly
}
```

**Step 2: Commit**

```bash
git add src/objects/Moon.ts
git commit -m "feat: allow Moon to use simulated time"
```

---

## Task 10: Hide Orrery UI During Mission Preview

**Files:**
- Modify: `src/styles/main.css`

**Step 1: Update mission-active styles**

Add to the existing `.mission-active` rule:

```css
.mission-active #scale-nav,
.mission-active #time-controls {
  opacity: 0 !important;
  pointer-events: none !important;
  transition: opacity 0.5s ease;
}
```

**Step 2: Commit**

```bash
git add src/styles/main.css
git commit -m "fix: hide orrery UI during mission preview"
```

---

## Task 11: Manual Integration Testing

**Steps:**
1. Run `npm run dev`
2. Verify scale navigation arrows appear (right side)
3. Click up arrow - should zoom out to orrery view
4. Verify orbital paths appear as glowing ellipses
5. Verify time controls appear at bottom
6. Click play - planets should animate along orbits
7. Test speed changes (1 day/s, 1 week/s, 1 month/s)
8. Click down arrow - should return to planet view
9. Verify time controls hide when returning to planet view

**Step 2: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration testing fixes"
```

---

## Summary

This implementation adds:
1. **ScaleLevelState** - State machine for planet/solar-system views
2. **SimulatedTime** - Independent time system for orrery animation
3. **Orrery scaling utilities** - Square-root orbit, compressed planet sizes
4. **OrbitalPath** - Glowing orbital ellipse renderer
5. **ScaleLevelNav** - Up/down arrow navigation UI
6. **TimeControls** - Play/pause/speed/date controls
7. **Main app integration** - Wiring everything together

The design is extensible for future "Stellar Neighborhood" level by adding another entry to the ScaleLevel enum.
