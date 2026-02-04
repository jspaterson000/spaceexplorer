// src/main.ts
import './styles/main.css';
import * as THREE from 'three';
import { Renderer } from './engine/Renderer';
import { Camera } from './engine/Camera';
import { LogScale } from './engine/LogScale';
import { Earth } from './objects/Earth';
import { Moon } from './objects/Moon';
import { Sun } from './objects/Sun';
import { Mercury, Venus, Mars } from './objects/planets/RockyPlanet';
import { Jupiter, Uranus, Neptune } from './objects/planets/GasGiant';
import { Saturn } from './objects/planets/Saturn';
import { Satellites } from './objects/Satellites';
import { SatelliteWorker } from './data/SatelliteWorker';
import { fetchAllTLEs } from './data/celestrak';
import { TLECache } from './data/cache';
import { InfoCard } from './ui/InfoCard';
import { Navigation, CelestialBody } from './ui/Navigation';
import { MissionPreview } from './ui/MissionPreview';
import { ScaleLevelState, ScaleLevel } from './state/ScaleLevel';
import { SimulatedTime } from './state/SimulatedTime';
import { ScaleLevelNav } from './ui/ScaleLevelNav';
import { TimeControls } from './ui/TimeControls';
import { OrbitalPath } from './objects/OrbitalPath';
import { OortCloud } from './objects/OortCloud';
import { PlanetLabels } from './ui/PlanetLabels';
import { ORBITAL_ELEMENTS } from './objects/planets/PlanetData';
import { Stars } from './objects/Stars';
import { StarLabels } from './ui/StarLabels';
import { getStarColor } from './data/NearbyStars';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const renderer = new Renderer({ canvas });
const orbitCamera = new Camera();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

// Add ambient light
const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);

// Earth (at origin in this visualization)
const earth = new Earth();
earth.addToScene(scene);

// Moon
const moon = new Moon();
moon.addToScene(scene);

// Sun
const sun = new Sun();
sun.addToScene(scene);

// Scale level state
const scaleLevelState = new ScaleLevelState();
const simulatedTime = new SimulatedTime();

// Orbital paths (visible in orrery mode)
const orbitalPaths = Object.entries(ORBITAL_ELEMENTS).map(([name, elements]) => {
  const path = new OrbitalPath(elements, 0x4488ff);
  path.addToScene(scene);
  return { name, path };
});

// Oort Cloud (visible in orrery mode)
const oortCloud = new OortCloud();
oortCloud.addToScene(scene);

// Planets
const mercury = new Mercury();
mercury.addToScene(scene);

const venus = new Venus();
venus.addToScene(scene);

const mars = new Mars();
mars.addToScene(scene);

const jupiter = new Jupiter();
jupiter.addToScene(scene);

const saturn = new Saturn();
saturn.addToScene(scene);

const uranus = new Uranus();
uranus.addToScene(scene);

const neptune = new Neptune();
neptune.addToScene(scene);

// Planet labels (visible in orrery mode)
const planetLabels = new PlanetLabels(document.body, scene);

// Define label colors matching planet appearances
const labelConfigs: Array<{ id: string; name: string; color: string; mesh: THREE.Object3D }> = [
  { id: 'sun', name: 'Sun', color: '#ffee88', mesh: sun.mesh },
  { id: 'mercury', name: 'Mercury', color: '#8c8c8c', mesh: mercury.mesh },
  { id: 'venus', name: 'Venus', color: '#e6c65c', mesh: venus.mesh },
  { id: 'earth', name: 'Earth', color: '#6b93d6', mesh: earth.mesh },
  { id: 'mars', name: 'Mars', color: '#c1440e', mesh: mars.mesh },
  { id: 'jupiter', name: 'Jupiter', color: '#d8ca9d', mesh: jupiter.mesh },
  { id: 'saturn', name: 'Saturn', color: '#ead6b8', mesh: saturn.mesh },
  { id: 'uranus', name: 'Uranus', color: '#b1e1e6', mesh: uranus.mesh },
  { id: 'neptune', name: 'Neptune', color: '#5b5ddf', mesh: neptune.mesh },
];

labelConfigs.forEach(({ id, name, color, mesh }) => {
  planetLabels.addLabel(id, {
    name,
    color,
    getPosition: () => mesh.position.clone(),
  });
});

// Add Oort Cloud label at the edge
planetLabels.addLabel('oort', {
  name: 'Oort Cloud',
  color: '#6688bb',
  getPosition: () => new THREE.Vector3(
    Math.sqrt(65) * 149_597_870_700, // Position at edge of cloud
    0,
    0
  ),
});

// Stars (visible in stellar mode)
const stars = new Stars();
stars.addToScene(scene);

// Star labels
const starLabels = new StarLabels(document.body, scene);

// Add labels for all stars (notable ones show always, others on hover)
stars.getStars().forEach((star, index) => {
  const position = stars.getStarPosition(index);
  const color = getStarColor(star.spectralType);
  starLabels.addLabel(star, position, color, star.notable);
});

// Navigation
const navigation = new Navigation(orbitCamera);

// Register all celestial body meshes with navigation
navigation.setMoonMesh(moon.mesh);
navigation.setSunMesh(sun.mesh);
navigation.setMercuryMesh(mercury.mesh);
navigation.setVenusMesh(venus.mesh);
navigation.setMarsMesh(mars.mesh);
navigation.setJupiterMesh(jupiter.mesh);
navigation.setSaturnMesh(saturn.mesh);
navigation.setUranusMesh(uranus.mesh);
navigation.setNeptuneMesh(neptune.mesh);
navigation.setOnBodyChange((body) => {
  // Hide satellites when not viewing Earth (they're Earth satellites)
  satellites.mesh.visible = body === 'earth';
  // Track the last focused body for returning from orrery mode
  scaleLevelState.setLastFocusedBody(body);
});

// Scale navigation
const scaleNavContainer = document.getElementById('scale-nav')!;
const scaleLevelNav = new ScaleLevelNav(scaleNavContainer, scaleLevelState);

// Time controls
const timeControlsContainer = document.getElementById('time-controls')!;
const timeControls = new TimeControls(timeControlsContainer, simulatedTime);

// Title card elements for orrery mode
const titleElement = document.querySelector('#title-card .title') as HTMLElement;
const factsElement = document.getElementById('body-facts')!;
const statsElement = document.querySelector('#title-card .stats') as HTMLElement;

// Stellar facts template
const stellarFactsTemplate = document.getElementById('stellar-facts-template') as HTMLTemplateElement;

// Update title card based on scale level
function updateTitleCardForLevel(level: ScaleLevel): void {
  if (level === ScaleLevel.Planet) {
    // Restore planet-specific info from Navigation's current body
    navigation.refreshTitleCard();
    statsElement.classList.remove('hidden');
  } else if (level === ScaleLevel.SolarSystem) {
    titleElement.textContent = 'Solar System';
    factsElement.innerHTML = `
      <div class="fact-row"><span class="fact-label">Type</span><span class="fact-value">Planetary System</span></div>
      <div class="fact-row"><span class="fact-label">Age</span><span class="fact-value">4.6 billion years</span></div>
      <div class="fact-row"><span class="fact-label">Planets</span><span class="fact-value">8</span></div>
      <div class="fact-row"><span class="fact-label">Known Moons</span><span class="fact-value">290+</span></div>
      <div class="fact-row"><span class="fact-label">Diameter</span><span class="fact-value">~30 AU</span></div>
      <div class="fact-highlight">One of ~100 billion planetary systems in our galaxy</div>
    `;
    statsElement.classList.add('hidden');
  } else if (level === ScaleLevel.Stellar) {
    titleElement.textContent = 'Stellar Neighborhood';
    // Use template content for stellar facts
    if (stellarFactsTemplate) {
      factsElement.innerHTML = stellarFactsTemplate.innerHTML;
    }
    statsElement.classList.add('hidden');
  } else if (level === ScaleLevel.LocalBubble) {
    titleElement.textContent = 'Local Bubble';
    const localBubbleFactsTemplate = document.getElementById('local-bubble-facts-template') as HTMLTemplateElement;
    if (localBubbleFactsTemplate) {
      factsElement.innerHTML = localBubbleFactsTemplate.innerHTML;
    }
    statsElement.classList.add('hidden');
  }
}

// Journey dock element for hiding in stellar mode
const journeyDock = document.getElementById('journey-dock')!;

// Transition overlay for fade-to-black between scale levels
const overlay = document.getElementById('transition-overlay')!;
let transitionInProgress = false;

// Visual scale level tracks what the animation loop should use.
// Updated only when the screen is fully black, preventing jolts.
let visualScaleLevel: ScaleLevel = ScaleLevel.Planet;

/**
 * Fade-to-black transition between scale levels.
 * 1. Fade to black (~1s)
 * 2. While blacked out: run setup() to swap all scene state instantly
 * 3. Fade from black (~1s)
 * 4. After visible: run afterReveal() for label entrance animations
 */
function fadeTransition(setup: () => void, afterReveal?: () => void): void {
  if (transitionInProgress) return;
  transitionInProgress = true;

  overlay.classList.add('active');
  // Wait for fade to fully complete before swapping scene state
  const onBlack = () => {
    overlay.removeEventListener('transitionend', onBlack);
    setup();
    overlay.classList.remove('active');
    const onRevealed = () => {
      overlay.removeEventListener('transitionend', onRevealed);
      afterReveal?.();
      transitionInProgress = false;
    };
    overlay.addEventListener('transitionend', onRevealed);
  };
  overlay.addEventListener('transitionend', onBlack);
}

// Handle scale level changes
// Note: ScaleLevelNav updates scaleLevelState immediately on click,
// but the animation loop uses scaleLevelState to decide how to update
// planet positions. We must defer the state change until the screen is
// black, otherwise planets jolt to new positions while still visible.
scaleLevelNav.setOnLevelChange((level) => {
  const isOrrery = level === ScaleLevel.SolarSystem;
  const isStellar = level === ScaleLevel.Stellar;
  const isPlanet = level === ScaleLevel.Planet;

  fadeTransition(
    // Setup: swap everything while screen is black
    () => {
      // Update visual level now that screen is black
      visualScaleLevel = level;

      // Set orrery mode on Sun (moves to origin, scales up)
      sun.setOrreryMode(isOrrery || isStellar);

      // Set orrery mode on all planets
      earth.setOrreryMode(isOrrery || isStellar);
      mercury.setOrreryMode(isOrrery || isStellar);
      venus.setOrreryMode(isOrrery || isStellar);
      mars.setOrreryMode(isOrrery || isStellar);
      jupiter.setOrreryMode(isOrrery || isStellar);
      saturn.setOrreryMode(isOrrery || isStellar);
      uranus.setOrreryMode(isOrrery || isStellar);
      neptune.setOrreryMode(isOrrery || isStellar);

      // Update title card
      updateTitleCardForLevel(level);

      if (isOrrery) {
        // ========================================
        // Planet → Solar System  OR  Stellar → Solar System
        // ========================================
        orbitCamera.setPositionImmediate(12.2, Math.PI / 2.5, new THREE.Vector3(0, 0, 0), 0);

        // Show solar system objects
        sun.mesh.visible = true;
        earth.mesh.visible = true;
        earth.atmosphere.visible = true;
        mercury.mesh.visible = true;
        venus.mesh.visible = true;
        mars.mesh.visible = true;
        jupiter.mesh.visible = true;
        saturn.mesh.visible = true;
        uranus.mesh.visible = true;
        neptune.mesh.visible = true;

        // Hide moon and satellites (too small at this scale)
        moon.mesh.visible = false;
        satellites.mesh.visible = false;

        // Show orbital paths and Oort Cloud
        orbitalPaths.forEach(({ path }) => {
          path.setVisible(true);
          path.setOpacityImmediate(1);
        });
        oortCloud.setVisible(true);
        oortCloud.setOpacityImmediate(1);

        // Hide stellar elements
        stars.setVisible(false);
        starLabels.setVisible(false);

        // Show journey dock, time controls
        journeyDock.style.display = '';
        timeControls.show();

      } else if (isStellar) {
        // ========================================
        // Solar System → Stellar
        // Start close, zoom out after fade reveals
        // ========================================
        orbitCamera.setPositionImmediate(11.3, Math.PI / 4, new THREE.Vector3(0, 0, 0));

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

        // Show stars at full opacity
        stars.setVisible(true);
        stars.setOpacity(1);

        // Hide journey dock and time controls
        journeyDock.style.display = 'none';
        timeControls.hide();

        // Enable auto-rotation for gentle drift
        orbitCamera.setAutoRotate(true);

        // Start zoom out now (during fade-in) so it's already moving when revealed
        orbitCamera.animateZoomTo(11.9);

      } else if (isPlanet) {
        // ========================================
        // Solar System/Stellar → Planet
        // ========================================
        const lastBody = scaleLevelState.lastFocusedBody;
        const bodyConfig = { earth: 7.5, moon: 7.5, sun: 9.8, mercury: 8.0, venus: 8.0, mars: 8.0, jupiter: 8.6, saturn: 8.7, uranus: 8.5, neptune: 8.5 };
        const zoom = bodyConfig[lastBody as keyof typeof bodyConfig] || 7.5;

        // Reset Earth to origin for normal Earth-centric view
        earth.resetPosition();

        orbitCamera.setPositionImmediate(zoom, Math.PI / 2.2, new THREE.Vector3(0, 0, 0));

        // Show all solar system objects in normal mode
        sun.mesh.visible = true;
        earth.mesh.visible = true;
        earth.atmosphere.visible = true;
        mercury.mesh.visible = true;
        venus.mesh.visible = true;
        mars.mesh.visible = true;
        jupiter.mesh.visible = true;
        saturn.mesh.visible = true;
        uranus.mesh.visible = true;
        neptune.mesh.visible = true;
        moon.mesh.visible = true;
        satellites.mesh.visible = satellitesEnabled;

        // Hide all stellar/system overlays
        stars.setVisible(false);
        starLabels.setVisible(false);
        orbitalPaths.forEach(({ path }) => path.setVisible(false));
        oortCloud.setVisible(false);
        planetLabels.setVisible(false);

        // Show journey dock, hide time controls
        journeyDock.style.display = '';
        timeControls.hide();
        simulatedTime.reset();
      }
    },
    // After reveal: label entrance animations
    () => {
      if (isOrrery) {
        planetLabels.setVisible(true);
      } else if (isStellar) {
        // Show star labels after zoom completes (zoom started in setup)
        setTimeout(() => {
          starLabels.setVisible(true);
        }, 3000);
      } else if (isPlanet) {
        navigation.refreshTitleCard();
      }
    }
  );

});

// Satellites
const satellites = new Satellites(renderer.capabilities.maxSatellites);
satellites.addToScene(scene);
let satellitesEnabled = true;
let currentBody: CelestialBody = 'earth';

// Settings panel
const settingsBtn = document.getElementById('settings-btn')!;
const settingsPanel = document.getElementById('settings-panel')!;
const settingsContainer = document.getElementById('settings-container')!;
const satelliteToggle = document.getElementById('satellite-toggle') as HTMLInputElement;
const satelliteRow = document.getElementById('stat-satellites-row')!;

settingsBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  settingsPanel.classList.toggle('hidden');
});

// Close settings when clicking outside
document.addEventListener('click', (e) => {
  if (!settingsContainer.contains(e.target as Node)) {
    settingsPanel.classList.add('hidden');
  }
});

satelliteToggle.addEventListener('change', () => {
  satellitesEnabled = satelliteToggle.checked;
  satellites.mesh.visible = satellitesEnabled && currentBody === 'earth';
});

navigation.setOnBodyChange((body) => {
  currentBody = body;
  // Hide satellites when not viewing Earth (they're Earth satellites)
  satellites.mesh.visible = satellitesEnabled && body === 'earth';
  // Hide satellite stats row when not viewing Earth
  satelliteRow.classList.toggle('hidden', body !== 'earth');
});

// Mission Preview
const missionPreview = new MissionPreview(orbitCamera, scene, () => moon.mesh.position.clone(), satellites.mesh);

// Artemis mission button in menu
const artemisBtn = document.getElementById('artemis-btn')!;
artemisBtn.addEventListener('click', () => {
  settingsPanel.classList.add('hidden');
  missionPreview.start();
});

// Worker for orbital propagation
const worker = new SatelliteWorker();
worker.onPositions((positions) => {
  satellites.updatePositions(positions);
  latestPositions = positions;
});

// Cache
const cache = new TLECache();

// InfoCard
const infoCardContainer = document.getElementById('info-card')!;
const infoCard = new InfoCard(infoCardContainer);

// Raycaster for satellite selection
const raycaster = new THREE.Raycaster();
raycaster.params.Points = { threshold: 200000 }; // 200km threshold for point picking
const mouse = new THREE.Vector2();
let selectedIndex: number | null = null;
let latestPositions: Float32Array | null = null;

// Clear selection when card is closed
infoCard.onClose(() => {
  selectedIndex = null;
});

// Load satellite data
async function loadSatellites() {
  console.log('[Satellites] Starting load...');

  // Try cache first
  let tles = await cache.getAll();
  console.log(`[Satellites] Cache returned ${tles.length} TLEs`);

  if (tles.length > 0) {
    satellites.setTLEs(tles);
    const count = await worker.init(tles);
    console.log(`[Satellites] Loaded ${count} satellites from cache`);
  }

  // Fetch fresh data if stale or empty
  const isStale = await cache.isStale(24 * 60 * 60 * 1000);
  console.log(`[Satellites] Cache stale: ${isStale}, tles.length: ${tles.length}`);

  if (isStale || tles.length === 0) {
    try {
      console.log('[Satellites] Fetching from CelesTrak...');
      tles = await fetchAllTLEs();
      console.log(`[Satellites] Fetched ${tles.length} TLEs from CelesTrak`);

      if (tles.length > 0) {
        await cache.store(tles);
        satellites.setTLEs(tles);
        console.log(`[Satellites] Set ${satellites.count} satellites on mesh`);
        const count = await worker.init(tles);
        console.log(`[Satellites] Worker initialized with ${count} satellites`);
      } else {
        console.error('[Satellites] No TLEs returned from fetchAllTLEs!');
      }
    } catch (error) {
      console.error('[Satellites] Failed to fetch TLEs:', error);
    }
  }

  console.log(`[Satellites] Final count: ${satellites.count}`);
}

loadSatellites();

// Input handling
let isDragging = false;
let lastMouse = { x: 0, y: 0 };
let mouseDownPos = { x: 0, y: 0 };
const CLICK_THRESHOLD = 5; // pixels

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  // Normalize delta to handle different scroll speeds/devices
  const normalizedDelta = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 100) / 100;
  const delta = normalizedDelta * 0.03; // Much smaller zoom step
  orbitCamera.zoom(delta);
}, { passive: false });

canvas.addEventListener('pointerdown', (e) => {
  isDragging = true;
  lastMouse = { x: e.clientX, y: e.clientY };
  mouseDownPos = { x: e.clientX, y: e.clientY };
  // Capture pointer to receive events even when moving outside canvas
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', (e) => {
  if (!isDragging) return;
  const deltaX = e.clientX - lastMouse.x;
  const deltaY = e.clientY - lastMouse.y;
  // In Three.js Spherical: theta=azimuthal (horizontal), phi=polar (vertical)
  // So deltaX → theta, deltaY → phi
  orbitCamera.rotate(deltaX * 0.005, deltaY * 0.005);
  lastMouse = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('pointerup', (e) => {
  const dx = e.clientX - mouseDownPos.x;
  const dy = e.clientY - mouseDownPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Only treat as click if mouse didn't move much
  if (distance < CLICK_THRESHOLD) {
    handleSatelliteClick(e);
  }

  isDragging = false;
  canvas.releasePointerCapture(e.pointerId);
});

canvas.addEventListener('pointercancel', (e) => {
  isDragging = false;
  canvas.releasePointerCapture(e.pointerId);
});

// Star hover detection raycaster (needs larger threshold for stellar distances)
const starRaycaster = new THREE.Raycaster();
starRaycaster.params.Points = { threshold: 5e10 }; // Threshold for stellar scale

// Handle star hover for showing labels
canvas.addEventListener('mousemove', (e) => {
  // Only handle hover in stellar mode
  if (!scaleLevelState.isStellarMode()) {
    return;
  }

  // Convert mouse position to normalized device coordinates (-1 to +1)
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  starRaycaster.setFromCamera(mouse, orbitCamera.camera);
  const intersects = starRaycaster.intersectObject(stars.mesh);

  if (intersects.length > 0 && intersects[0].index !== undefined) {
    const starIndex = intersects[0].index;
    const starData = stars.getStars()[starIndex];
    if (starData && !starData.notable) {
      starLabels.showHoverLabel(starData.name);
    }
  } else {
    starLabels.hideHoverLabel();
  }
});

// All celestial body meshes for raycasting
const celestialMeshes: Record<string, THREE.Object3D> = {
  earth: earth.mesh,
  moon: moon.mesh,
  sun: sun.mesh,
  mercury: mercury.mesh,
  venus: venus.mesh,
  mars: mars.mesh,
  jupiter: jupiter.mesh,
  saturn: saturn.mesh,
  uranus: uranus.mesh,
  neptune: neptune.mesh,
};

// Handle satellite selection via raycasting
function handleSatelliteClick(event: MouseEvent) {
  // Don't handle clicks while navigating
  if (navigation.isNavigating()) return;

  // Convert mouse position to normalized device coordinates (-1 to +1)
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, orbitCamera.camera);

  // Check for celestial body clicks first
  const bodyClicked = navigation.checkBodyClick(raycaster, celestialMeshes);

  if (bodyClicked) {
    navigation.flyTo(bodyClicked);
    return;
  }

  const intersects = raycaster.intersectObject(satellites.mesh);

  if (intersects.length > 0) {
    // For Points, we get 'index' instead of 'instanceId'
    const pointIndex = intersects[0].index;

    if (pointIndex !== undefined) {
      const tle = satellites.getTLEAtIndex(pointIndex);

      if (tle && latestPositions) {
        selectedIndex = pointIndex;

        // Get position and velocity from latest positions
        const x = latestPositions[pointIndex * 6 + 0];
        const y = latestPositions[pointIndex * 6 + 1];
        const z = latestPositions[pointIndex * 6 + 2];
        const vx = latestPositions[pointIndex * 6 + 3];
        const vy = latestPositions[pointIndex * 6 + 4];
        const vz = latestPositions[pointIndex * 6 + 5];

        // Calculate altitude (distance from center minus Earth radius)
        const EARTH_RADIUS = 6_371_000; // meters
        const distanceFromCenter = Math.sqrt(x * x + y * y + z * z);
        const altitude = distanceFromCenter - EARTH_RADIUS;

        // Calculate velocity magnitude
        const velocity = Math.sqrt(vx * vx + vy * vy + vz * vz);

        infoCard.show({
          tle,
          altitude,
          velocity,
        });
      }
    }
  } else {
    // Clicked on empty space - hide card
    infoCard.hide();
  }
}

// Stats display
const statSatellites = document.getElementById('stat-satellites')!;
const statAltitude = document.getElementById('stat-altitude')!;

function updateStats() {
  const altitude = orbitCamera.distanceMeters - 6_371_000;
  statSatellites.textContent = satellites.count.toLocaleString();
  statAltitude.textContent = LogScale.formatDistance(Math.max(0, altitude));
}

let startTime = performance.now();
let lastFrameTime = performance.now();

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const deltaMs = now - lastFrameTime;
  lastFrameTime = now;

  const time = now - startTime;

  // Use visual scale level for animation loop (not scaleLevelState which changes immediately on click)
  const visualOrrery = visualScaleLevel === ScaleLevel.SolarSystem || visualScaleLevel === ScaleLevel.Stellar;

  // Update simulated time in orrery mode
  if (visualOrrery) {
    simulatedTime.update(deltaMs);
    timeControls.update();
  }

  orbitCamera.update();
  navigation.update();
  missionPreview.update();
  earth.update(time);

  // Use real time or simulated time for moon
  const dateForMoon = visualOrrery ? simulatedTime.getDate() : new Date();
  if (visualOrrery) {
    // In orrery mode, Moon follows Earth's position
    moon.updateOrreryPosition(dateForMoon, earth.mesh.position);
  } else {
    moon.updatePosition(dateForMoon);
  }
  moon.setSunDirection(earth.sunDirection);

  // Update planet positions - use simulated time and orrery positions in orrery mode
  const dateForPlanets = visualOrrery ? simulatedTime.getDate() : new Date();
  const isOrrery = visualOrrery;

  if (isOrrery) {
    // In orrery mode, use heliocentric positions with sqrt scaling
    earth.updateOrreryPosition(dateForPlanets);
    mercury.updateOrreryPosition(dateForPlanets);
    venus.updateOrreryPosition(dateForPlanets);
    mars.updateOrreryPosition(dateForPlanets);
    jupiter.updateOrreryPosition(dateForPlanets);
    saturn.updateOrreryPosition(dateForPlanets);
    uranus.updateOrreryPosition(dateForPlanets);
    neptune.updateOrreryPosition(dateForPlanets);
  } else {
    // In normal mode, use Earth-centric compressed positions
    mercury.updatePosition(dateForPlanets);
    venus.updatePosition(dateForPlanets);
    mars.updatePosition(dateForPlanets);
    jupiter.updatePosition(dateForPlanets);
    saturn.updatePosition(dateForPlanets);
    uranus.updatePosition(dateForPlanets);
    neptune.updatePosition(dateForPlanets);
  }

  // Update gas giant animations
  jupiter.update(time);
  saturn.update(time);
  uranus.update(time);
  neptune.update(time);

  // Update opacity transitions for orbital paths and Oort Cloud
  orbitalPaths.forEach(({ path }) => path.updateOpacity(0.06));
  oortCloud.updateOpacity(0.06);

  // Request satellite positions with real time
  worker.requestPositions(Date.now());

  renderer.render(scene, orbitCamera.camera);

  // Update and render planet labels (orrery mode)
  planetLabels.update();
  planetLabels.render(orbitCamera.camera);

  // Render star labels (stellar mode)
  starLabels.render(orbitCamera.camera);

  updateStats();
}

window.addEventListener('resize', () => {
  orbitCamera.setAspect(window.innerWidth / window.innerHeight);
  renderer.resize();
});

orbitCamera.setAspect(window.innerWidth / window.innerHeight);
animate();
