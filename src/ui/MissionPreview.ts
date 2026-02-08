// src/ui/MissionPreview.ts
import * as THREE from 'three';
import { Camera } from '../engine/Camera';
import { cosmicStore } from '../bridge/CosmicStore';

interface CinematicPhase {
  name: string;
  subtitle: string;
  description: string;
  duration: number; // ms
  trajectoryStart: number; // 0-1
  trajectoryEnd: number; // 0-1
  camera: {
    startZoom: number;
    endZoom: number;
    startTheta: number;
    endTheta: number;
    startPhi: number;
    endPhi: number;
    followSpacecraft: boolean;
  };
}

export class MissionPreview {
  private camera: Camera;
  private isPlaying = false;
  private currentPhaseIndex = 0;
  private phaseStartTime = 0;
  private trajectoryLine: THREE.Line | null = null;
  private scene: THREE.Scene;
  private moonPosition: () => THREE.Vector3;
  private spacecraftMarker: THREE.Sprite | null = null;
  private satellitesMesh: THREE.Points | null = null;
  private satellitesWereVisible = false;

  // Smoothed camera state for buttery transitions
  private smoothedTarget = new THREE.Vector3();
  private smoothedZoom = 7.5;
  private smoothedTheta = 0;
  private smoothedPhi = Math.PI / 2.2;
  private readonly smoothing = 0.04;

  private phases: CinematicPhase[];
  private trajectoryPoints: THREE.Vector3[] = [];

  constructor(camera: Camera, scene: THREE.Scene, moonPosition: () => THREE.Vector3, satellitesMesh?: THREE.Points) {
    this.camera = camera;
    this.scene = scene;
    this.moonPosition = moonPosition;
    this.satellitesMesh = satellitesMesh || null;

    // Define cinematic mission phases
    this.phases = [
      {
        name: 'Launch',
        subtitle: 'Kennedy Space Center, Florida',
        description: 'The Space Launch System, the most powerful rocket ever built, carries Orion and four astronauts into Earth orbit.',
        duration: 5000,
        trajectoryStart: 0.00,
        trajectoryEnd: 0.08,
        camera: {
          startZoom: 7.3, endZoom: 7.5,
          startTheta: 0, endTheta: 0.3,
          startPhi: Math.PI / 2.2, endPhi: Math.PI / 2.1,
          followSpacecraft: false,
        },
      },
      {
        name: 'Earth Orbit',
        subtitle: 'Systems Check',
        description: 'Orion completes up to two orbits of Earth while the crew verifies spacecraft systems before the journey to the Moon.',
        duration: 6000,
        trajectoryStart: 0.08,
        trajectoryEnd: 0.35,
        camera: {
          startZoom: 7.5, endZoom: 7.6,
          startTheta: 0.3, endTheta: Math.PI * 0.8,
          startPhi: Math.PI / 2.1, endPhi: Math.PI / 2.3,
          followSpacecraft: true,
        },
      },
      {
        name: 'Trans-Lunar Injection',
        subtitle: 'Leaving Earth Behind',
        description: 'The Interim Cryogenic Propulsion Stage fires, accelerating Orion to 24,500 mph—fast enough to escape Earth\'s gravity.',
        duration: 6000,
        trajectoryStart: 0.35,
        trajectoryEnd: 0.45,
        camera: {
          startZoom: 7.6, endZoom: 8.2,
          startTheta: Math.PI * 0.8, endTheta: Math.PI * 1.0,
          startPhi: Math.PI / 2.3, endPhi: Math.PI / 2.5,
          followSpacecraft: true,
        },
      },
      {
        name: 'Outbound Transit',
        subtitle: '4 Days to the Moon',
        description: 'The crew travels through the vast emptiness between Earth and Moon, farther from home than any humans in history.',
        duration: 8000,
        trajectoryStart: 0.45,
        trajectoryEnd: 0.59,
        camera: {
          startZoom: 8.2, endZoom: 8.4,
          startTheta: Math.PI * 1.0, endTheta: Math.PI * 1.2,
          startPhi: Math.PI / 2.5, endPhi: Math.PI / 2.2,
          followSpacecraft: true,
        },
      },
      {
        name: 'Lunar Flyby',
        subtitle: 'The Far Side',
        description: 'Orion swings around the Moon at just 6,400 miles altitude, giving the crew breathtaking views of the lunar far side.',
        duration: 9000,
        trajectoryStart: 0.59,
        trajectoryEnd: 0.77,
        camera: {
          startZoom: 8.4, endZoom: 7.4,
          startTheta: Math.PI * 1.2, endTheta: Math.PI * 1.5,
          startPhi: Math.PI / 2.2, endPhi: Math.PI / 2.0,
          followSpacecraft: true,
        },
      },
      {
        name: 'Return Transit',
        subtitle: 'Homeward Bound',
        description: 'Using the Moon\'s gravity, Orion slingshots back toward Earth on a free-return trajectory.',
        duration: 7000,
        trajectoryStart: 0.77,
        trajectoryEnd: 0.94,
        camera: {
          startZoom: 7.4, endZoom: 8.2,
          startTheta: Math.PI * 1.5, endTheta: Math.PI * 1.8,
          startPhi: Math.PI / 2.0, endPhi: Math.PI / 2.3,
          followSpacecraft: true,
        },
      },
      {
        name: 'Earth Return',
        subtitle: 'Splashdown',
        description: 'After 10 days in space, Orion re-enters Earth\'s atmosphere at 25,000 mph and splashes down in the Pacific Ocean.',
        duration: 6000,
        trajectoryStart: 0.94,
        trajectoryEnd: 1.00,
        camera: {
          startZoom: 8.2, endZoom: 7.2,
          startTheta: Math.PI * 1.8, endTheta: Math.PI * 2.0,
          startPhi: Math.PI / 2.3, endPhi: Math.PI / 2.1,
          followSpacecraft: false,
        },
      },
    ];

    this.createTrajectory();
    this.createSpacecraftMarker();
  }

  private createSpacecraftMarker(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.2, 'rgba(255, 230, 180, 0.9)');
      gradient.addColorStop(0.4, 'rgba(255, 200, 100, 0.6)');
      gradient.addColorStop(0.7, 'rgba(255, 180, 50, 0.3)');
      gradient.addColorStop(1, 'rgba(255, 150, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.spacecraftMarker = new THREE.Sprite(material);
    const markerSize = 500_000;
    this.spacecraftMarker.scale.set(markerSize, markerSize, 1);
    this.spacecraftMarker.visible = false;
    this.scene.add(this.spacecraftMarker);
  }

  private createTrajectory(): void {
    this.updateTrajectoryPoints();
  }

  private updateTrajectoryPoints(): void {
    const moonPos = this.moonPosition();
    const moonDist = moonPos.length();
    const points: THREE.Vector3[] = [];

    const EARTH_RADIUS = 6_371_000;
    const PARKING_ORBIT_RADIUS = EARTH_RADIUS * 1.8;
    const MOON_RADIUS = 1_737_000 * 3;
    const FLYBY_DIST = MOON_RADIUS * 2.5;

    const toMoon = moonPos.clone().normalize();
    const perp = new THREE.Vector3(-toMoon.z, 0, toMoon.x).normalize();

    // Phase 1: Earth parking orbit
    const orbitPoints = 60;
    const orbitRevolutions = 1.5;
    for (let i = 0; i <= orbitPoints; i++) {
      const angle = (i / orbitPoints) * Math.PI * 2 * orbitRevolutions;
      points.push(new THREE.Vector3(Math.cos(angle) * PARKING_ORBIT_RADIUS, 0, Math.sin(angle) * PARKING_ORBIT_RADIUS));
    }

    const tliPoint = points[points.length - 1].clone();

    // Phase 2: Trans-lunar trajectory
    const outboundControl1 = tliPoint.clone().add(tliPoint.clone().normalize().multiplyScalar(moonDist * 0.2));
    const outboundControl2 = moonPos.clone().sub(toMoon.clone().multiplyScalar(moonDist * 0.3));
    const approachPoint = moonPos.clone().sub(toMoon.clone().multiplyScalar(FLYBY_DIST));
    const outboundCurve = new THREE.CubicBezierCurve3(tliPoint, outboundControl1, outboundControl2, approachPoint);
    for (let i = 1; i <= 40; i++) points.push(outboundCurve.getPoint(i / 40));

    // Phase 3: Lunar flyby
    const flybyPoints = 30;
    for (let i = 0; i <= flybyPoints; i++) {
      const angle = -Math.PI * 0.5 + (i / flybyPoints) * Math.PI;
      const offset = new THREE.Vector3(
        toMoon.x * Math.cos(angle) + perp.x * Math.sin(angle),
        0,
        toMoon.z * Math.cos(angle) + perp.z * Math.sin(angle)
      ).multiplyScalar(FLYBY_DIST);
      points.push(moonPos.clone().add(offset));
    }

    const departPoint = points[points.length - 1].clone();

    // Phase 4: Return trajectory
    const returnControl1 = departPoint.clone().add(departPoint.clone().sub(moonPos).normalize().multiplyScalar(moonDist * 0.2));
    const returnControl2 = perp.clone().multiplyScalar(-PARKING_ORBIT_RADIUS * 2);
    const splashdown = new THREE.Vector3(-PARKING_ORBIT_RADIUS * 0.8, 0, -PARKING_ORBIT_RADIUS * 0.5);
    const returnCurve = new THREE.CubicBezierCurve3(departPoint, returnControl1, returnControl2, splashdown);
    for (let i = 1; i <= 40; i++) points.push(returnCurve.getPoint(i / 40));

    this.trajectoryPoints = points;

    if (this.trajectoryLine) this.scene.remove(this.trajectoryLine);

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0x58a6ff, transparent: true, opacity: 0.7 });
    this.trajectoryLine = new THREE.Line(geometry, material);
    this.trajectoryLine.visible = false;
    this.scene.add(this.trajectoryLine);
  }

  private getTrajectoryPoint(progress: number): THREE.Vector3 {
    if (this.trajectoryPoints.length === 0) return new THREE.Vector3();
    const scaledProgress = progress * (this.trajectoryPoints.length - 1);
    const index = Math.floor(scaledProgress);
    const nextIndex = Math.min(index + 1, this.trajectoryPoints.length - 1);
    const t = scaledProgress - index;
    return this.trajectoryPoints[index].clone().lerp(this.trajectoryPoints[nextIndex], t);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  start(): void {
    this.updateTrajectoryPoints();
    this.isPlaying = true;
    this.currentPhaseIndex = 0;
    this.phaseStartTime = performance.now();

    if (this.trajectoryLine) this.trajectoryLine.visible = true;
    if (this.spacecraftMarker) this.spacecraftMarker.visible = true;

    // Hide satellites during mission preview
    if (this.satellitesMesh) {
      this.satellitesWereVisible = this.satellitesMesh.visible;
      this.satellitesMesh.visible = false;
    }

    this.camera.setAutoRotate(false);

    const firstPhase = this.phases[0];
    this.smoothedTarget.set(0, 0, 0);
    this.smoothedZoom = firstPhase.camera.startZoom;
    this.smoothedTheta = firstPhase.camera.startTheta;
    this.smoothedPhi = firstPhase.camera.startPhi;

    // Push mission state to bridge
    cosmicStore.setState({
      missionActive: true,
      missionPhase: {
        index: 0,
        name: firstPhase.name,
        subtitle: firstPhase.subtitle,
        description: firstPhase.description,
      },
      missionProgress: 0,
      missionDistance: '0 km',
      missionDay: 1,
    });
  }

  stop(): void {
    this.isPlaying = false;
    if (this.trajectoryLine) this.trajectoryLine.visible = false;
    if (this.spacecraftMarker) this.spacecraftMarker.visible = false;

    if (this.satellitesMesh) {
      this.satellitesMesh.visible = this.satellitesWereVisible;
    }

    cosmicStore.setState({ missionActive: false, missionPhase: null });
  }

  update(): void {
    if (!this.isPlaying) return;

    const now = performance.now();
    const elapsed = now - this.phaseStartTime;
    const phase = this.phases[this.currentPhaseIndex];

    const rawT = Math.min(elapsed / phase.duration, 1);
    const t = this.easeInOutCubic(rawT);

    // Move spacecraft marker along trajectory
    const trajectoryT = this.lerp(phase.trajectoryStart, phase.trajectoryEnd, t);
    const spacecraftPos = this.getTrajectoryPoint(trajectoryT);
    if (this.spacecraftMarker) {
      this.spacecraftMarker.position.copy(spacecraftPos);
      const pulse = 1 + 0.1 * Math.sin(now * 0.005);
      const baseSize = 500_000;
      this.spacecraftMarker.scale.set(baseSize * pulse, baseSize * pulse, 1);
    }

    // Camera
    const targetZoom = this.lerp(phase.camera.startZoom, phase.camera.endZoom, t);
    const targetTheta = this.lerp(phase.camera.startTheta, phase.camera.endTheta, t);
    const targetPhi = this.lerp(phase.camera.startPhi, phase.camera.endPhi, t);
    const targetPos = phase.camera.followSpacecraft ? spacecraftPos.clone() : new THREE.Vector3(0, 0, 0);

    this.smoothedTarget.lerp(targetPos, this.smoothing);
    this.smoothedZoom += (targetZoom - this.smoothedZoom) * this.smoothing;
    this.smoothedTheta += (targetTheta - this.smoothedTheta) * this.smoothing;
    this.smoothedPhi += (targetPhi - this.smoothedPhi) * this.smoothing;

    this.camera.setTargetImmediate(this.smoothedTarget.x, this.smoothedTarget.y, this.smoothedTarget.z);
    this.camera.setZoom(this.smoothedZoom);
    this.camera.setAngleImmediate(this.smoothedTheta, this.smoothedPhi);

    // Update progress in bridge
    const totalDuration = this.phases.reduce((sum, p) => sum + p.duration, 0);
    const completedDuration = this.phases.slice(0, this.currentPhaseIndex).reduce((sum, p) => sum + p.duration, 0);
    const overallProgress = (completedDuration + elapsed) / totalDuration;

    const currentDist = spacecraftPos.length();
    cosmicStore.setState({
      missionProgress: overallProgress,
      missionDistance: this.formatDistance(currentDist),
      missionDay: Math.ceil(trajectoryT * 10) || 1,
    });

    // Phase transition
    if (elapsed >= phase.duration) {
      this.currentPhaseIndex++;
      if (this.currentPhaseIndex >= this.phases.length) {
        setTimeout(() => this.stop(), 2000);
        return;
      }
      this.phaseStartTime = now;
      const newPhase = this.phases[this.currentPhaseIndex];
      cosmicStore.setState({
        missionPhase: {
          index: this.currentPhaseIndex,
          name: newPhase.name,
          subtitle: newPhase.subtitle,
          description: newPhase.description,
        },
      });
    }
  }

  private formatDistance(meters: number): string {
    if (meters >= 1_000_000_000) return `${(meters / 1_000_000_000).toFixed(1)}M km`;
    if (meters >= 1_000_000) return `${(meters / 1_000_000).toFixed(0)} km`;
    if (meters >= 1_000) return `${(meters / 1_000).toFixed(0)} km`;
    return `${meters.toFixed(0)} m`;
  }

  isActive(): boolean {
    return this.isPlaying;
  }
}
