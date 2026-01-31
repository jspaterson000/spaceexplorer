// src/main.ts
import './styles/main.css';
import * as THREE from 'three';
import { Renderer } from './engine/Renderer';
import { Camera } from './engine/Camera';
import { LogScale } from './engine/LogScale';
import { Earth } from './objects/Earth';

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

// Input handling
let isDragging = false;
let lastMouse = { x: 0, y: 0 };

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.1 : -0.1;
  orbitCamera.zoom(delta);
}, { passive: false });

canvas.addEventListener('mousedown', (e) => {
  isDragging = true;
  lastMouse = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const deltaX = e.clientX - lastMouse.x;
  const deltaY = e.clientY - lastMouse.y;
  orbitCamera.rotate(deltaY * 0.005, -deltaX * 0.005);
  lastMouse = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('mouseup', () => { isDragging = false; });
canvas.addEventListener('mouseleave', () => { isDragging = false; });

// HUD
const hud = document.getElementById('hud')!;
function updateHUD() {
  const altitude = orbitCamera.distanceMeters - 6_371_000;
  hud.innerHTML = `
    <div style="color: var(--stardust); font-size: 14px;">
      <div>Altitude: ${LogScale.formatDistance(Math.max(0, altitude))}</div>
      <div style="opacity: 0.6; font-size: 12px; margin-top: 4px;">Scroll to zoom • Drag to rotate</div>
    </div>
  `;
}

let startTime = performance.now();

function animate() {
  requestAnimationFrame(animate);
  const time = performance.now() - startTime;

  orbitCamera.update();
  earth.update(time);
  renderer.render(scene, orbitCamera.camera);
  updateHUD();
}

window.addEventListener('resize', () => {
  orbitCamera.setAspect(window.innerWidth / window.innerHeight);
  renderer.resize();
});

orbitCamera.setAspect(window.innerWidth / window.innerHeight);
animate();
