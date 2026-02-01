# Stellar Neighborhood Feature Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a new scale level showing ~52 nearby stars within 15-20 light years of the Sun.

**Architecture:** Extend the existing scale level system with a "Stellar" level above "System". Stars rendered as point sprites with custom glow shader. Two-stage camera transition bridges the massive scale gap elegantly.

**Tech Stack:** Three.js Points geometry, custom GLSL shaders, CSS2DRenderer for labels.

---

## Visual Design

### Star Rendering
- Point sprites using THREE.Points with custom shader
- Size based on apparent magnitude (brighter = larger)
- Color based on spectral type:
  - O/B stars: Blue-white (#aaccff)
  - A stars: White (#ffffff)
  - F stars: Yellow-white (#fff4e8)
  - G stars (Sun-like): Yellow (#ffee88)
  - K stars: Orange (#ffbb66)
  - M stars (red dwarfs): Red-orange (#ff8844)
- Glow effect via additive blending in shader

### Sun at Stellar Scale
- Rendered as G-type yellow point sprite
- Labeled "Sun" with leader line
- Planets, orbital paths, Oort Cloud hidden at this scale

---

## Camera Transition

### System → Stellar (Two-Stage)

**Stage 1 - Departure (0-1.5s):**
- Solar system elements fade out (orbital paths, planet labels, Oort Cloud)
- Camera begins slow zoom out
- Subtle darkening/blur effect

**Stage 2 - Arrival (1.5-4s):**
- Camera arrives at stellar view distance
- Brief pause at 2s mark
- Stars fade in as points
- Star labels animate in with stagger (leader lines draw, then names)

### Stellar → System (Reverse)
- Stars and labels fade out
- Camera zooms toward Sun
- Solar system elements fade back in on arrival

---

## UI Components

### Title Card
```
Stellar Neighborhood
─────────────────────
RADIUS          ~20 light years
STARS           52
NEAREST         Proxima Centauri (4.24 ly)
BRIGHTEST       Sirius (8.6 ly)

Our corner of the Milky Way
```

### Star Labels
- Same leader-line style as planet labels
- Format: `───── Star Name` with `X.XX ly` below in smaller text
- ~25-30 notable stars labeled (not all 52)
- Staggered animation after camera arrival

### Navigation
- New "Stellar" level in ScaleLevelNav (above "System")
- Planet dock hidden at stellar scale

---

## Data Structure

```typescript
interface Star {
  name: string;
  position: [number, number, number]; // x, y, z in light years
  distance: number; // light years from Sun
  spectralType: string; // e.g., "G2V", "M5.5V"
  apparentMagnitude: number;
  absoluteMagnitude: number;
  notable: boolean; // whether to show label
}
```

### Notable Stars to Include
- Alpha Centauri system (Proxima, A, B)
- Barnard's Star
- Wolf 359
- Lalande 21185
- Sirius A & B
- Luyten 726-8 (UV Ceti)
- Ross 154, Ross 248
- Epsilon Eridani
- Lacaille 9352
- Ross 128
- Procyon A & B
- Tau Ceti
- And ~40 more within 20 ly

---

## File Structure

### New Files
- `src/data/NearbyStars.ts` - Star catalog with positions and properties
- `src/objects/Stars.ts` - Star rendering (Points + glow shader)
- `src/ui/StarLabels.ts` - Labels using CSS2DRenderer

### Modified Files
- `src/state/ScaleLevel.ts` - Add "Stellar" level
- `src/engine/Camera.ts` - Extend zoom range, stellar transitions
- `src/ui/ScaleLevelNav.ts` - Add Stellar button
- `src/ui/InfoCard.ts` - Stellar neighborhood content
- `src/main.ts` - Integrate stars, handle scale transitions

---

## Performance Considerations
- Single Points geometry for all stars (one draw call)
- Custom shader handles size, color, and glow efficiently
- Labels reuse existing CSS2DRenderer pattern
- Only ~25-30 labels rendered (not all 52 stars)
