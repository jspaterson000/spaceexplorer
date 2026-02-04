# Local Bubble Layer Design

## Context

The Cosmic Explorer currently has three scale levels: Planet, Solar System (orrery), and Stellar (nearby stars within ~20 ly). This design adds the fourth level — the Local Bubble — as the first of three planned galactic-scale layers.

### Planned progression (logarithmic spacing)

| Level | Scale | Status |
|-------|-------|--------|
| Planet | Earth surface / orbit | Done |
| Solar System | Orrery, ~100 AU | Done |
| Stellar | ~20 light years | Done |
| **Local Bubble** | **~500 light years** | **This design** |
| Orion Arm | ~5,000 light years | Future |
| Milky Way | ~100,000 light years | Future |

## Overview

The Local Bubble is a real ~300 light-year cavity in the interstellar medium (ISM) created by supernovae over the past 10-20 million years. The Sun sits inside it. This layer shows:

- The irregular bubble boundary shell
- Major star clusters and associations within ~500 ly
- The Sun's position marked with a "You are here" indicator
- Neighboring structures (Loop I superbubble) at the edges

## Visual Design

### Bubble Boundary Shell

- `THREE.Group` with two components:
  - **Outer shell mesh**: Irregular geometry (deformed icosphere — elongated toward galactic north, compressed near Scorpius-Centaurus). `ShaderMaterial` with Fresnel edge-glow effect (same pattern as OortCloud). Very low base opacity (~0.03), brighter at edges (~0.15). Color: cool blue-violet (#4455aa to #6677cc).
  - **Boundary particles**: ~500 scattered points along the shell surface representing denser ISM at the boundary. Subtle shimmer animation.

### Star Clusters

- Each cluster rendered as a small cloud of ~20-40 points with a soft glow halo
- Points colored by spectral type (reuse existing color palette from NearbyStars.ts)
- Clusters positioned at approximate real galactic coordinates
- The Sun's stellar neighbourhood appears as one cluster near center

### Sun Marker

- Pulsing ring or crosshair at the Sun's position
- Always visible, not occluded by the shell

### Neighboring Structures

- Loop I superbubble: faint larger shell segment visible in one direction, suggesting larger-scale ISM structure

## Data

### Star Clusters and Associations (~10 entries)

Hardcoded dataset in `src/data/LocalBubbleData.ts`:

| Cluster | Distance (ly) | Type | Notable |
|---------|---------------|------|---------|
| Sun (neighbourhood) | 0 | marker | Yes |
| Hyades | ~150 | Open cluster | Yes |
| Pleiades | ~440 | Open cluster | Yes |
| Upper Scorpius | ~470 | Association | Yes |
| Upper Centaurus Lupus | ~460 | Association | No |
| Lower Centaurus Crux | ~380 | Association | No |
| IC 2602 | ~480 | Open cluster | No |
| Alpha Persei | ~570 | Open cluster | No |
| Ursa Major group | ~80 | Moving group | No |
| Coma Berenices | ~280 | Open cluster | No |

Each entry has: `name`, `position: [x, y, z]` (light-year galactic coordinates), `distance`, `type`, `starCount` (for sizing), `notable` (for always-show labels).

### Bubble Boundary

~20 control points defining the irregular shell shape, interpolated to smooth geometry at runtime.

## UI and Labels

### Labels (`src/ui/LocalBubbleLabels.ts`)

- CSS2DRenderer pattern (same as StarLabels.ts)
- **Always visible**: Hyades, Pleiades, Scorpius-Centaurus, Sun ("You are here")
- **Hover**: IC 2602, Alpha Persei, Ursa Major group, Coma Berenices
- Each label: cluster name, distance from Sun, brief descriptor
- Staggered entrance animation matching StarLabels pattern

### Scale Level Navigation

- `ScaleLevelNav` updated to show 4 levels
- Level label: "Local Bubble"
- Up arrow disabled until Orion Arm layer is built

### Camera

- Initial position: log ~12.5, phi pi/3
- Zoom-out animation to log ~13.0 during reveal
- Auto-rotation enabled
- Zoom bounds: log 12.0 to 13.5

### No time controls

Time simulation not meaningful at this scale (positions static on human timescales).

## Transition: Stellar -> Local Bubble

1. Fade to black
2. Hide: individual star points, star labels
3. Show: LocalBubble group (shell + clusters), LocalBubble labels
4. Camera: position at log 12.5, animate to log 13.0
5. Fade in
6. After reveal: staggered label animations (lines first, then text)

## Files

### New files

| File | Purpose |
|------|---------|
| `src/data/LocalBubbleData.ts` | Cluster positions, bubble boundary control points |
| `src/objects/LocalBubble.ts` | THREE.Group: shell mesh + cluster points + Sun marker |
| `src/ui/LocalBubbleLabels.ts` | CSS2D labels for clusters |

### Modified files

| File | Change |
|------|--------|
| `src/state/ScaleLevel.ts` | Add `LocalBubble` enum value, update transitions |
| `src/main.ts` | Instantiate LocalBubble, visibility matrix, transition logic |
| `src/ui/ScaleLevelNav.ts` | Support 4+ levels, "Local Bubble" label |
| `src/engine/Camera.ts` | Zoom bounds for new level |

## Performance

- One Points object per cluster (~200-400 vertices total)
- One mesh for the shell
- ~500 particles for boundary
- Well within existing performance budget
