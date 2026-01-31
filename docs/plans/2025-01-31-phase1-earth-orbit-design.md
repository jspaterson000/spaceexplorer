# Phase 1: Earth & Orbit — Design Document

**Date**: 2025-01-31
**Status**: Approved
**Deliverable**: "See every satellite orbiting Earth right now"

---

## Overview

Phase 1 builds the foundation: a WebGPU-powered 3D viewer showing Earth with real-time positions of all ~10,000 tracked satellites. Users can zoom, click satellites for details, and explore Earth orbit.

### Key Decisions

- **Full satellite catalog** from day one (~10,000 from CelesTrak)
- **WebGPU-first** with WebGL2 fallback (degraded to 5K satellites)
- **Web Worker with transfer** for orbital propagation (simple, performant)
- **Cloudflare Pages** for hosting

---

## Project Structure

```
spaceexplorer/
├── index.html              # Single HTML entry point
├── vite.config.ts          # Vite config with WebGPU types
├── tsconfig.json
├── package.json
├── public/
│   └── textures/           # Earth textures (blue marble, clouds, night lights)
├── src/
│   ├── main.ts             # Entry point, renderer init
│   ├── engine/
│   │   ├── Renderer.ts     # WebGPU/WebGL2 abstraction
│   │   ├── Camera.ts       # Orbital camera with log-scale zoom
│   │   ├── LogScale.ts     # Log10 coordinate math utilities
│   │   └── Scene.ts        # Scene graph management
│   ├── objects/
│   │   ├── Earth.ts        # Earth sphere with atmosphere
│   │   └── Satellites.ts   # Instanced satellite renderer
│   ├── data/
│   │   ├── worker.ts       # Web Worker for SGP4 propagation
│   │   ├── celestrak.ts    # TLE fetch & parse
│   │   └── cache.ts        # IndexedDB wrapper
│   ├── ui/
│   │   ├── HUD.ts          # Scale indicator, zoom control
│   │   └── InfoCard.ts     # Object detail cards
│   └── styles/
│       └── main.css        # Observatory Dark theme
└── docs/
    └── plans/              # Design documents
```

**Dependencies**: Three.js (r160+), satellite.js, vite, typescript

---

## Renderer & Camera System

### Renderer Abstraction

- Detects WebGPU via `navigator.gpu`
- Creates `THREE.WebGPURenderer` or falls back to `THREE.WebGLRenderer`
- Unified API: `init()`, `render()`, `resize()`
- WebGL2 fallback caps satellites at 5,000

### Logarithmic Camera

- Wraps `THREE.PerspectiveCamera` with orbital controls
- Zoom stored as `logDistance` (0-6 range for Phase 1)
- Actual camera distance = `10 ** logDistance` meters
- Scroll wheel adjusts `logDistance` with smooth damping (~300ms lerp)
- Double-click object: animate to frame it

### Coordinate System

- Origin at Earth's center
- Units in meters internally
- Positions transformed via `LogScale.toScene(realPosition, cameraLogDistance)`
- Objects beyond zoom threshold alpha-fade out

### Frame Loop

1. Update camera from input
2. Request satellite positions from worker (non-blocking)
3. Apply latest positions to instanced mesh
4. Render scene

---

## Earth Rendering

### Geometry

- High-poly `THREE.SphereGeometry` (128 segments)
- `THREE.ShaderMaterial` for multi-layer compositing

### Texture Layers

1. **Day side**: NASA Blue Marble (8K, lazy-load 2K first)
2. **Night side**: City lights, blended by sun angle
3. **Clouds**: Semi-transparent, slight rotation offset
4. **Specular**: Ocean glint

### Atmosphere

- Second larger sphere with Fresnel rim glow shader
- Blue tint, fades as camera pulls back
- Becomes glow sprite at zoom 4+

### Sun Position

- Calculated from UTC time
- Drives day/night terminator
- Directional light + ambient fill

### LOD Strategy

| Zoom | Detail |
|------|--------|
| 0-2  | Full 8K textures, all layers |
| 2-4  | 4K textures, simplified clouds |
| 4-6  | 2K textures, atmosphere as sprite |
| 6+   | Earth becomes point (Phase 2) |

---

## Satellite System

### Data Pipeline

- Fetch TLEs from CelesTrak API (stations, active, starlink endpoints)
- Parse two-line elements into structured objects
- Store in IndexedDB with timestamp
- Refresh if >24 hours stale
- On load: serve cache immediately, fetch updates in background

### Web Worker

- Receives TLE array on init
- Uses `satellite.js` for SGP4 propagation
- Each frame: propagate all satellites to current time
- Returns `Float32Array` positions via `postMessage` transfer
- Also returns velocity vectors for orbital tangents

### Instanced Rendering

- `THREE.InstancedMesh` with simple geometry (octahedron, 8-12 triangles)
- Instance attributes: position, color, scale
- Color by category:
  - Orange (`--pulse`): Space stations (ISS, Tiangong)
  - Blue (`--ice`): Science/weather
  - Gray (`--stardust`): Communication/Starlink
  - Amber (`--sol`): GPS/navigation
- Update instance matrices each frame from worker data

### Selection & Interaction

- GPU picking via color-ID render pass (or raycaster with spatial index)
- Hover: glow + name tooltip
- Click: camera focuses, InfoCard slides in

---

## UI Components

### HUD (bottom-left)

- Scale indicator: current altitude (e.g., "420 km")
- Zoom slider: vertical, optional/hideable
- Satellite count: live visible count
- JetBrains Mono, `--stardust` color

### InfoCard (right edge slide-in)

```
┌─────────────────────────────────────┐
│  ◉ ISS (ZARYA)               [×]   │
│  International Space Station        │
├─────────────────────────────────────┤
│  Altitude         420 km           │
│  Velocity         7.66 km/s        │
│  Orbital Period   92.9 min         │
│  Inclination      51.6°            │
├─────────────────────────────────────┤
│  NORAD ID         25544            │
│  Launched         1998             │
│  [ Track on CelesTrak → ]          │
└─────────────────────────────────────┘
```

- Background: `--cosmos` 80% opacity + backdrop blur
- Shadow: `0 24px 80px rgba(0,0,0,0.6)`
- Animation: 300ms ease-out slide + fade
- Close: × button, Escape, or click outside

### Observatory Dark Palette

```css
--void:      #05060a;   /* canvas */
--cosmos:    #0d1117;   /* card backgrounds */
--nebula:    #1c1f26;   /* hover states */
--starlight: #e6edf3;   /* primary text */
--stardust:  #7d8590;   /* secondary text */
--sol:       #f4a623;   /* warm accent */
--ice:       #58a6ff;   /* cool accent */
--pulse:     #f97316;   /* live indicators */
```

---

## Error Handling & Offline Support

### WebGPU Fallback

- Check `navigator.gpu` on init
- Fallback to WebGLRenderer, cap at 5K satellites
- Subtle "Running in compatibility mode" banner

### API Failures

- CelesTrak down: serve cached TLEs, show "Data from [date]"
- Cache empty + API down: Earth only, "Satellite data unavailable"
- Retry every 60 seconds silently

### Offline Mode

- Service worker caches app shell + textures
- IndexedDB holds TLE data
- Full functionality with cache
- "Offline" indicator when disconnected

### Loading Experience

- Starfield background renders instantly
- Earth appears in 1-2 seconds (2K texture first)
- Satellites stream in as worker initializes (~500ms)
- Higher-res textures lazy-load
- No spinners — progressive reveal

---

## Testing Strategy

### Unit Tests (Vitest)

- `LogScale.ts`: coordinate transforms, zoom clamping
- `celestrak.ts`: TLE parsing, cache logic
- `worker.ts`: SGP4 accuracy against known positions

### Integration Tests

- Renderer initializes on WebGPU and WebGL2
- Worker produces valid position arrays
- IndexedDB read/write cycle

### E2E Tests (Playwright)

- App loads, Earth visible within 3 seconds
- Scroll zooms smoothly
- Click satellite → InfoCard appears
- Offline mode functions

### Performance Targets

- 60fps with 10K satellites (GTX 1060 / M1)
- Initial load <3 seconds
- Memory <500MB

---

## Definition of Done

Phase 1 is complete when:

- [ ] Earth renders with day/night, atmosphere, clouds
- [ ] All ~10K CelesTrak satellites visible and updating real-time
- [ ] Click any satellite → see its info
- [ ] Works offline with cached data
- [ ] WebGPU + WebGL2 both functional
- [ ] Deployed to Cloudflare Pages
