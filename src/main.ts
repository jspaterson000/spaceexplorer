// src/main.ts
import './styles/main.css';
import * as THREE from 'three';
import { Renderer } from './engine/Renderer';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const renderer = new Renderer({ canvas });

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a); // --void

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1e12
);
camera.position.z = 2e7; // 20,000 km

// Test sphere
const geometry = new THREE.SphereGeometry(6_371_000, 32, 32);
const material = new THREE.MeshBasicMaterial({ color: 0x58a6ff, wireframe: true });
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

function animate() {
  requestAnimationFrame(animate);
  sphere.rotation.y += 0.001;
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.resize();
});

animate();
console.log('Renderer capabilities:', renderer.capabilities);
