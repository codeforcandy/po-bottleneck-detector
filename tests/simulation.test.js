import { describe, it, expect } from 'vitest';
import { computeStagePositions, createSimulation } from '../src/simulation.js';
import { STAGES } from '../src/config.js';

describe('computeStagePositions', () => {
  it('returns positions for all stages', () => {
    const positions = computeStagePositions(1200);
    expect(Object.keys(positions)).toHaveLength(STAGES.length);
    STAGES.forEach((s) => expect(positions[s]).toBeGreaterThan(0));
  });

  it('distributes stages evenly', () => {
    const positions = computeStagePositions(1200);
    const vals = Object.values(positions);
    // Each position should increase
    for (let i = 1; i < vals.length; i++) {
      expect(vals[i]).toBeGreaterThan(vals[i - 1]);
    }
  });
});

describe('createSimulation', () => {
  it('creates a simulation with nodes', () => {
    const nodes = [
      { stage: 'draft', radius: 10 },
      { stage: 'approval', radius: 20 },
    ];
    const sim = createSimulation(nodes, 1200, 800);
    expect(sim).not.toBeNull();
    expect(sim.nodes()).toHaveLength(2);
  });

  it('returns null for empty nodes', () => {
    const sim = createSimulation([], 1200, 800);
    expect(sim).toBeNull();
  });

  it('returns null for null nodes', () => {
    const sim = createSimulation(null, 1200, 800);
    expect(sim).toBeNull();
  });

  it('handles single node', () => {
    const nodes = [{ stage: 'draft', radius: 10 }];
    const sim = createSimulation(nodes, 1200, 800);
    expect(sim).not.toBeNull();
    expect(sim.nodes()).toHaveLength(1);
  });

  it('handles all nodes in same stage', () => {
    const nodes = Array.from({ length: 50 }, () => ({ stage: 'approval', radius: 15 }));
    const sim = createSimulation(nodes, 1200, 800);
    expect(sim).not.toBeNull();
    // Run a few ticks to verify no crash
    for (let i = 0; i < 10; i++) sim.tick();
    expect(sim.alpha()).toBeLessThan(1);
  });
});
