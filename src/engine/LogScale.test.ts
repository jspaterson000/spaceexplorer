import { describe, it, expect } from 'vitest';
import { LogScale } from './LogScale';

describe('LogScale', () => {
  describe('metersToLogDistance', () => {
    it('converts 1000 meters to log10(1000) = 3', () => {
      expect(LogScale.metersToLogDistance(1000)).toBeCloseTo(3, 5);
    });

    it('converts Earth radius (~6.371e6m) to ~6.8', () => {
      expect(LogScale.metersToLogDistance(6_371_000)).toBeCloseTo(6.804, 2);
    });

    it('handles very small distances with floor of 1 meter', () => {
      expect(LogScale.metersToLogDistance(0.1)).toBe(0);
    });
  });

  describe('logDistanceToMeters', () => {
    it('converts log 3 to 1000 meters', () => {
      expect(LogScale.logDistanceToMeters(3)).toBe(1000);
    });

    it('converts log 6 to 1,000,000 meters', () => {
      expect(LogScale.logDistanceToMeters(6)).toBe(1_000_000);
    });
  });

  describe('clampZoom', () => {
    it('clamps zoom within Phase 1 range (0-6)', () => {
      expect(LogScale.clampZoom(-1, 0, 6)).toBe(0);
      expect(LogScale.clampZoom(7, 0, 6)).toBe(6);
      expect(LogScale.clampZoom(3, 0, 6)).toBe(3);
    });
  });

  describe('formatDistance', () => {
    it('formats meters for small distances', () => {
      expect(LogScale.formatDistance(500)).toBe('500 m');
    });

    it('formats kilometers for medium distances', () => {
      expect(LogScale.formatDistance(42_000)).toBe('42 km');
    });

    it('formats with decimal for km', () => {
      expect(LogScale.formatDistance(1_500)).toBe('1.5 km');
    });
  });

  describe('orrery scaling', () => {
    it('applies square root to orbit distance', () => {
      // Earth at 1 AU stays at 1
      expect(LogScale.orreryOrbitScale(1)).toBeCloseTo(1, 5);
      // Neptune at 30 AU becomes ~5.48
      expect(LogScale.orreryOrbitScale(30)).toBeCloseTo(5.477, 2);
      // Mercury at 0.39 AU becomes ~0.62
      expect(LogScale.orreryOrbitScale(0.39)).toBeCloseTo(0.624, 2);
    });

    it('compresses planet size ratios', () => {
      // Jupiter real = 11x Earth, orrery = ~3x
      const jupiterReal = 11;
      const earthReal = 1;
      const jupiterOrrery = LogScale.orreryPlanetScale(jupiterReal);
      const earthOrrery = LogScale.orreryPlanetScale(earthReal);
      expect(jupiterOrrery / earthOrrery).toBeCloseTo(3, 0);

      // Mercury real = 0.38x Earth, orrery = ~0.65x
      const mercuryReal = 0.38;
      const mercuryOrrery = LogScale.orreryPlanetScale(mercuryReal);
      expect(mercuryOrrery / earthOrrery).toBeCloseTo(0.65, 1);
    });
  });
});
