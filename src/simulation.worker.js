/**
 * Web Worker for force simulation pre-computation.
 * Runs physics ticks in background thread to avoid freezing the UI.
 */

import { forceSimulation, forceX, forceY, forceCollide, forceManyBody } from 'd3-force';

const TIMEOUT_MS = 10000;

self.onmessage = function (event) {
  const { nodes, stagePositions, width, height } = event.data;

  try {
    const sim = forceSimulation(nodes)
      .force('x', forceX((d) => stagePositions[d.stage] || width / 2).strength(0.3))
      .force('y', forceY(height / 2).strength(0.05))
      .force('collide', forceCollide((d) => d.radius + 2).iterations(4))
      .force('charge', forceManyBody().strength(-3))
      .alphaDecay(0.05)
      .stop();

    const timeout = setTimeout(() => {
      self.postMessage({ type: 'settled', nodes: nodes.map(serializeNode) });
    }, TIMEOUT_MS);

    // Run ticks until settled
    const maxTicks = 300;
    for (let i = 0; i < maxTicks; i++) {
      sim.tick();
      if (sim.alpha() < sim.alphaMin()) break;
    }

    clearTimeout(timeout);
    self.postMessage({ type: 'settled', nodes: nodes.map(serializeNode) });
  } catch (err) {
    self.postMessage({ type: 'error', message: err.message });
  }
};

function serializeNode(n) {
  return { index: n.index, x: n.x, y: n.y, vx: n.vx, vy: n.vy };
}
