// src/main.ts
import './styles/main.css';
import * as THREE from 'three';
import { Renderer } from './engine/Renderer';
import { Camera } from './engine/Camera';
import { LogScale } from './engine/LogScale';
import { Earth } from './objects/Earth';
import { Satellites } from './objects/Satellites';
import { SatelliteWorker } from './data/SatelliteWorker';
import { fetchAllTLEs } from './data/celestrak';
import { TLECache } from './data/cache';
import { InfoCard } from './ui/InfoCard';

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
raycaster.params.Points = { threshold: 100000 }; // 100km threshold
const mouse = new THREE.Vector2();
let selectedIndex: number | null = null;
let latestPositions: Float32Array | null = null;

// Clear selection when card is closed
infoCard.onClose(() => {
  selectedIndex = null;
});

// Load satellite data
async function loadSatellites() {
  const hud = document.getElementById('hud')!;

  // Try cache first
  let tles = await cache.getAll();

  if (tles.length > 0) {
    satellites.setTLEs(tles);
    const count = await worker.init(tles);
    console.log(`Loaded ${count} satellites from cache`);
  }

  // Fetch fresh data if stale or empty
  if (await cache.isStale(24 * 60 * 60 * 1000) || tles.length === 0) {
    try {
      hud.innerHTML = '<div style="color: var(--stardust);">Loading satellite data...</div>';
      tles = await fetchAllTLEs();

      if (tles.length > 0) {
        await cache.store(tles);
        satellites.setTLEs(tles);
        const count = await worker.init(tles);
        console.log(`Loaded ${count} satellites from CelesTrak`);
      }
    } catch (error) {
      console.error('Failed to fetch TLEs:', error);
    }
  }
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
  // deltaX controls horizontal rotation (phi), deltaY controls vertical tilt (theta)
  orbitCamera.rotate(-deltaY * 0.005, deltaX * 0.005);
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
  // Convert mouse position to normalized device coordinates (-1 to +1)
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, orbitCamera.camera);

  const intersects = raycaster.intersectObject(satellites.mesh);

  if (intersects.length > 0) {
    const instanceId = intersects[0].instanceId;

    if (instanceId !== undefined) {
      const tle = satellites.getTLEAtIndex(instanceId);

      if (tle && latestPositions) {
        selectedIndex = instanceId;

        // Get position and velocity from latest positions
        const x = latestPositions[instanceId * 6 + 0];
        const y = latestPositions[instanceId * 6 + 1];
        const z = latestPositions[instanceId * 6 + 2];
        const vx = latestPositions[instanceId * 6 + 3];
        const vy = latestPositions[instanceId * 6 + 4];
        const vz = latestPositions[instanceId * 6 + 5];

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

// HUD
const hud = document.getElementById('hud')!;
function updateHUD() {
  const altitude = orbitCamera.distanceMeters - 6_371_000;
  hud.innerHTML = `
    <div style="color: var(--stardust); font-size: 14px;">
      <div style="color: var(--starlight);">${satellites.count.toLocaleString()} satellites</div>
      <div style="margin-top: 8px;">Altitude: ${LogScale.formatDistance(Math.max(0, altitude))}</div>
      <div style="opacity: 0.6; font-size: 12px; margin-top: 4px;">Scroll to zoom • Drag to rotate</div>
    </div>
  `;
}

let startTime = performance.now();

function animate() {
  requestAnimationFrame(animate);
  const time = performance.now() - startTime;
  const now = Date.now();

  orbitCamera.update();
  earth.update(time);

  // Request new satellite positions
  worker.requestPositions(now);

  renderer.render(scene, orbitCamera.camera);
  updateHUD();
}

window.addEventListener('resize', () => {
  orbitCamera.setAspect(window.innerWidth / window.innerHeight);
  renderer.resize();
});

orbitCamera.setAspect(window.innerWidth / window.innerHeight);
animate();
