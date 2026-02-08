# Cosmic Explorer

An interactive 3D visualization of the cosmos. Zoom seamlessly from Earth's surface — tracking 10,000+ real satellites — all the way out to the Milky Way galaxy.

**[Launch the Explorer &rarr;](https://spaceexplorer.io)**

## Scale Levels

Zoom through six progressively larger scales, each with unique visualizations:

| Scale | What You See |
|---|---|
| **Planet** | Earth with day/night shader, real-time satellite tracking, Moon orbit |
| **Solar System** | All 8 planets with orbital paths, Oort Cloud boundary |
| **Stellar** | 52 nearby stars within 20 light-years, colored by spectral type |
| **Local Bubble** | 500 ly supernova cavity with stellar clusters (Hyades, Pleiades, etc.) |
| **Orion Arm** | 10,000 ly spiral arm with nebulae and star-forming regions |
| **Milky Way** | Full 100,000 ly galaxy with 5 labeled spiral arms |

## Features

- **Real-Time Satellite Tracking** — Live TLE data from CelesTrak, propagated with `satellite.js` in a Web Worker. Click any satellite to see its name, altitude, velocity, and catalog link.
- **Time Simulation** — Play, pause, and step through time at 3 speeds (day/week/month per second). Watch planets orbit and satellites move.
- **Interactive Navigation** — Fly between celestial bodies with the Journey Dock. Click planets, stars, and nebulae labels to focus on them.
- **Mission Preview** — Walk through the Artemis II lunar mission phase-by-phase with an immersive full-screen overlay.
- **Smooth Transitions** — Cinematic fade-to-black transitions between scale levels with auto-rotating cameras at cosmic scales.

## Architecture

The app uses a **bridge pattern** to separate the Three.js rendering engine from the React UI:

```
Three.js Engine          React Components
  (canvas)                  (overlay)
       \                    /
        → CosmicActions ←      (dispatch commands)
        → CosmicStore   ←      (observable state)
```

- **Three.js** renders the full-screen 3D scene
- **React** renders UI overlays with `pointer-events: none` (interactive elements opt back in)
- **CosmicStore** is an observable state container read by React via `useSyncExternalStore`
- **CosmicActions** dispatches commands from React to the engine
- Labels use Three.js `CSS2DRenderer` (vanilla TS, not React) for performance

## Tech Stack

| Layer | Technology |
|---|---|
| 3D Engine | Three.js |
| UI Framework | React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 + shadcn/ui (Radix) |
| Animation | Framer Motion |
| Orbital Mechanics | satellite.js |
| Build | Vite 7 |
| Hosting | Cloudflare Pages |

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server (includes CelesTrak API proxy)
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## License

MIT
