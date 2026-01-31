import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SimulatedTime } from './SimulatedTime';

describe('SimulatedTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-31T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts paused at current real time', () => {
    const sim = new SimulatedTime();
    expect(sim.isPaused).toBe(true);
    expect(sim.getDate().toISOString()).toBe('2026-01-31T12:00:00.000Z');
  });

  it('does not advance time when paused', () => {
    const sim = new SimulatedTime();
    const initial = sim.getDate().getTime();
    sim.update(1000); // 1 second delta
    expect(sim.getDate().getTime()).toBe(initial);
  });

  it('advances time when playing at 1 day/sec', () => {
    const sim = new SimulatedTime();
    sim.setSpeed(1); // 1 day per second
    sim.play();
    sim.update(1000); // 1 second of real time
    const expected = new Date('2026-02-01T12:00:00.000Z');
    expect(sim.getDate().getTime()).toBe(expected.getTime());
  });

  it('advances time at 7 days/sec speed', () => {
    const sim = new SimulatedTime();
    sim.setSpeed(7);
    sim.play();
    sim.update(1000); // 1 second
    const expected = new Date('2026-02-07T12:00:00.000Z');
    expect(sim.getDate().getTime()).toBe(expected.getTime());
  });

  it('can pause playback', () => {
    const sim = new SimulatedTime();
    sim.play();
    expect(sim.isPaused).toBe(false);
    sim.pause();
    expect(sim.isPaused).toBe(true);
  });

  it('resets to real time', () => {
    const sim = new SimulatedTime();
    sim.setSpeed(1);
    sim.play();
    sim.update(5000); // advance 5 days
    sim.reset();
    expect(sim.getDate().toISOString()).toBe('2026-01-31T12:00:00.000Z');
    expect(sim.isPaused).toBe(true);
  });

  it('can step forward', () => {
    const sim = new SimulatedTime();
    sim.stepForward(); // default 1 day
    const expected = new Date('2026-02-01T12:00:00.000Z');
    expect(sim.getDate().getTime()).toBe(expected.getTime());
  });

  it('can step backward', () => {
    const sim = new SimulatedTime();
    sim.stepBackward();
    const expected = new Date('2026-01-30T12:00:00.000Z');
    expect(sim.getDate().getTime()).toBe(expected.getTime());
  });
});
