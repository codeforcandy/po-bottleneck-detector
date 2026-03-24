/**
 * SVG rendering path for < 1,000 nodes.
 * Full DOM interactivity — hover, click, zoom/pan.
 */

import { select } from 'd3-selection';
import { zoom } from 'd3-zoom';
import { showTooltip, hideTooltip } from './tooltip.js';
import { showDetailPanel } from './detail-panel.js';
import { STAGES, STAGE_LABELS, COLORS } from './config.js';
import { computeStagePositions } from './simulation.js';

export function renderSVG(container, nodes, width, height) {
  // Clear previous
  container.replaceChildren();

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('aria-label', 'PO Bottleneck Visualization');
  svg.style.background = COLORS.canvas;
  container.appendChild(svg);

  const svgSel = select(svg);

  // Zoom group
  const g = svgSel.append('g');

  // Enable zoom/pan
  const zoomBehavior = zoom()
    .scaleExtent([0.3, 4])
    .on('zoom', (event) => g.attr('transform', event.transform));
  svgSel.call(zoomBehavior);

  // Stage column lines
  const stagePositions = computeStagePositions(width);
  STAGES.forEach((stage) => {
    const x = stagePositions[stage];
    g.append('line')
      .attr('x1', x).attr('y1', 0)
      .attr('x2', x).attr('y2', height)
      .attr('stroke', COLORS.borderEm)
      .attr('stroke-dasharray', '4,4')
      .attr('opacity', 0.3);
    g.append('text')
      .attr('x', x).attr('y', 24)
      .attr('text-anchor', 'middle')
      .attr('fill', COLORS.borderEm)
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('letter-spacing', '1.2px')
      .text(STAGE_LABELS[stage].toUpperCase());
  });

  // Render nodes
  const nodeGroups = g.selectAll('.po-node')
    .data(nodes)
    .enter()
    .append('g')
    .attr('class', (d) => `po-node ${d.severity}`)
    .attr('transform', (d) => `translate(${d.x},${d.y})`);

  // Circle with encoding
  nodeGroups.append('circle')
    .attr('r', (d) => d.radius)
    .attr('fill', (d) => d.color)
    .attr('fill-opacity', (d) => d.opacity * 0.4)
    .attr('stroke', (d) => d.color)
    .attr('stroke-width', (d) => d.severity === 'critical' ? 1.5 : 1)
    .attr('stroke-dasharray', (d) => {
      if (d.borderStyle === 'dashed') return '4,3';
      if (d.borderStyle === 'dotted') return '2,2';
      return 'none';
    })
    .attr('stroke-opacity', (d) => d.opacity);

  // Day count label for warning/critical
  nodeGroups.filter((d) => d.severity !== 'healthy')
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .attr('fill', 'rgba(255,255,255,0.9)')
    .attr('font-size', (d) => Math.max(8, d.radius * 0.45) + 'px')
    .attr('font-weight', '600')
    .text((d) => `${d.daysStuck}d`);

  // Interactions
  nodeGroups
    .on('mouseenter', (event, d) => {
      const [x, y] = [event.pageX, event.pageY];
      showTooltip(d, x, y);
      select(event.currentTarget).select('circle')
        .transition().duration(150)
        .attr('r', d.radius * 1.15);
    })
    .on('mouseleave', (event, d) => {
      hideTooltip();
      select(event.currentTarget).select('circle')
        .transition().duration(150)
        .attr('r', d.radius);
    })
    .on('click', (event, d) => {
      showDetailPanel(d);
    })
    .style('cursor', 'pointer');

  return svg;
}
