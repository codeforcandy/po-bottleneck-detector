import { describe, it, expect } from 'vitest';
import { RENDERER_THRESHOLDS } from '../src/config.js';

describe('Renderer switching logic', () => {
  function selectRenderer(nodeCount) {
    if (nodeCount < RENDERER_THRESHOLDS.svgMax) return 'svg';
    if (nodeCount < RENDERER_THRESHOLDS.canvasMax) return 'canvas';
    return 'canvas+cluster';
  }

  it('uses SVG for < 1000 nodes', () => {
    expect(selectRenderer(500)).toBe('svg');
  });

  it('uses SVG for 999 nodes', () => {
    expect(selectRenderer(999)).toBe('svg');
  });

  it('uses Canvas for 1000 nodes', () => {
    expect(selectRenderer(1000)).toBe('canvas');
  });

  it('uses Canvas for 1500 nodes', () => {
    expect(selectRenderer(1500)).toBe('canvas');
  });

  it('uses Canvas+cluster for 2000 nodes', () => {
    expect(selectRenderer(2000)).toBe('canvas+cluster');
  });

  it('uses Canvas+cluster for 5000 nodes', () => {
    expect(selectRenderer(5000)).toBe('canvas+cluster');
  });

  it('uses SVG for 0 nodes', () => {
    expect(selectRenderer(0)).toBe('svg');
  });
});
