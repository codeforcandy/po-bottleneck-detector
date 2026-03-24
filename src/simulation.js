/**
 * D3 force simulation setup and Web Worker integration.
 */

import { forceSimulation, forceX, forceY, forceCollide, forceManyBody } from 'd3-force';
import { STAGES } from './config.js';

/**
 * Compute X positions for each stage column.
 */
export function computeStagePositions(width) {
  const positions = {};
  const count = STAGES.length;
  STAGES.forEach((stage, i) => {
    positions[stage] = ((i + 0.5) / count) * width;
  });
  return positions;
}

/**
 * Create a force simulation on the main thread (fallback if worker fails).
 */
export function createSimulation(nodes, width, height, onTick) {
  if (!nodes || nodes.length === 0) {
    if (onTick) onTick([]);
    return null;
  }

  const stagePositions = computeStagePositions(width);

  const sim = forceSimulation(nodes)
    .force('x', forceX((d) => stagePositions[d.stage] || width / 2).strength(0.3))
    .force('y', forceY(height / 2).strength(0.05))
    .force('collide', forceCollide((d) => d.radius + 2).iterations(4))
    .force('charge', forceManyBody().strength(-3))
    .alphaDecay(0.05);

  if (onTick) {
    sim.on('tick', () => onTick(nodes));
  }

  return sim;
}

/**
 * Run simulation in a Web Worker. Returns a Promise of settled positions.
 * Falls back to main thread if worker fails.
 */
export function runSimulationWorker(nodes, width, height) {
  return new Promise((resolve) => {
    try {
      const worker = new Worker(
        new URL('./simulation.worker.js', import.meta.url),
        { type: 'module' }
      );

      const timeout = setTimeout(() => {
        worker.terminate();
        // Fallback to main thread
        runMainThread(nodes, width, height, resolve);
      }, 12000);

      worker.onmessage = (event) => {
        clearTimeout(timeout);
        worker.terminate();
        if (event.data.type === 'settled') {
          // Merge positions back into original nodes
          const posMap = new Map(event.data.nodes.map((n) => [n.index, n]));
          nodes.forEach((node, i) => {
            const pos = posMap.get(i);
            if (pos) {
              node.x = pos.x;
              node.y = pos.y;
            }
          });
          resolve(nodes);
        } else {
          runMainThread(nodes, width, height, resolve);
        }
      };

      worker.onerror = () => {
        clearTimeout(timeout);
        worker.terminate();
        runMainThread(nodes, width, height, resolve);
      };

      const stagePositions = computeStagePositions(width);
      worker.postMessage({
        nodes: nodes.map((n, i) => ({ ...n, index: i, entered_stage_date: undefined })),
        stagePositions,
        width,
        height,
      });
    } catch {
      runMainThread(nodes, width, height, resolve);
    }
  });
}

function runMainThread(nodes, width, height, resolve) {
  const sim = createSimulation(nodes, width, height);
  if (!sim) { resolve(nodes); return; }
  sim.stop();
  for (let i = 0; i < 300; i++) {
    sim.tick();
    if (sim.alpha() < sim.alphaMin()) break;
  }
  resolve(nodes);
}
