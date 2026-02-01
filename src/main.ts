// src/main.ts
import './styles/main.css';
import * as THREE from 'three';
import { Renderer } from './engine/Renderer';
import { Camera } from './engine/Camera';
import { LogScale } from './engine/LogScale';
import { Earth } from './objects/Earth';
import { Moon } from './objects/Moon';
import { Sun } from './objects/Sun';
import { Satellites } from './objects/Satellites';
import { SatelliteWorker } from './data/SatelliteWorker';
import { fetchAllTLEs } from './data/celestrak';
import { TLECache } from './data/cache';
import { InfoCard } from './ui/InfoCard';
import { Navigation } from './ui/Navigation';
import { MissionPreview } from './ui/MissionPreview';
import { ScaleLevelState, ScaleLevel } from './state/ScaleLevel';
import { SimulatedTime } from './state/SimulatedTime';
import { ScaleLevelNav } from './ui/ScaleLevelNav';
import { TimeControls } from './ui/TimeControls';
import { OrbitalPath } from './objects/OrbitalPath';
import { ORBITAL_ELEMENTS } from './objects/planets/PlanetData';

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

// Navigation
const navigation = new Navigation(orbitCamera);
navigation.setMoonMesh(moon.mesh);
navigation.setSunMesh(sun.mesh);
navigation.setOnBodyChange((body) => {
  // Hide satellites when not viewing Earth (they're Earth satellites)
  satellites.mesh.visible = body === 'earth';
  // Track the last focused body for returning from orrery mode
  scaleLevelState.setLastFocusedBody(body);
});

// Mission Preview
const missionPreview = new MissionPreview(orbitCamera, scene, () => moon.mesh.position.clone());

// Scale navigation
const scaleNavContainer = document.getElementById('scale-nav')!;
const scaleLevelNav = new ScaleLevelNav(scaleNavContainer, scaleLevelState);

// Time controls
const timeControlsContainer = document.getElementById('time-controls')!;
const timeControls = new TimeControls(timeControlsContainer, simulatedTime);

// Handle scale level changes
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

// Satellites
const satellites = new Satellites(renderer.capabilities.maxSatellites);
satellites.addToScene(scene);

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

canvas.addEventListener('mousedown', (e) => {
  isDragging = true;
  lastMouse = { x: e.clientX, y: e.clientY };
  mouseDownPos = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const deltaX = e.clientX - lastMouse.x;
  const deltaY = e.clientY - lastMouse.y;
  // In Three.js Spherical: theta=azimuthal (horizontal), phi=polar (vertical)
  // So deltaX → theta, deltaY → phi
  orbitCamera.rotate(deltaX * 0.005, deltaY * 0.005);
  lastMouse = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('mouseup', (e) => {
  const dx = e.clientX - mouseDownPos.x;
  const dy = e.clientY - mouseDownPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Only treat as click if mouse didn't move much
  if (distance < CLICK_THRESHOLD) {
    handleSatelliteClick(e);
  }

  isDragging = false;
});

canvas.addEventListener('mouseleave', () => { isDragging = false; });

// Handle satellite selection via raycasting
function handleSatelliteClick(event: MouseEvent) {
  // Don't handle clicks while navigating
  if (navigation.isNavigating()) return;

  // Convert mouse position to normalized device coordinates (-1 to +1)
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, orbitCamera.camera);

  // Check for celestial body clicks first
  const bodyClicked = navigation.checkBodyClick(raycaster, {
    earth: earth.mesh,
    moon: moon.mesh,
    sun: sun.mesh,
  });

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

  // Update simulated time in orrery mode
  if (scaleLevelState.isOrreryMode()) {
    simulatedTime.update(deltaMs);
    timeControls.update();
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

window.addEventListener('resize', () => {
  orbitCamera.setAspect(window.innerWidth / window.innerHeight);
  renderer.resize();
});

orbitCamera.setAspect(window.innerWidth / window.innerHeight);
animate();
