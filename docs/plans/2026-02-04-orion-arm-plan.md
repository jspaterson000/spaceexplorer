# Orion Arm Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the 5th scale level — the Orion Arm (~3,000-10,000 ly) — showing notable nebulae as glowing sprites, ambient star fields, and a "You are here" marker for the Local Bubble.

**Architecture:** Follow the same pattern as LocalBubble: data file + renderer class + label class + ScaleLevel enum + main.ts integration. Nebulae rendered as billboard sprites with radial gradient shaders; background stars as point cloud. Radial sqrt scaling with scale factor `1e12`.

**Tech Stack:** Three.js (Sprite, Points, ShaderMaterial, CSS2DRenderer), TypeScript, Vite

---

### Task 1: Orion Arm data file

**Files:**
- Create: `src/data/OrionArmData.ts`

**What to build:**

```typescript
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
    name: 'Vela Supernova Remnant',
    position: [-400, -50, 650],
    distance: 800,
    type: 'supernova remnant',
    radius: 4,
    color: '#66ddee',
    notable: true,
    description: 'Supernova remnant · 800 ly',
  },
  {
    name: 'Gum Nebula',
    position: [-600, -100, 1300],
    distance: 1500,
    type: 'emission nebula',
    radius: 18,
    color: '#ff8899',
    notable: false,
    description: 'Emission nebula · 1,500 ly',
  },
  {
    name: 'North America Nebula',
    position: [1200, 400, 2200],
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
    position: [2800, 200, -4200],
    distance: 5200,
    type: 'emission nebula',
    radius: 32,
    color: '#cc3355',
    notable: false,
    description: 'Emission nebula · 5,200 ly',
  },
  {
    name: 'Cygnus OB2',
    position: [2000, 800, 4800],
    distance: 5500,
    type: 'ob association',
    radius: 15,
    color: '#8899ff',
    notable: true,
    description: 'OB association · 5,500 ly',
  },
  {
    name: 'Crab Nebula',
    position: [3500, 200, -5200],
    distance: 6500,
    type: 'supernova remnant',
    radius: 5.5,
    color: '#aabbff',
    notable: true,
    description: 'Supernova remnant · 6,500 ly',
  },
  {
    name: 'Eagle Nebula',
    position: [-4000, -600, 5500],
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
```

Positions are in galactic cartesian coordinates, spread in different directions.
Ensure `sqrt(x² + y² + z²) ≈ distance` for each object.

**Commit:** `feat: add Orion Arm data file with 10 nebulae and objects`

---

### Task 2: OrionArm renderer class

**Files:**
- Create: `src/objects/OrionArm.ts`

**What to build:**

A class following the exact same API pattern as `LocalBubble`:
- `readonly mesh: THREE.Group`
- Constructor creates: nebula sprites (10 objects) + ambient star point cloud (~600 points)
- `addToScene(scene)`, `setVisible(visible)`, `setOpacity(opacity)`, `setOpacityImmediate(opacity)`, `updateOpacity(damping)`, `update(time)`, `getObjects()`, `getObjectPosition(index)`
- Uses radial sqrt scaling from `LocalBubble.scalePosition()` pattern but with `ORION_ARM_SCALE_FACTOR`

**Nebula sprites:** For each non-marker object, create a `THREE.Sprite` with a `THREE.SpriteMaterial` using a procedurally generated canvas texture (radial gradient from center color to transparent). Sprite scale based on `radius` field. Use additive blending.

**Ambient stars:** A `THREE.Points` cloud of ~600 randomly distributed points around the scene, using the same star shader as LocalBubble's cluster points (with spectral color variation). These give the impression of the arm's stellar density.

**Local Bubble marker:** A single brighter point at origin (size 4.0), same as Sun in LocalBubble.

**Commit:** `feat: add OrionArm renderer with nebula sprites and star field`

---

### Task 3: OrionArmLabels UI class

**Files:**
- Create: `src/ui/OrionArmLabels.ts`
- Modify: `src/styles/main.css` (add `.orion-arm-label` styles)

**What to build:**

Copy the `LocalBubbleLabels` pattern exactly, with class name changes:
- `OrionArmLabels` class
- CSS class prefix: `orion-arm-label` instead of `local-bubble-label`
- Import `OrionArmObject` instead of `StarCluster`
- Same CSS2DRenderer setup, same label structure, same animation stages

CSS styles: copy `.local-bubble-label*` rules, rename to `.orion-arm-label*`. Same styling.

**Commit:** `feat: add OrionArmLabels UI with CSS styles`

---

### Task 4: ScaleLevel + ScaleLevelNav updates

**Files:**
- Modify: `src/state/ScaleLevel.ts`
- Modify: `src/ui/ScaleLevelNav.ts`

**Changes:**

ScaleLevel.ts:
- Add `OrionArm = 'orion-arm'` to the enum
- Add `ScaleLevel.OrionArm` to the LEVELS array (after LocalBubble)
- Add `isOrionArmMode()` method

ScaleLevelNav.ts:
- Add `case ScaleLevel.OrionArm: return 'Orion';` to getLevelLabel

**Commit:** `feat: add OrionArm to scale level system`

---

### Task 5: Title card template

**Files:**
- Modify: `index.html` (add orion-arm-facts-template)
- Modify: `src/main.ts` (add OrionArm case to updateTitleCardForLevel)

**Changes:**

index.html — add template after local-bubble-facts-template:
```html
<template id="orion-arm-facts-template">
  <div class="fact-row"><span class="fact-label">Extent</span><span class="fact-value">~10,000 light years</span></div>
  <div class="fact-row"><span class="fact-label">Objects</span><span class="fact-value">10 notable nebulae</span></div>
  <div class="fact-row"><span class="fact-label">Nearest</span><span class="fact-value">Vela Remnant (800 ly)</span></div>
  <div class="fact-row"><span class="fact-label">Type</span><span class="fact-value">Minor spiral arm</span></div>
  <div class="fact-highlight">A spur between the Sagittarius and Perseus arms of the Milky Way</div>
</template>
```

main.ts updateTitleCardForLevel — add OrionArm case:
```typescript
} else if (level === ScaleLevel.OrionArm) {
  titleElement.textContent = 'Orion Arm';
  const orionArmFactsTemplate = document.getElementById('orion-arm-facts-template') as HTMLTemplateElement;
  if (orionArmFactsTemplate) {
    factsElement.innerHTML = orionArmFactsTemplate.innerHTML;
  }
  statsElement.classList.add('hidden');
}
```

**Commit:** `feat: add Orion Arm title card template`

---

### Task 6: main.ts full integration

**Files:**
- Modify: `src/main.ts`

**Changes:**

1. **Imports:** Add OrionArm, OrionArmLabels, OrionArmData imports

2. **Instantiation** (after localBubbleLabels setup, ~line 156):
```typescript
const orionArm = new OrionArm();
orionArm.addToScene(scene);

const orionArmLabels = new OrionArmLabels(document.body, scene);

orionArm.getObjects().forEach((obj, index) => {
  const position = orionArm.getObjectPosition(index);
  const color = obj.type === 'marker' ? '#ffee88' : obj.color;
  orionArmLabels.addLabel(obj, position, color, obj.notable);
});
```

3. **Transition logic** — add `const isOrionArm = level === ScaleLevel.OrionArm;` and:
   - In ALL existing transition blocks (isOrrery, isStellar, isPlanet, isLocalBubble), add:
     ```typescript
     orionArm.setVisible(false);
     orionArmLabels.setVisible(false);
     ```
   - Add new `else if (isOrionArm)` block after the isLocalBubble block:
     ```typescript
     } else if (isOrionArm) {
       orbitCamera.setPositionImmediate(12.6, Math.PI / 3, new THREE.Vector3(0, 0, 0));
       // Hide everything from previous levels
       earth.mesh.visible = false;
       // ... (same hide pattern as isLocalBubble)
       localBubble.setVisible(false);
       localBubbleLabels.setVisible(false);
       // Show Orion Arm
       orionArm.setVisible(true);
       orionArm.setOpacityImmediate(1);
       journeyDock.style.display = 'none';
       timeControls.hide();
       orbitCamera.setAutoRotate(true);
       orbitCamera.animateZoomTo(13.0);
     }
     ```
   - Update orrery mode condition: `sun.setOrreryMode(isOrrery || isStellar || isLocalBubble || isOrionArm);` (and same for all planets)
   - After reveal: add `else if (isOrionArm)` with 3s delay for orionArmLabels.setVisible(true)

4. **Animation loop** — add:
```typescript
orionArm.update(time);
orionArm.updateOpacity(0.06);
orionArmLabels.render(orbitCamera.camera);
```

**Commit:** `feat: integrate Orion Arm into main app with transitions`

---

### Task 7: Test, build, verify

**Steps:**
1. Run `npm run build` — verify no TypeScript errors
2. Run `npx vitest run` — verify all tests pass
3. Visual check: navigate through all 5 scale levels
4. Verify: labels appear, sprites glow, transitions smooth

**Commit:** No new commit unless fixes needed
