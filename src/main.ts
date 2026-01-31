// src/main.ts
import './styles/main.css';
import * as THREE from 'three';
import { Renderer } from './engine/Renderer';
import { Camera } from './engine/Camera';
import { LogScale } from './engine/LogScale';
import { Earth } from './objects/Earth';
import { Moon } from './objects/Moon';
import { Satellites } from './objects/Satellites';
import { SatelliteWorker } from './data/SatelliteWorker';
import { fetchAllTLEs } from './data/celestrak';
import { TLECache } from './data/cache';
import { InfoCard } from './ui/InfoCard';
import { Navigation } from './ui/Navigation';

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

// Navigation
const navigation = new Navigation(orbitCamera);
navigation.setMoonMesh(moon.mesh);
navigation.setOnBodyChange((body) => {
  // Hide satellites when viewing Moon (they're Earth satellites)
  satellites.mesh.visible = body === 'earth';
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

function animate() {
  requestAnimationFrame(animate);
  const time = performance.now() - startTime;
  const now = Date.now();

  orbitCamera.update();
  navigation.update();
  earth.update(time);

  // Sync Moon with Earth's sun direction and update orbital position
  moon.updatePosition();
  moon.setSunDirection(earth.sunDirection);

  // Request new satellite positions
  worker.requestPositions(now);

  renderer.render(scene, orbitCamera.camera);
  updateStats();
}

window.addEventListener('resize', () => {
  orbitCamera.setAspect(window.innerWidth / window.innerHeight);
  renderer.resize();
});

orbitCamera.setAspect(window.innerWidth / window.innerHeight);
animate();
