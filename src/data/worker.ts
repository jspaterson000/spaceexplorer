// src/data/worker.ts
import * as satellite from 'satellite.js';
import type { TLE } from './types';

interface WorkerMessage {
  type: 'init' | 'propagate';
  tles?: TLE[];
  time?: number;
}

interface WorkerResponse {
  type: 'ready' | 'positions';
  positions?: Float32Array;
  count?: number;
}

let satRecs: satellite.SatRec[] = [];
let tleData: TLE[] = [];

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type } = event.data;

  if (type === 'init' && event.data.tles) {
    tleData = event.data.tles;
    satRecs = tleData.map(tle => {
      try {
        return satellite.twoline2satrec(tle.line1, tle.line2);
      } catch {
        return null;
      }
    }).filter((s): s is satellite.SatRec => s !== null);

    const response: WorkerResponse = { type: 'ready', count: satRecs.length };
    self.postMessage(response);
  }

  if (type === 'propagate' && event.data.time !== undefined) {
    const date = new Date(event.data.time);
    const positions = new Float32Array(satRecs.length * 6); // x,y,z,vx,vy,vz

    for (let i = 0; i < satRecs.length; i++) {
      try {
        const posVel = satellite.propagate(satRecs[i], date);

        if (posVel.position && typeof posVel.position !== 'boolean') {
          const pos = posVel.position as satellite.EciVec3<number>;
          const vel = posVel.velocity as satellite.EciVec3<number>;

          // Convert from km to meters
          positions[i * 6 + 0] = pos.x * 1000;
          positions[i * 6 + 1] = pos.y * 1000;
          positions[i * 6 + 2] = pos.z * 1000;
          positions[i * 6 + 3] = vel.x * 1000;
          positions[i * 6 + 4] = vel.y * 1000;
          positions[i * 6 + 5] = vel.z * 1000;
        }
      } catch {
        // Leave as zeros
      }
    }

    const response: WorkerResponse = { type: 'positions', positions };
    self.postMessage(response, [positions.buffer]);
  }
};
