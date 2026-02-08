// src/main.ts
import './styles/app.css';
import './styles/labels.css';
import './react-entry';
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
import { Navigation, CelestialBody, BODIES } from './ui/Navigation';
import { MissionPreview } from './ui/MissionPreview';
import { ScaleLevelState, ScaleLevel } from './state/ScaleLevel';
import { SimulatedTime } from './state/SimulatedTime';
import { OrbitalPath } from './objects/OrbitalPath';
import { OortCloud } from './objects/OortCloud';
import { PlanetLabels } from './ui/PlanetLabels';
import { ORBITAL_ELEMENTS } from './objects/planets/PlanetData';
import { Stars } from './objects/Stars';
import { StarLabels } from './ui/StarLabels';
import { getStarColor } from './data/NearbyStars';
import { LocalBubble } from './objects/LocalBubble';
import { LocalBubbleLabels } from './ui/LocalBubbleLabels';
import { OrionArm } from './objects/OrionArm';
import { OrionArmLabels } from './ui/OrionArmLabels';
import { MilkyWay } from './objects/MilkyWay';
import { MilkyWayLabels } from './ui/MilkyWayLabels';
import { cosmicStore, type BodyFacts } from './bridge/CosmicStore';
import { cosmicActions } from './bridge/CosmicActions';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const renderer = new Renderer({ canvas });
const orbitCamera = new Camera();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);

// Scene objects
const earth = new Earth();
earth.addToScene(scene);

const moon = new Moon();
moon.addToScene(scene);

const sun = new Sun();
sun.addToScene(scene);

// Scale level state
const scaleLevelState = new ScaleLevelState();
const simulatedTime = new SimulatedTime();

// Orbital paths
const orbitalPaths = Object.entries(ORBITAL_ELEMENTS).map(([name, elements]) => {
  const path = new OrbitalPath(elements, 0x4488ff);
  path.addToScene(scene);
  return { name, path };
});

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

// Planet labels
const planetLabels = new PlanetLabels(document.body, scene);

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
  planetLabels.addLabel(id, { name, color, getPosition: () => mesh.position.clone() });
});

planetLabels.addLabel('oort', {
  name: 'Oort Cloud',
  color: '#6688bb',
  getPosition: () => new THREE.Vector3(Math.sqrt(65) * 149_597_870_700, 0, 0),
});

// Stars
const stars = new Stars();
stars.addToScene(scene);
const starLabels = new StarLabels(document.body, scene);
stars.getStars().forEach((star, index) => {
  const position = stars.getStarPosition(index);
  const color = getStarColor(star.spectralType);
  starLabels.addLabel(star, position, color, star.notable);
});

// Local Bubble
const localBubble = new LocalBubble();
localBubble.addToScene(scene);
const localBubbleLabels = new LocalBubbleLabels(document.body, scene);
localBubble.getClusters().forEach((cluster, index) => {
  const position = localBubble.getClusterPosition(index);
  const color = cluster.type === 'marker' ? '#ffee88' : '#6677cc';
  localBubbleLabels.addLabel(cluster, position, color, cluster.notable);
});

// Orion Arm
const orionArm = new OrionArm();
orionArm.addToScene(scene);
const orionArmLabels = new OrionArmLabels(document.body, scene);
orionArm.getObjects().forEach((obj, index) => {
  const position = orionArm.getObjectPosition(index);
  const color = obj.type === 'marker' ? '#ffee88' : obj.color;
  orionArmLabels.addLabel(obj, position, color, obj.notable);
});

// Milky Way
const milkyWay = new MilkyWay();
milkyWay.addToScene(scene);
const milkyWayLabels = new MilkyWayLabels(document.body, scene);
milkyWay.getArms().forEach((arm) => {
  const position = milkyWay.getArmLabelPosition(arm);
  milkyWayLabels.addLabel(arm, position, arm.color, arm.notable, { minor: arm.minor });
});
milkyWay.getFeatures().forEach((feature) => {
  const position = milkyWay.getFeaturePosition(feature);
  milkyWayLabels.addLabel(feature, position, feature.color, feature.notable);
});

// Wire arm hover → highlight/dim clouds
milkyWayLabels.setArmHoverCallback((armName) => {
  if (armName) {
    milkyWay.highlightArm(armName);
  } else {
    milkyWay.clearHighlight();
  }
});

// Navigation
const navigation = new Navigation(orbitCamera);
navigation.setMoonMesh(moon.mesh);
navigation.setSunMesh(sun.mesh);
navigation.setMercuryMesh(mercury.mesh);
navigation.setVenusMesh(venus.mesh);
navigation.setMarsMesh(mars.mesh);
navigation.setJupiterMesh(jupiter.mesh);
navigation.setSaturnMesh(saturn.mesh);
navigation.setUranusMesh(uranus.mesh);
navigation.setNeptuneMesh(neptune.mesh);

// Satellites
const satellites = new Satellites(renderer.capabilities.maxSatellites);
satellites.addToScene(scene);
let satellitesEnabled = true;
let currentBody: CelestialBody = 'earth';

navigation.setOnBodyChange((body) => {
  currentBody = body;
  satellites.mesh.visible = satellitesEnabled && body === 'earth';
  scaleLevelState.setLastFocusedBody(body);
});

// Mission Preview
const missionPreview = new MissionPreview(orbitCamera, scene, () => moon.mesh.position.clone(), satellites.mesh);

// Worker for orbital propagation
const worker = new SatelliteWorker();
let latestPositions: Float32Array | null = null;
worker.onPositions((positions) => {
  satellites.updatePositions(positions);
  latestPositions = positions;
});

// Cache
const cache = new TLECache();

// Raycaster for satellite/body selection
const raycaster = new THREE.Raycaster();
raycaster.params.Points = { threshold: 200000 };
const mouse = new THREE.Vector2();
let selectedIndex: number | null = null;

// Star hover raycaster
const starRaycaster = new THREE.Raycaster();
starRaycaster.params.Points = { threshold: 5e10 };

// Transition state
let transitionInProgress = false;
let visualScaleLevel: ScaleLevel = ScaleLevel.Planet;

// Time control state
const SPEEDS = [1, 7, 30];
let speedIndex = 0;

// ─── Bridge Action Handlers ───────────────────────────────────────

cosmicActions.on('flyToBody', (body: CelestialBody) => {
  if (!navigation.isNavigating()) {
    navigation.flyTo(body);
  }
});

cosmicActions.on('changeScaleLevel', (direction: 'up' | 'down') => {
  if (direction === 'up' && scaleLevelState.canGoUp()) {
    scaleLevelState.goUp();
    handleScaleLevelChange(scaleLevelState.current);
  } else if (direction === 'down' && scaleLevelState.canGoDown()) {
    scaleLevelState.goDown();
    handleScaleLevelChange(scaleLevelState.current);
  }
});

cosmicActions.on('toggleSatellites', (enabled: boolean) => {
  satellitesEnabled = enabled;
  satellites.mesh.visible = satellitesEnabled && currentBody === 'earth';
  cosmicStore.setState({ satellitesEnabled });
});

cosmicActions.on('startMission', () => {
  missionPreview.start();
});

cosmicActions.on('stopMission', () => {
  missionPreview.stop();
});

cosmicActions.on('timeToggle', () => {
  simulatedTime.toggle();
  cosmicStore.setState({ timePaused: simulatedTime.isPaused });
});

cosmicActions.on('timeStepForward', () => {
  simulatedTime.stepForward(SPEEDS[speedIndex]);
  pushTimeState();
});

cosmicActions.on('timeStepBackward', () => {
  simulatedTime.stepBackward(SPEEDS[speedIndex]);
  pushTimeState();
});

cosmicActions.on('timeChangeSpeed', () => {
  speedIndex = (speedIndex + 1) % SPEEDS.length;
  simulatedTime.setSpeed(SPEEDS[speedIndex]);
  cosmicStore.setState({ timeSpeed: SPEEDS[speedIndex] });
  pushTimeState();
});

cosmicActions.on('closeSatelliteInfo', () => {
  selectedIndex = null;
  cosmicStore.setState({ selectedSatellite: null });
});

function pushTimeState(): void {
  const d = simulatedTime.getDate();
  cosmicStore.setState({
    timeDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    timePaused: simulatedTime.isPaused,
    timeSpeed: SPEEDS[speedIndex],
  });
}

// ─── Scale Level Change Handler ───────────────────────────────────

function updateTitleCardForLevel(level: ScaleLevel): void {
  const LEVEL_FACTS: Record<string, { name: string; facts: BodyFacts }> = {
    [ScaleLevel.SolarSystem]: {
      name: 'Solar System',
      facts: {
        rows: [
          { label: 'Type', value: 'Planetary System' },
          { label: 'Extent', value: '~30 AU' },
          { label: 'Age', value: '4.6 billion years' },
          { label: 'Moons', value: '290+' },
        ],
        funFact: 'Light from the Sun takes 8 minutes to reach Earth but over 4 hours to reach Neptune',
      },
    },
    [ScaleLevel.Stellar]: {
      name: 'Local Stars',
      facts: {
        rows: [
          { label: 'Type', value: 'Stellar Region' },
          { label: 'Extent', value: '~20 light years' },
          { label: 'Stars', value: '52 nearby stars' },
          { label: 'Nearest', value: 'Proxima Centauri (4.24 ly)' },
        ],
        funFact: 'Alpha Centauri is so close in cosmic terms that its light left only 4 years ago \u2014 yet no spacecraft could reach it in a human lifetime',
      },
    },
    [ScaleLevel.LocalBubble]: {
      name: 'Local Bubble',
      facts: {
        rows: [
          { label: 'Type', value: 'Interstellar Cavity' },
          { label: 'Extent', value: '~500 light years' },
          { label: 'Objects', value: '10+ clusters' },
          { label: 'Nearest', value: 'Ursa Major Group (80 ly)' },
        ],
        funFact: 'We live inside a 500-light-year void blown open by a chain of supernovae that detonated 10\u201320 million years ago',
      },
    },
    [ScaleLevel.OrionArm]: {
      name: 'Orion Arm',
      facts: {
        rows: [
          { label: 'Extent', value: '~10,000 light years' },
          { label: 'Objects', value: '9 nebulae & associations' },
          { label: 'Nearest', value: 'Vela Remnant (800 ly)' },
          { label: 'Type', value: 'Minor spiral arm' },
        ],
        funFact: 'The Orion Nebula alone is forging thousands of new stars right now \u2014 an entire stellar nursery visible to the naked eye',
      },
    },
    [ScaleLevel.MilkyWay]: {
      name: 'Milky Way',
      facts: {
        rows: [
          { label: 'Type', value: 'Barred spiral (SBbc)' },
          { label: 'Diameter', value: '~100,000 light years' },
          { label: 'Stars', value: '100\u2013400 billion' },
          { label: 'Age', value: '~13.6 billion years' },
        ],
        funFact: 'The Sun orbits the galactic center at 828,000 km/h \u2014 yet still takes 230 million years to complete one lap',
      },
    },
  };

  if (level === ScaleLevel.Planet) {
    navigation.refreshTitleCard();
  } else {
    const info = LEVEL_FACTS[level];
    if (info) {
      cosmicStore.setState({
        bodyName: info.name,
        bodyFacts: info.facts,
      });
    }
  }
}

function fadeTransition(setup: () => void, afterReveal?: () => void): void {
  if (transitionInProgress) return;
  transitionInProgress = true;
  cosmicStore.setState({ transitionActive: true });

  // Fade to black
  setTimeout(() => {
    // Run setup while "black"
    setup();

    // Fade from black
    cosmicStore.setState({ transitionActive: false });

    setTimeout(() => {
      afterReveal?.();
      transitionInProgress = false;
    }, 1000);
  }, 1000);
}

function handleScaleLevelChange(level: ScaleLevel): void {
  const isOrrery = level === ScaleLevel.SolarSystem;
  const isStellar = level === ScaleLevel.Stellar;
  const isPlanet = level === ScaleLevel.Planet;
  const isLocalBubble = level === ScaleLevel.LocalBubble;
  const isOrionArm = level === ScaleLevel.OrionArm;
  const isMilkyWay = level === ScaleLevel.MilkyWay;

  cosmicStore.setState({
    scaleLevel: level,
    canScaleUp: scaleLevelState.canGoUp(),
    canScaleDown: scaleLevelState.canGoDown(),
  });

  fadeTransition(
    () => {
      visualScaleLevel = level;
      const notPlanet = isOrrery || isStellar || isLocalBubble || isOrionArm || isMilkyWay;

      sun.setOrreryMode(notPlanet);
      earth.setOrreryMode(notPlanet);
      mercury.setOrreryMode(notPlanet);
      venus.setOrreryMode(notPlanet);
      mars.setOrreryMode(notPlanet);
      jupiter.setOrreryMode(notPlanet);
      saturn.setOrreryMode(notPlanet);
      uranus.setOrreryMode(notPlanet);
      neptune.setOrreryMode(notPlanet);

      updateTitleCardForLevel(level);

      if (isOrrery) {
        orbitCamera.setPositionImmediate(12.2, Math.PI / 2.5, new THREE.Vector3(0, 0, 0), 0);
        sun.mesh.visible = true;
        earth.mesh.visible = true; earth.atmosphere.visible = true;
        mercury.mesh.visible = true; venus.mesh.visible = true;
        mars.mesh.visible = true; jupiter.mesh.visible = true;
        saturn.mesh.visible = true; uranus.mesh.visible = true;
        neptune.mesh.visible = true;
        moon.mesh.visible = false; satellites.mesh.visible = false;
        orbitalPaths.forEach(({ path }) => { path.setVisible(true); path.setOpacityImmediate(1); });
        oortCloud.setVisible(true); oortCloud.setOpacityImmediate(1);
        stars.setVisible(false); starLabels.setVisible(false);
        localBubble.setVisible(false); localBubbleLabels.setVisible(false);
        orionArm.setVisible(false); orionArmLabels.setVisible(false);
        milkyWay.setVisible(false); milkyWayLabels.setVisible(false);
        cosmicStore.setState({ dockVisible: true, timeControlsVisible: true });
        pushTimeState();
      } else if (isStellar) {
        orbitCamera.setPositionImmediate(11.3, Math.PI / 4, new THREE.Vector3(0, 0, 0));
        earth.mesh.visible = false; earth.atmosphere.visible = false;
        mercury.mesh.visible = false; venus.mesh.visible = false;
        mars.mesh.visible = false; jupiter.mesh.visible = false;
        saturn.mesh.visible = false; uranus.mesh.visible = false;
        neptune.mesh.visible = false; moon.mesh.visible = false;
        satellites.mesh.visible = false; sun.mesh.visible = false;
        sun.hideFlares();
        orbitalPaths.forEach(({ path }) => path.setVisible(false));
        oortCloud.setVisible(false); planetLabels.setVisible(false);
        localBubble.setVisible(false); localBubbleLabels.setVisible(false);
        orionArm.setVisible(false); orionArmLabels.setVisible(false);
        milkyWay.setVisible(false); milkyWayLabels.setVisible(false);
        stars.setVisible(true); stars.setOpacity(1);
        cosmicStore.setState({ dockVisible: false, timeControlsVisible: false });
        orbitCamera.setAutoRotate(true);
        orbitCamera.animateZoomTo(11.9);
      } else if (isPlanet) {
        const lastBody = scaleLevelState.lastFocusedBody;
        const bodyConfig: Record<string, number> = { earth: 7.5, moon: 7.5, sun: 9.8, mercury: 8.0, venus: 8.0, mars: 8.0, jupiter: 8.6, saturn: 8.7, uranus: 8.5, neptune: 8.5 };
        const zoom = bodyConfig[lastBody] || 7.5;
        earth.resetPosition();
        orbitCamera.setPositionImmediate(zoom, Math.PI / 2.2, new THREE.Vector3(0, 0, 0));
        sun.mesh.visible = true;
        earth.mesh.visible = true; earth.atmosphere.visible = true;
        mercury.mesh.visible = true; venus.mesh.visible = true;
        mars.mesh.visible = true; jupiter.mesh.visible = true;
        saturn.mesh.visible = true; uranus.mesh.visible = true;
        neptune.mesh.visible = true; moon.mesh.visible = true;
        satellites.mesh.visible = satellitesEnabled;
        stars.setVisible(false); starLabels.setVisible(false);
        orbitalPaths.forEach(({ path }) => path.setVisible(false));
        oortCloud.setVisible(false); planetLabels.setVisible(false);
        localBubble.setVisible(false); localBubbleLabels.setVisible(false);
        orionArm.setVisible(false); orionArmLabels.setVisible(false);
        milkyWay.setVisible(false); milkyWayLabels.setVisible(false);
        cosmicStore.setState({ dockVisible: true, timeControlsVisible: false });
        simulatedTime.reset();
      } else if (isLocalBubble) {
        orbitCamera.setPositionImmediate(12.0, Math.PI / 3, new THREE.Vector3(0, 0, 0));
        earth.mesh.visible = false; earth.atmosphere.visible = false;
        mercury.mesh.visible = false; venus.mesh.visible = false;
        mars.mesh.visible = false; jupiter.mesh.visible = false;
        saturn.mesh.visible = false; uranus.mesh.visible = false;
        neptune.mesh.visible = false; moon.mesh.visible = false;
        satellites.mesh.visible = false; sun.mesh.visible = false;
        sun.hideFlares();
        orbitalPaths.forEach(({ path }) => path.setVisible(false));
        oortCloud.setVisible(false); planetLabels.setVisible(false);
        stars.setVisible(false); starLabels.setVisible(false);
        localBubble.setVisible(true); localBubble.setOpacityImmediate(1);
        orionArm.setVisible(false); orionArmLabels.setVisible(false);
        milkyWay.setVisible(false); milkyWayLabels.setVisible(false);
        cosmicStore.setState({ dockVisible: false, timeControlsVisible: false });
        orbitCamera.setAutoRotate(true);
        orbitCamera.animateZoomTo(12.4);
      } else if (isOrionArm) {
        orbitCamera.setPositionImmediate(13.4, Math.PI / 3, new THREE.Vector3(0, 0, 0));
        earth.mesh.visible = false; earth.atmosphere.visible = false;
        mercury.mesh.visible = false; venus.mesh.visible = false;
        mars.mesh.visible = false; jupiter.mesh.visible = false;
        saturn.mesh.visible = false; uranus.mesh.visible = false;
        neptune.mesh.visible = false; moon.mesh.visible = false;
        satellites.mesh.visible = false; sun.mesh.visible = false;
        sun.hideFlares();
        orbitalPaths.forEach(({ path }) => path.setVisible(false));
        oortCloud.setVisible(false); planetLabels.setVisible(false);
        stars.setVisible(false); starLabels.setVisible(false);
        localBubble.setVisible(false); localBubbleLabels.setVisible(false);
        orionArm.setVisible(true); orionArm.setOpacityImmediate(1);
        milkyWay.setVisible(false); milkyWayLabels.setVisible(false);
        cosmicStore.setState({ dockVisible: false, timeControlsVisible: false });
        orbitCamera.setAutoRotate(true);
        orbitCamera.animateZoomTo(14.0);
      } else if (isMilkyWay) {
        orbitCamera.setPositionImmediate(15.5, 0.25, new THREE.Vector3(0, 0, 0));
        earth.mesh.visible = false; earth.atmosphere.visible = false;
        mercury.mesh.visible = false; venus.mesh.visible = false;
        mars.mesh.visible = false; jupiter.mesh.visible = false;
        saturn.mesh.visible = false; uranus.mesh.visible = false;
        neptune.mesh.visible = false; moon.mesh.visible = false;
        satellites.mesh.visible = false; sun.mesh.visible = false;
        sun.hideFlares();
        orbitalPaths.forEach(({ path }) => path.setVisible(false));
        oortCloud.setVisible(false); planetLabels.setVisible(false);
        stars.setVisible(false); starLabels.setVisible(false);
        localBubble.setVisible(false); localBubbleLabels.setVisible(false);
        orionArm.setVisible(false); orionArmLabels.setVisible(false);
        milkyWay.setVisible(true); milkyWay.setOpacityImmediate(1);
        cosmicStore.setState({ dockVisible: false, timeControlsVisible: false });
        orbitCamera.setAutoRotate(true);
        orbitCamera.animateZoomTo(15.9);
      }
    },
    () => {
      if (isOrrery) {
        planetLabels.setVisible(true);
      } else if (isStellar) {
        setTimeout(() => starLabels.setVisible(true), 3000);
      } else if (isPlanet) {
        navigation.refreshTitleCard();
      } else if (isLocalBubble) {
        setTimeout(() => localBubbleLabels.setVisible(true), 3000);
      } else if (isOrionArm) {
        setTimeout(() => orionArmLabels.setVisible(true), 3000);
      } else if (isMilkyWay) {
        setTimeout(() => milkyWayLabels.setVisible(true), 3000);
      }
    }
  );
}

// ─── Load Satellites ──────────────────────────────────────────────

async function loadSatellites() {
  let tles = await cache.getAll();
  if (tles.length > 0) {
    satellites.setTLEs(tles);
    await worker.init(tles);
  }

  const isStale = await cache.isStale(24 * 60 * 60 * 1000);
  if (isStale || tles.length === 0) {
    try {
      tles = await fetchAllTLEs();
      if (tles.length > 0) {
        await cache.store(tles);
        satellites.setTLEs(tles);
        await worker.init(tles);
      }
    } catch (error) {
      console.error('[Satellites] Failed to fetch TLEs:', error);
    }
  }
}

loadSatellites();

// ─── Input Handling ───────────────────────────────────────────────

let isDragging = false;
let lastMouse = { x: 0, y: 0 };
let mouseDownPos = { x: 0, y: 0 };
const CLICK_THRESHOLD = 5;

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const normalizedDelta = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 100) / 100;
  orbitCamera.zoom(normalizedDelta * 0.03);
}, { passive: false });

canvas.addEventListener('pointerdown', (e) => {
  isDragging = true;
  lastMouse = { x: e.clientX, y: e.clientY };
  mouseDownPos = { x: e.clientX, y: e.clientY };
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', (e) => {
  if (!isDragging) return;
  const deltaX = e.clientX - lastMouse.x;
  const deltaY = e.clientY - lastMouse.y;
  orbitCamera.rotate(deltaX * 0.005, deltaY * 0.005);
  lastMouse = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('pointerup', (e) => {
  const dx = e.clientX - mouseDownPos.x;
  const dy = e.clientY - mouseDownPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance < CLICK_THRESHOLD) handleSatelliteClick(e);
  isDragging = false;
  canvas.releasePointerCapture(e.pointerId);
});

canvas.addEventListener('pointercancel', (e) => {
  isDragging = false;
  canvas.releasePointerCapture(e.pointerId);
});

// Star hover detection
canvas.addEventListener('mousemove', (e) => {
  if (!scaleLevelState.isStellarMode()) return;
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  starRaycaster.setFromCamera(mouse, orbitCamera.camera);
  const intersects = starRaycaster.intersectObject(stars.mesh);
  if (intersects.length > 0 && intersects[0].index !== undefined) {
    const starData = stars.getStars()[intersects[0].index];
    if (starData && !starData.notable) starLabels.showHoverLabel(starData.name);
  } else {
    starLabels.hideHoverLabel();
  }
});

// All celestial body meshes for raycasting
const celestialMeshes: Record<string, THREE.Object3D> = {
  earth: earth.mesh, moon: moon.mesh, sun: sun.mesh,
  mercury: mercury.mesh, venus: venus.mesh, mars: mars.mesh,
  jupiter: jupiter.mesh, saturn: saturn.mesh, uranus: uranus.mesh, neptune: neptune.mesh,
};

function handleSatelliteClick(event: MouseEvent) {
  if (navigation.isNavigating()) return;
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, orbitCamera.camera);

  const bodyClicked = navigation.checkBodyClick(raycaster, celestialMeshes);
  if (bodyClicked) {
    navigation.flyTo(bodyClicked);
    return;
  }

  const intersects = raycaster.intersectObject(satellites.mesh);
  if (intersects.length > 0) {
    const pointIndex = intersects[0].index;
    if (pointIndex !== undefined) {
      const tle = satellites.getTLEAtIndex(pointIndex);
      if (tle && latestPositions) {
        selectedIndex = pointIndex;
        const x = latestPositions[pointIndex * 6 + 0];
        const y = latestPositions[pointIndex * 6 + 1];
        const z = latestPositions[pointIndex * 6 + 2];
        const vx = latestPositions[pointIndex * 6 + 3];
        const vy = latestPositions[pointIndex * 6 + 4];
        const vz = latestPositions[pointIndex * 6 + 5];
        const EARTH_RADIUS = 6_371_000;
        const distanceFromCenter = Math.sqrt(x * x + y * y + z * z);
        const altitude = distanceFromCenter - EARTH_RADIUS;
        const velocity = Math.sqrt(vx * vx + vy * vy + vz * vz);
        cosmicStore.setState({
          selectedSatellite: {
            name: tle.name,
            catalogNumber: tle.catalogNumber,
            category: tle.category,
            altitude,
            velocity,
          },
        });
      }
    }
  } else {
    selectedIndex = null;
    cosmicStore.setState({ selectedSatellite: null });
  }
}

// ─── Animation Loop ──────────────────────────────────────────────

let startTime = performance.now();
let lastFrameTime = performance.now();

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const deltaMs = now - lastFrameTime;
  lastFrameTime = now;
  const time = now - startTime;

  const visualOrrery = visualScaleLevel === ScaleLevel.SolarSystem || visualScaleLevel === ScaleLevel.Stellar;

  if (visualOrrery) {
    simulatedTime.update(deltaMs);
    pushTimeState();
  }

  orbitCamera.update();
  navigation.update();
  missionPreview.update();
  earth.update(time);

  const dateForMoon = visualOrrery ? simulatedTime.getDate() : new Date();
  if (visualOrrery) {
    moon.updateOrreryPosition(dateForMoon, earth.mesh.position);
  } else {
    moon.updatePosition(dateForMoon);
  }
  moon.setSunDirection(earth.sunDirection);

  const dateForPlanets = visualOrrery ? simulatedTime.getDate() : new Date();
  if (visualOrrery) {
    earth.updateOrreryPosition(dateForPlanets);
    mercury.updateOrreryPosition(dateForPlanets);
    venus.updateOrreryPosition(dateForPlanets);
    mars.updateOrreryPosition(dateForPlanets);
    jupiter.updateOrreryPosition(dateForPlanets);
    saturn.updateOrreryPosition(dateForPlanets);
    uranus.updateOrreryPosition(dateForPlanets);
    neptune.updateOrreryPosition(dateForPlanets);
  } else {
    mercury.updatePosition(dateForPlanets);
    venus.updatePosition(dateForPlanets);
    mars.updatePosition(dateForPlanets);
    jupiter.updatePosition(dateForPlanets);
    saturn.updatePosition(dateForPlanets);
    uranus.updatePosition(dateForPlanets);
    neptune.updatePosition(dateForPlanets);
  }

  jupiter.update(time);
  saturn.update(time);
  uranus.update(time);
  neptune.update(time);

  orbitalPaths.forEach(({ path }) => path.updateOpacity(0.06));
  oortCloud.updateOpacity(0.06);
  localBubble.update(time);
  localBubble.updateOpacity(0.06);
  orionArm.update(time);
  orionArm.updateOpacity(0.06);
  milkyWay.update(time);
  milkyWay.updateOpacity(0.06);

  worker.requestPositions(Date.now());
  renderer.render(scene, orbitCamera.camera);

  if (visualScaleLevel === ScaleLevel.Planet || visualScaleLevel === ScaleLevel.SolarSystem) {
    planetLabels.update();
    planetLabels.render(orbitCamera.camera);
  } else if (visualScaleLevel === ScaleLevel.Stellar) {
    starLabels.render(orbitCamera.camera);
  } else if (visualScaleLevel === ScaleLevel.LocalBubble) {
    localBubbleLabels.render(orbitCamera.camera);
  } else if (visualScaleLevel === ScaleLevel.OrionArm) {
    orionArmLabels.render(orbitCamera.camera);
  } else if (visualScaleLevel === ScaleLevel.MilkyWay) {
    milkyWayLabels.render(orbitCamera.camera);
  }

  // Push frame stats to bridge
  const altitude = orbitCamera.distanceMeters - 6_371_000;
  cosmicStore.setState({
    satelliteCount: satellites.count,
    viewingAltitude: altitude,
  });
}

window.addEventListener('resize', () => {
  orbitCamera.setAspect(window.innerWidth / window.innerHeight);
  renderer.resize();
});

// Push initial state
cosmicStore.setState({
  scaleLevel: ScaleLevel.Planet,
  canScaleUp: scaleLevelState.canGoUp(),
  canScaleDown: scaleLevelState.canGoDown(),
  satellitesEnabled: true,
  timePaused: true,
  timeSpeed: 1,
});

orbitCamera.setAspect(window.innerWidth / window.innerHeight);
animate();
