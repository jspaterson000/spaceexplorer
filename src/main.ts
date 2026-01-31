// src/main.ts
import './styles/main.css';
import * as THREE from 'three';
import { Renderer } from './engine/Renderer';
import { Camera } from './engine/Camera';
import { LogScale } from './engine/LogScale';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const renderer = new Renderer({ canvas });
const orbitCamera = new Camera();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

// Earth placeholder
const geometry = new THREE.SphereGeometry(6_371_000, 64, 64);
const material = new THREE.MeshBasicMaterial({ color: 0x58a6ff, wireframe: true });
const earth = new THREE.Mesh(geometry, material);
scene.add(earth);

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
      <div style="opacity: 0.6; font-size: 12px;">Scroll to zoom • Drag to rotate</div>
    </div>
  `;
}

function animate() {
  requestAnimationFrame(animate);
  orbitCamera.update();
  earth.rotation.y += 0.0005;
  renderer.render(scene, orbitCamera.camera);
  updateHUD();
}

window.addEventListener('resize', () => {
  orbitCamera.setAspect(window.innerWidth / window.innerHeight);
  renderer.resize();
});

orbitCamera.setAspect(window.innerWidth / window.innerHeight);
animate();
