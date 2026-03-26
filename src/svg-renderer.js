/**
 * SVG rendering path for < 1,000 nodes.
 * "Go beyond" — animated flow particles, entrance stagger, hover ripples,
 * stage health gradients, vendor connection lines.
 */

import { select, selectAll } from 'd3-selection';
import { zoom } from 'd3-zoom';
import { scaleLinear } from 'd3-scale';
import { showTooltip, hideTooltip } from './tooltip.js';
import { showDetailPanel } from './detail-panel.js';
import { STAGES, STAGE_LABELS, COLORS } from './config.js';
import { computeStagePositions } from './simulation.js';
import 'd3-transition'; // enable .transition()

export function renderSVG(container, nodes, width, height) {
  container.replaceChildren();

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('aria-label', 'PO Bottleneck Visualization');
  svg.style.background = COLORS.canvas;
  container.appendChild(svg);

  const svgSel = select(svg);
  const stagePositions = computeStagePositions(width);

  // ── SVG Definitions (gradients, filters, glow) ──────────────
  const defs = svgSel.append('defs');

  // Radial glow filter for critical nodes
  const glowFilter = defs.append('filter').attr('id', 'glow');
  glowFilter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur');
  glowFilter.append('feMerge')
    .selectAll('feMergeNode')
    .data(['blur', 'SourceGraphic'])
    .enter().append('feMergeNode')
    .attr('in', (d) => d);

  // Ripple gradient (for hover effect)
  const rippleGrad = defs.append('radialGradient').attr('id', 'ripple-grad');
  rippleGrad.append('stop').attr('offset', '0%').attr('stop-color', 'white').attr('stop-opacity', 0.3);
  rippleGrad.append('stop').attr('offset', '100%').attr('stop-color', 'white').attr('stop-opacity', 0);

  // Stage health gradients
  STAGES.forEach((stage, i) => {
    const stageNodes = nodes.filter((n) => n.stage === stage);
    const critCount = stageNodes.filter((n) => n.severity === 'critical').length;
    const total = stageNodes.length || 1;
    const severity = critCount / total;

    const grad = defs.append('linearGradient')
      .attr('id', `stage-grad-${i}`)
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');

    const color = severity > 0.5 ? COLORS.critical : severity > 0.2 ? COLORS.warning : COLORS.healthy;
    grad.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 0.08);
    grad.append('stop').attr('offset', '50%').attr('stop-color', color).attr('stop-opacity', 0.03);
    grad.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0);
  });

  // ── Zoom group ──────────────────────────────────────────────
  const g = svgSel.append('g');
  const zoomBehavior = zoom()
    .scaleExtent([0.3, 4])
    .on('zoom', (event) => g.attr('transform', event.transform));
  svgSel.call(zoomBehavior);

  // ── Stage health gradient backgrounds ───────────────────────
  const colWidth = width / STAGES.length;
  STAGES.forEach((stage, i) => {
    const x = stagePositions[stage] - colWidth / 2;
    g.append('rect')
      .attr('x', x)
      .attr('y', 0)
      .attr('width', colWidth)
      .attr('height', height)
      .attr('fill', `url(#stage-grad-${i})`)
      .attr('pointer-events', 'none');
  });

  // ── Stage column lines ──────────────────────────────────────
  STAGES.forEach((stage) => {
    const x = stagePositions[stage];
    g.append('line')
      .attr('x1', x).attr('y1', 0)
      .attr('x2', x).attr('y2', height)
      .attr('stroke', COLORS.borderEm)
      .attr('stroke-dasharray', '4,4')
      .attr('opacity', 0.2);
    g.append('text')
      .attr('x', x).attr('y', 24)
      .attr('text-anchor', 'middle')
      .attr('fill', COLORS.borderEm)
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('letter-spacing', '1.2px')
      .text(STAGE_LABELS[stage].toUpperCase());
  });

  // ── Flow particles between stages ───────────────────────────
  const particleGroup = g.append('g').attr('class', 'flow-particles');
  startFlowParticles(particleGroup, stagePositions, nodes, height);

  // ── Vendor connection lines (faint) ─────────────────────────
  const vendorMap = new Map();
  nodes.forEach((n) => {
    if (!vendorMap.has(n.vendor)) vendorMap.set(n.vendor, []);
    vendorMap.get(n.vendor).push(n);
  });
  const connectionGroup = g.append('g').attr('class', 'vendor-connections');
  vendorMap.forEach((vendorNodes) => {
    if (vendorNodes.length < 2) return;
    for (let i = 0; i < vendorNodes.length - 1; i++) {
      const a = vendorNodes[i];
      const b = vendorNodes[i + 1];
      connectionGroup.append('line')
        .attr('x1', a.x).attr('y1', a.y)
        .attr('x2', b.x).attr('y2', b.y)
        .attr('stroke', COLORS.textMuted)
        .attr('stroke-opacity', 0.06)
        .attr('stroke-width', 0.5)
        .attr('stroke-dasharray', '2,4');
    }
  });

  // ── Render nodes with entrance animation ────────────────────
  const nodeGroups = g.selectAll('.po-node')
    .data(nodes)
    .enter()
    .append('g')
    .attr('class', (d) => `po-node ${d.severity}`)
    .attr('transform', `translate(${width / 2},${height / 2})`) // start from center
    .style('opacity', 0);

  // Staggered entrance animation
  nodeGroups.transition()
    .delay((d, i) => i * 50) // 50ms stagger per node
    .duration(800)
    .ease(springEase)
    .attr('transform', (d) => `translate(${d.x},${d.y})`)
    .style('opacity', 1);

  // Circle with encoding
  nodeGroups.append('circle')
    .attr('class', 'node-circle')
    .attr('r', 0) // start at 0 for entrance animation
    .attr('fill', (d) => d.color)
    .attr('fill-opacity', (d) => (d.filteredOpacity ?? d.opacity) * 0.4)
    .attr('stroke', (d) => d.color)
    .attr('stroke-width', (d) => d.severity === 'critical' ? 1.5 : 1)
    .attr('stroke-dasharray', (d) => {
      if (d.borderStyle === 'dashed') return '4,3';
      if (d.borderStyle === 'dotted') return '2,2';
      return 'none';
    })
    .attr('stroke-opacity', (d) => d.filteredOpacity ?? d.opacity)
    .attr('filter', (d) => d.severity === 'critical' ? 'url(#glow)' : null)
    .transition()
    .delay((d, i) => i * 50 + 200) // start after position settles
    .duration(600)
    .ease(springEase)
    .attr('r', (d) => d.radius);

  // Outer glow ring for critical nodes (pulsing)
  nodeGroups.filter((d) => d.severity === 'critical')
    .append('circle')
    .attr('class', 'glow-ring')
    .attr('r', (d) => d.radius + 8)
    .attr('fill', 'none')
    .attr('stroke', COLORS.critical)
    .attr('stroke-width', 1)
    .attr('stroke-opacity', 0)
    .style('animation', 'ring-pulse 2s ease-in-out infinite');

  // Day count label for warning/critical
  nodeGroups.filter((d) => d.severity !== 'healthy')
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .attr('fill', 'rgba(255,255,255,0.9)')
    .attr('font-size', (d) => Math.max(8, d.radius * 0.45) + 'px')
    .attr('font-weight', '600')
    .attr('pointer-events', 'none')
    .style('opacity', 0)
    .text((d) => `${d.daysStuck}d`)
    .transition()
    .delay((d, i) => i * 50 + 600)
    .duration(300)
    .style('opacity', 1);

  // ── Interactions with ripple effect ─────────────────────────
  nodeGroups
    .on('mouseenter', function (event, d) {
      const [x, y] = [event.pageX, event.pageY];
      showTooltip(d, x, y);

      // Scale up
      select(this).select('.node-circle')
        .transition().duration(150)
        .attr('r', d.radius * 1.2);

      // Spawn ripple
      const ripple = select(this).append('circle')
        .attr('class', 'ripple')
        .attr('r', d.radius)
        .attr('fill', 'url(#ripple-grad)')
        .attr('pointer-events', 'none');

      ripple.transition()
        .duration(600)
        .attr('r', d.radius * 3)
        .style('opacity', 0)
        .remove();

      // Highlight vendor connections
      connectionGroup.selectAll('line')
        .filter(function () {
          const x1 = +this.getAttribute('x1');
          const y1 = +this.getAttribute('y1');
          const x2 = +this.getAttribute('x2');
          const y2 = +this.getAttribute('y2');
          return (Math.abs(x1 - d.x) < 1 && Math.abs(y1 - d.y) < 1) ||
                 (Math.abs(x2 - d.x) < 1 && Math.abs(y2 - d.y) < 1);
        })
        .transition().duration(200)
        .attr('stroke-opacity', 0.3)
        .attr('stroke-width', 1.5);
    })
    .on('mouseleave', function (event, d) {
      hideTooltip();
      select(this).select('.node-circle')
        .transition().duration(200)
        .attr('r', d.radius);

      // Fade vendor connections back
      connectionGroup.selectAll('line')
        .transition().duration(300)
        .attr('stroke-opacity', 0.06)
        .attr('stroke-width', 0.5);
    })
    .on('click', (event, d) => {
      showDetailPanel(d);
    })
    .style('cursor', 'pointer');

  return svg;
}

// ── Flow Particles ────────────────────────────────────────────
// Glowing dots that travel between stage columns showing throughput

function startFlowParticles(group, stagePositions, nodes, height) {
  const stageOrder = STAGES.filter((s) => s !== 'closed');

  function spawnParticle() {
    const fromIdx = Math.floor(Math.random() * (stageOrder.length - 1));
    const fromStage = stageOrder[fromIdx];
    const toStage = stageOrder[fromIdx + 1];

    const fromX = stagePositions[fromStage];
    const toX = stagePositions[toStage];
    const y = 60 + Math.random() * (height - 120);

    // Color based on destination stage health
    const destNodes = nodes.filter((n) => n.stage === toStage);
    const critRatio = destNodes.filter((n) => n.severity === 'critical').length / (destNodes.length || 1);
    const color = critRatio > 0.5 ? COLORS.critical : critRatio > 0.2 ? COLORS.warning : COLORS.healthy;

    const midX = (fromX + toX) / 2;
    const curveY = y + (Math.random() - 0.5) * 40;

    const particle = group.append('circle')
      .attr('cx', fromX)
      .attr('cy', y)
      .attr('r', 1.5 + Math.random() * 1.5)
      .attr('fill', color)
      .attr('opacity', 0.4 + Math.random() * 0.3);

    // Animate along a subtle curve
    const duration = 2000 + Math.random() * 3000;
    particle.transition()
      .duration(duration / 2)
      .attr('cx', midX)
      .attr('cy', curveY)
      .attr('opacity', 0.6)
      .transition()
      .duration(duration / 2)
      .attr('cx', toX)
      .attr('cy', y + (Math.random() - 0.5) * 20)
      .attr('opacity', 0)
      .remove();
  }

  // Spawn particles continuously
  const interval = setInterval(() => {
    if (!document.contains(group.node())) {
      clearInterval(interval);
      return;
    }
    spawnParticle();
  }, 300 + Math.random() * 400);

  // Initial burst
  for (let i = 0; i < 8; i++) {
    setTimeout(spawnParticle, i * 200);
  }
}

// ── Spring easing function ────────────────────────────────────
// Gives nodes a slight overshoot-and-settle feel

function springEase(t) {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 :
    Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}
