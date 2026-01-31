# Solar System Orrery Mode

## Overview

Add an orrery mode that shows a stylized, animated view of the solar system with exaggerated planet sizes and compressed orbits. This is the first step toward a hierarchical scale navigation system (Planet → Solar System → Stellar Neighborhood).

## Scale Level Navigation

New UI component with up/down arrows for navigating between cosmic scales:

- **Up arrow (▲)** — Go up one level (more zoomed out)
- **Down arrow (▼)** — Go down one level (more detailed)

### Scale Hierarchy

1. **Planet View** (current default) — Realistic scale, focused on a single body
2. **Solar System / Orrery** — All planets visible with compressed orbits
3. **Stellar Neighborhood** (future) — Nearby stars like Alpha Centauri

### Behavior

- Down arrow disabled at Planet View (lowest level)
- Up arrow disabled at highest available level
- Camera smoothly transitions between levels
- Going "down" returns to the last focused planet (or Earth by default)
- Arrows positioned near the navigation dock (top-right area)

## Orrery Visuals

### Orbit Compression (Square-root Scaling)

Planet distances from the Sun are scaled by their square root:

| Planet  | Real (AU) | Orrery (√AU) |
|---------|-----------|--------------|
| Mercury | 0.39      | 0.62         |
| Venus   | 0.72      | 0.85         |
| Earth   | 1.00      | 1.00         |
| Mars    | 1.52      | 1.23         |
| Jupiter | 5.20      | 2.28         |
| Saturn  | 9.58      | 3.10         |
| Uranus  | 19.22     | 4.38         |
| Neptune | 30.05     | 5.48         |

This keeps inner planets distinguishable while outer planets still feel farther out.

### Planet Sizing (Exaggerated Proportional)

Compress real size ratios to a visible range:

- Real: Jupiter = 11× Earth, Mercury = 0.38× Earth
- Orrery: Jupiter ≈ 3× Earth, Mercury ≈ 0.7× Earth
- Gas giants clearly larger, rocky planets don't vanish

### Visual Style

- **Planets** — Keep existing textures and shaders (Earth's day/night terminator, Saturn's rings, etc.)
- **Orbital paths** — Subtle glowing elliptical lines, semi-transparent (soft blue or white glow)
- **Sun** — Scaled down appropriately so it doesn't dominate the view
- **Orbital paths hidden** in Planet View, visible only in Orrery mode

## Time Controls

A playback control bar appears when entering orrery mode:

```
[◀◀] [▶/❚❚] [▶▶]    1 day/sec    ───●─── Feb 1, 2026
```

### Controls

- **Play/Pause** — Toggle planetary motion animation
- **Speed** — Presets: 1 day/sec, 1 week/sec, 1 month/sec
- **Rewind/Fast-forward** — Skip backward/forward in time
- **Date display** — Shows the simulated date

### Behavior

- Paused by default when entering orrery mode
- Shows current real date/time initially
- Time resets to real current time when leaving orrery mode
- Time controls hidden in Planet View (remains locked to real-time)

## Implementation Notes

### New Components

- `src/ui/ScaleLevelNav.ts` — Up/down arrow navigation
- `src/ui/TimeControls.ts` — Playback controls for orrery mode
- `src/objects/OrbitalPath.ts` — Glowing orbital ellipse rendering

### Modified Components

- `src/engine/Camera.ts` — Add orrery camera position/transition
- `src/objects/planets/*.ts` — Support for orrery-mode scaling
- `src/main.ts` — Integrate scale level state and time simulation
- `src/ui/Navigation.ts` — Hide/show based on current scale level

### State Management

- Current scale level (planet / solar-system / future: stellar)
- Last focused planet (for returning from orrery)
- Simulated time (separate from real time, used only in orrery mode)
- Time playback state (paused/playing, speed multiplier)
