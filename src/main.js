/**
 * Entry point — app state, upload handler, renderer switching.
 */

import { parseFile } from './parser.js';
import { encodeNode } from './encoding.js';
import { runSimulationWorker } from './simulation.js';
import { renderSVG } from './svg-renderer.js';
import { renderCanvas } from './canvas-renderer.js';
import { hideTooltip } from './tooltip.js';
import { hideDetailPanel } from './detail-panel.js';
import { RENDERER_THRESHOLDS, COLORS } from './config.js';
import './styles.css';

// State
let currentNodes = [];
let activeFilter = null;

// DOM refs
const dropZone = document.getElementById('drop-zone');
const vizContainer = document.getElementById('viz-container');
const topBar = document.getElementById('top-bar');
const criticalCount = document.getElementById('critical-count');
const warningCount = document.getElementById('warning-count');
const healthyCount = document.getElementById('healthy-count');
const errorBanner = document.getElementById('error-banner');
const loadingIndicator = document.getElementById('loading');

// Drop zone interactions
if (dropZone) {
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  // Click to browse
  const fileInput = document.getElementById('file-input');
  dropZone.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  });
}

// Top bar filter interaction
document.querySelectorAll('.stat-card').forEach((card) => {
  card.addEventListener('click', () => {
    const filter = card.dataset.filter;
    if (activeFilter === filter) {
      activeFilter = null;
      card.classList.remove('active');
    } else {
      document.querySelectorAll('.stat-card').forEach((c) => c.classList.remove('active'));
      activeFilter = filter;
      card.classList.add('active');
    }
    applyFilter();
  });
});

function applyFilter() {
  // Re-render with filter applied (update node opacity)
  if (currentNodes.length > 0) {
    const filtered = currentNodes.map((n) => ({
      ...n,
      filteredOpacity: activeFilter && n.severity !== activeFilter ? 0.05 : n.opacity,
    }));
    render(filtered);
  }
}

async function handleFile(file) {
  showLoading(true);
  showError(null);
  hideTooltip();
  hideDetailPanel();

  try {
    const result = await parseFile(file);

    if (result.errors.length > 0 && result.data.length === 0) {
      showError(result.errors[0]);
      showLoading(false);
      return;
    }

    if (result.skipped > 0) {
      showWarning(`${result.skipped} row${result.skipped > 1 ? 's' : ''} skipped`);
    }

    if (result.data.length === 0) {
      showError('No valid PO data found in file');
      showLoading(false);
      return;
    }

    // Encode all nodes
    const maxDays = Math.max(...result.data.map((d) => {
      const diff = Date.now() - new Date(d.entered_stage_date).getTime();
      return Math.floor(diff / (1000 * 60 * 60 * 24));
    }), 1);

    const nodes = result.data.map((d) => encodeNode(d, maxDays));
    currentNodes = nodes;

    // Update top bar
    updateCounts(nodes);

    // Show viz container, hide drop zone
    dropZone.style.display = 'none';
    vizContainer.style.display = 'block';

    // Run simulation
    const width = vizContainer.clientWidth;
    const height = vizContainer.clientHeight;

    const settled = await runSimulationWorker(nodes, width, height);
    showLoading(false);

    render(settled);
  } catch (err) {
    showError('Failed to process file: ' + err.message);
    showLoading(false);
  }
}

function render(nodes) {
  const width = vizContainer.clientWidth;
  const height = vizContainer.clientHeight;
  const count = nodes.length;

  if (count < RENDERER_THRESHOLDS.svgMax) {
    renderSVG(vizContainer, nodes, width, height);
  } else {
    renderCanvas(vizContainer, nodes, width, height);
  }
}

function updateCounts(nodes) {
  const counts = { critical: 0, warning: 0, healthy: 0 };
  nodes.forEach((n) => counts[n.severity]++);

  animateCount(criticalCount, counts.critical);
  animateCount(warningCount, counts.warning);
  animateCount(healthyCount, counts.healthy);
  topBar.classList.add('visible');
}

function animateCount(el, target) {
  if (!el) return;
  let current = 0;
  const duration = 500;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    current = Math.round(progress * target);
    el.textContent = current;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function showLoading(show) {
  if (loadingIndicator) loadingIndicator.style.display = show ? 'flex' : 'none';
}

function showError(msg) {
  if (!errorBanner) return;
  if (msg) {
    errorBanner.textContent = msg;
    errorBanner.className = 'banner error';
    errorBanner.style.display = 'block';
  } else {
    errorBanner.style.display = 'none';
  }
}

function showWarning(msg) {
  if (!errorBanner) return;
  errorBanner.textContent = msg;
  errorBanner.className = 'banner warning';
  errorBanner.style.display = 'block';
  setTimeout(() => { errorBanner.style.display = 'none'; }, 5000);
}
