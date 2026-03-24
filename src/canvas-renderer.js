/**
 * Canvas rendering path for 1,000-2,000 nodes.
 * Uses devicePixelRatio for Retina, d3-quadtree for hit-testing.
 */

import { quadtree } from 'd3-quadtree';
import { showTooltip, hideTooltip } from './tooltip.js';
import { showDetailPanel } from './detail-panel.js';
import { STAGES, STAGE_LABELS, COLORS } from './config.js';
import { computeStagePositions } from './simulation.js';

export function renderCanvas(container, nodes, width, height) {
  container.replaceChildren();

  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement('canvas');
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-roledescription', 'interactive data visualization');
  canvas.setAttribute('aria-label', 'PO Bottleneck Visualization');
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // Build quadtree for hit-testing
  const tree = quadtree()
    .x((d) => d.x)
    .y((d) => d.y)
    .addAll(nodes);

  // Draw
  drawFrame(ctx, nodes, width, height);

  // Throttled mousemove for hover
  let rafId = null;
  let hoveredNode = null;

  canvas.addEventListener('mousemove', (event) => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      const rect = canvas.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;
      const found = findNode(tree, mx, my, nodes);

      if (found !== hoveredNode) {
        hoveredNode = found;
        drawFrame(ctx, nodes, width, height, hoveredNode);
        if (found) {
          showTooltip(found, event.pageX, event.pageY);
        } else {
          hideTooltip();
        }
      }
    });
  });

  canvas.addEventListener('mouseleave', () => {
    hoveredNode = null;
    hideTooltip();
    drawFrame(ctx, nodes, width, height);
  });

  canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    const found = findNode(tree, mx, my, nodes);
    if (found) showDetailPanel(found);
  });

  canvas.style.cursor = 'crosshair';
  return canvas;
}

function findNode(tree, mx, my, nodes) {
  const found = tree.find(mx, my, 50);
  if (!found) return null;
  const dist = Math.sqrt((found.x - mx) ** 2 + (found.y - my) ** 2);
  return dist <= found.radius ? found : null;
}

function drawFrame(ctx, nodes, width, height, hoveredNode) {
  // Background
  ctx.fillStyle = COLORS.canvas;
  ctx.fillRect(0, 0, width, height);

  // Stage columns
  const stagePositions = computeStagePositions(width);
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = COLORS.borderEm;
  ctx.globalAlpha = 0.3;
  ctx.font = '600 11px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.borderEm;

  STAGES.forEach((stage) => {
    const x = stagePositions[stage];
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
    ctx.fillText(STAGE_LABELS[stage].toUpperCase(), x, 24);
  });
  ctx.restore();

  // Nodes
  nodes.forEach((node) => {
    const isHovered = node === hoveredNode;
    const r = isHovered ? node.radius * 1.15 : node.radius;

    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2);

    // Fill
    ctx.globalAlpha = node.opacity * 0.4;
    ctx.fillStyle = node.color;
    ctx.fill();

    // Stroke with accessibility border
    ctx.globalAlpha = node.opacity;
    ctx.strokeStyle = node.color;
    ctx.lineWidth = node.severity === 'critical' ? 1.5 : 1;
    if (node.borderStyle === 'dashed') {
      ctx.setLineDash([4, 3]);
    } else if (node.borderStyle === 'dotted') {
      ctx.setLineDash([2, 2]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Day count label for warning/critical
    if (node.severity !== 'healthy') {
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#fff';
      ctx.font = `600 ${Math.max(8, node.radius * 0.45)}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${node.daysStuck}d`, node.x, node.y);
    }
  });

  ctx.globalAlpha = 1;
}
