// src/ui/MissionPreview.ts
import * as THREE from 'three';
import { Camera } from '../engine/Camera';

interface MissionPhase {
  name: string;
  subtitle: string;
  description: string;
  duration: number; // ms
  cameraTarget: () => THREE.Vector3;
  cameraZoom: number;
  progress: number; // 0-1 position along trajectory
}

export class MissionPreview {
  private camera: Camera;
  private container: HTMLElement;
  private overlay: HTMLElement;
  private isPlaying = false;
  private currentPhaseIndex = 0;
  private phaseStartTime = 0;
  private trajectoryLine: THREE.Line | null = null;
  private scene: THREE.Scene;
  private moonPosition: () => THREE.Vector3;

  private phases: MissionPhase[];

  // Trajectory points (will be calculated based on Earth-Moon positions)
  private trajectoryPoints: THREE.Vector3[] = [];

  constructor(camera: Camera, scene: THREE.Scene, moonPosition: () => THREE.Vector3) {
    this.camera = camera;
    this.scene = scene;
    this.moonPosition = moonPosition;

    // Create container
    this.container = document.createElement('div');
    this.container.id = 'mission-preview';
    this.container.innerHTML = `
      <button class="mission-start-btn">
        <span class="mission-icon">◈</span>
        <span class="mission-label">Artemis II</span>
      </button>
    `;
    document.body.appendChild(this.container);

    // Create overlay (hidden initially)
    this.overlay = document.createElement('div');
    this.overlay.id = 'mission-overlay';
    this.overlay.className = 'hidden';
    this.overlay.innerHTML = `
      <div class="mission-header">
        <div class="mission-badge">NASA ARTEMIS PROGRAM</div>
        <h1 class="mission-title">Artemis II</h1>
        <p class="mission-tagline">Humanity's Return to the Moon</p>
      </div>
      <div class="mission-phase">
        <div class="phase-number">01</div>
        <h2 class="phase-name">Launch</h2>
        <p class="phase-subtitle">Kennedy Space Center</p>
        <p class="phase-description">The Space Launch System rocket carries Orion and its crew of four astronauts into Earth orbit.</p>
      </div>
      <div class="mission-progress">
        <div class="progress-bar"><div class="progress-fill"></div></div>
        <div class="progress-stats">
          <span class="stat"><strong>Distance:</strong> <span id="mission-distance">0 km</span></span>
          <span class="stat"><strong>Day:</strong> <span id="mission-day">1</span> of 10</span>
        </div>
      </div>
      <div class="mission-controls">
        <button class="control-btn" id="mission-close">✕ Exit Preview</button>
      </div>
    `;
    document.body.appendChild(this.overlay);

    // Define mission phases
    this.phases = [
      {
        name: 'Launch',
        subtitle: 'Kennedy Space Center, Florida',
        description: 'The Space Launch System, the most powerful rocket ever built, carries Orion and four astronauts into Earth orbit.',
        duration: 6000,
        cameraTarget: () => new THREE.Vector3(0, 0, 0),
        cameraZoom: 7.2,
        progress: 0,
      },
      {
        name: 'Earth Orbit',
        subtitle: 'Systems Check',
        description: 'Orion completes up to two orbits of Earth while the crew verifies spacecraft systems before the journey to the Moon.',
        duration: 5000,
        cameraTarget: () => new THREE.Vector3(0, 0, 0),
        cameraZoom: 7.5,
        progress: 0.05,
      },
      {
        name: 'Trans-Lunar Injection',
        subtitle: 'Leaving Earth Behind',
        description: 'The Interim Cryogenic Propulsion Stage fires, accelerating Orion to 24,500 mph—fast enough to escape Earth\'s gravity.',
        duration: 6000,
        cameraTarget: () => new THREE.Vector3(0, 0, 0),
        cameraZoom: 8.2,
        progress: 0.15,
      },
      {
        name: 'Outbound Transit',
        subtitle: '4 Days to the Moon',
        description: 'The crew travels through the vast emptiness between Earth and Moon, farther from home than any humans in history.',
        duration: 7000,
        cameraTarget: () => this.getTrajectoryPoint(0.4),
        cameraZoom: 8.8,
        progress: 0.4,
      },
      {
        name: 'Lunar Flyby',
        subtitle: 'The Far Side',
        description: 'Orion swings around the Moon at just 6,400 miles altitude, giving the crew breathtaking views of the lunar far side.',
        duration: 8000,
        cameraTarget: () => this.moonPosition(),
        cameraZoom: 7.5,
        progress: 0.6,
      },
      {
        name: 'Return Transit',
        subtitle: 'Homeward Bound',
        description: 'Using the Moon\'s gravity, Orion slingshots back toward Earth on a free-return trajectory.',
        duration: 6000,
        cameraTarget: () => this.getTrajectoryPoint(0.8),
        cameraZoom: 8.5,
        progress: 0.8,
      },
      {
        name: 'Earth Return',
        subtitle: 'Splashdown',
        description: 'After 10 days in space, Orion re-enters Earth\'s atmosphere at 25,000 mph and splashes down in the Pacific Ocean.',
        duration: 6000,
        cameraTarget: () => new THREE.Vector3(0, 0, 0),
        cameraZoom: 7.3,
        progress: 1.0,
      },
    ];

    this.setupEventListeners();
    this.createTrajectory();
  }

  private setupEventListeners(): void {
    const startBtn = this.container.querySelector('.mission-start-btn');
    startBtn?.addEventListener('click', () => this.start());

    const closeBtn = this.overlay.querySelector('#mission-close');
    closeBtn?.addEventListener('click', () => this.stop());
  }

  private createTrajectory(): void {
    // Create a free-return trajectory curve
    this.updateTrajectoryPoints();
  }

  private updateTrajectoryPoints(): void {
    const moonPos = this.moonPosition();
    const moonDist = moonPos.length();
    const moonDir = moonPos.clone().normalize();

    // Create perpendicular vectors for the trajectory plane
    const up = new THREE.Vector3(0, 1, 0);
    const perpendicular = new THREE.Vector3().crossVectors(moonDir, up).normalize();

    const points: THREE.Vector3[] = [];
    const EARTH_RADIUS = 6_371_000;
    const MOON_FLYBY_ALTITUDE = 10_000_000; // Close flyby distance

    // Phase 1: Earth parking orbit (small circle near Earth)
    const parkingOrbitRadius = EARTH_RADIUS * 1.5;
    for (let i = 0; i <= 8; i++) {
      const angle = (i / 8) * Math.PI * 0.4 - Math.PI * 0.2;
      const x = Math.cos(angle) * parkingOrbitRadius;
      const z = Math.sin(angle) * parkingOrbitRadius;
      points.push(new THREE.Vector3(x, 0, z));
    }

    // Phase 2: Outbound trajectory - curve out toward Moon
    const startPoint = points[points.length - 1].clone();
    for (let i = 1; i <= 30; i++) {
      const t = i / 30;
      // Bezier curve from Earth to Moon with outward arc
      const arcHeight = moonDist * 0.15 * Math.sin(t * Math.PI);
      const pos = new THREE.Vector3().lerpVectors(
        startPoint,
        moonPos,
        t
      );
      // Add arc perpendicular to the Earth-Moon line
      pos.add(perpendicular.clone().multiplyScalar(arcHeight));
      pos.y += Math.sin(t * Math.PI) * moonDist * 0.05;
      points.push(pos);
    }

    // Phase 3: Lunar flyby - swing around the far side
    const flybyRadius = MOON_FLYBY_ALTITUDE;
    const flybyCenter = moonPos.clone();
    // Calculate the approach direction
    const approachDir = points[points.length - 1].clone().sub(moonPos).normalize();

    for (let i = 0; i <= 20; i++) {
      const angle = Math.PI * 0.3 + (i / 20) * Math.PI * 1.4; // Swing around ~250 degrees
      // Rotate around Moon in the plane defined by approach
      const localX = Math.cos(angle) * flybyRadius;
      const localZ = Math.sin(angle) * flybyRadius;

      const pos = moonPos.clone();
      pos.add(moonDir.clone().multiplyScalar(localZ));
      pos.add(perpendicular.clone().multiplyScalar(localX));
      pos.y += Math.sin((i / 20) * Math.PI) * flybyRadius * 0.3;
      points.push(pos);
    }

    // Phase 4: Return trajectory - curve back to Earth
    const returnStart = points[points.length - 1].clone();
    const earthTarget = new THREE.Vector3(EARTH_RADIUS * 2, 0, -EARTH_RADIUS);

    for (let i = 1; i <= 30; i++) {
      const t = i / 30;
      const arcHeight = moonDist * 0.12 * Math.sin(t * Math.PI);
      const pos = new THREE.Vector3().lerpVectors(
        returnStart,
        earthTarget,
        t
      );
      // Arc on opposite side for return
      pos.add(perpendicular.clone().multiplyScalar(-arcHeight));
      pos.y -= Math.sin(t * Math.PI) * moonDist * 0.04;
      points.push(pos);
    }

    this.trajectoryPoints = points;

    // Update or create trajectory line
    if (this.trajectoryLine) {
      this.scene.remove(this.trajectoryLine);
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const curvePoints = curve.getPoints(200);
    const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
    const material = new THREE.LineBasicMaterial({
      color: 0x58a6ff,
      transparent: true,
      opacity: 0.6,
      linewidth: 2,
    });
    this.trajectoryLine = new THREE.Line(geometry, material);
    this.trajectoryLine.visible = false;
    this.scene.add(this.trajectoryLine);
  }

  private getTrajectoryPoint(progress: number): THREE.Vector3 {
    if (this.trajectoryPoints.length === 0) return new THREE.Vector3();
    const index = Math.floor(progress * (this.trajectoryPoints.length - 1));
    return this.trajectoryPoints[Math.min(index, this.trajectoryPoints.length - 1)].clone();
  }

  start(): void {
    this.updateTrajectoryPoints();
    this.isPlaying = true;
    this.currentPhaseIndex = 0;
    this.phaseStartTime = performance.now();
    this.overlay.classList.remove('hidden');
    if (this.trajectoryLine) {
      this.trajectoryLine.visible = true;
    }

    // Hide other UI elements
    const titleCard = document.getElementById('title-card');
    const journeyDock = document.getElementById('journey-dock');
    const missionBtn = this.container.querySelector('.mission-start-btn') as HTMLElement;
    if (titleCard) titleCard.style.opacity = '0';
    if (journeyDock) journeyDock.style.opacity = '0';
    if (missionBtn) missionBtn.style.opacity = '0';

    this.updatePhaseDisplay();
  }

  stop(): void {
    this.isPlaying = false;
    this.overlay.classList.add('hidden');
    if (this.trajectoryLine) {
      this.trajectoryLine.visible = false;
    }

    // Restore UI elements
    const titleCard = document.getElementById('title-card');
    const journeyDock = document.getElementById('journey-dock');
    const missionBtn = this.container.querySelector('.mission-start-btn') as HTMLElement;
    if (titleCard) titleCard.style.opacity = '1';
    if (journeyDock) journeyDock.style.opacity = '1';
    if (missionBtn) missionBtn.style.opacity = '1';
  }

  private updatePhaseDisplay(): void {
    const phase = this.phases[this.currentPhaseIndex];
    const phaseNumber = this.overlay.querySelector('.phase-number');
    const phaseName = this.overlay.querySelector('.phase-name');
    const phaseSubtitle = this.overlay.querySelector('.phase-subtitle');
    const phaseDescription = this.overlay.querySelector('.phase-description');

    if (phaseNumber) phaseNumber.textContent = String(this.currentPhaseIndex + 1).padStart(2, '0');
    if (phaseName) phaseName.textContent = phase.name;
    if (phaseSubtitle) phaseSubtitle.textContent = phase.subtitle;
    if (phaseDescription) phaseDescription.textContent = phase.description;

    // Animate in
    const phaseEl = this.overlay.querySelector('.mission-phase');
    phaseEl?.classList.remove('animate');
    void (phaseEl as HTMLElement)?.offsetWidth; // Trigger reflow
    phaseEl?.classList.add('animate');
  }

  update(): void {
    if (!this.isPlaying) return;

    const now = performance.now();
    const elapsed = now - this.phaseStartTime;
    const phase = this.phases[this.currentPhaseIndex];

    // Update camera
    const target = phase.cameraTarget();
    this.camera.setTargetImmediate(target.x, target.y, target.z);
    this.camera.setZoom(phase.cameraZoom);

    // Update progress bar
    const totalDuration = this.phases.reduce((sum, p) => sum + p.duration, 0);
    const completedDuration = this.phases.slice(0, this.currentPhaseIndex).reduce((sum, p) => sum + p.duration, 0);
    const overallProgress = (completedDuration + elapsed) / totalDuration;
    const progressFill = this.overlay.querySelector('.progress-fill') as HTMLElement;
    if (progressFill) {
      progressFill.style.width = `${overallProgress * 100}%`;
    }

    // Update stats
    const moonDist = this.moonPosition().length();
    const currentDist = Math.abs(phase.progress - 0.5) < 0.2 ? moonDist * phase.progress : moonDist * phase.progress;
    const distanceEl = document.getElementById('mission-distance');
    const dayEl = document.getElementById('mission-day');
    if (distanceEl) distanceEl.textContent = this.formatDistance(currentDist);
    if (dayEl) dayEl.textContent = String(Math.ceil(phase.progress * 10) || 1);

    // Check for phase transition
    if (elapsed >= phase.duration) {
      this.currentPhaseIndex++;
      if (this.currentPhaseIndex >= this.phases.length) {
        // Mission complete
        setTimeout(() => this.stop(), 2000);
        return;
      }
      this.phaseStartTime = now;
      this.updatePhaseDisplay();
    }
  }

  private formatDistance(meters: number): string {
    if (meters >= 1_000_000_000) {
      return `${(meters / 1_000_000_000).toFixed(1)}M km`;
    } else if (meters >= 1_000_000) {
      return `${(meters / 1_000_000).toFixed(0)} km`;
    } else if (meters >= 1_000) {
      return `${(meters / 1_000).toFixed(0)} km`;
    }
    return `${meters.toFixed(0)} m`;
  }

  isActive(): boolean {
    return this.isPlaying;
  }
}
