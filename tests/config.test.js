import { describe, it, expect, beforeEach } from 'vitest';
import { getThresholds, setThresholds, resetThresholds } from '../src/config.js';

describe('getThresholds', () => {
  beforeEach(() => resetThresholds());

  it('returns default thresholds for known stage', () => {
    const t = getThresholds('approval');
    expect(t).toEqual({ warning: 2, critical: 5 });
  });

  it('returns fallback for unknown stage', () => {
    const t = getThresholds('nonexistent');
    expect(t).toEqual({ warning: 3, critical: 7 });
  });

  it('returns custom thresholds when set', () => {
    setThresholds('approval', { warning: 1, critical: 3 });
    expect(getThresholds('approval')).toEqual({ warning: 1, critical: 3 });
  });
});
