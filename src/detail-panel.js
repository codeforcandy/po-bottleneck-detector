/**
 * Detail panel — slide-in from right showing PO journey timeline.
 * Uses vertical timeline with stage dots (subway-map style).
 */

import { STAGES, STAGE_LABELS, COLORS } from './config.js';

let panelEl = null;
let currentPoId = null;

function ensurePanel() {
  if (panelEl) return panelEl;
  panelEl = document.createElement('div');
  panelEl.id = 'detail-panel';
  panelEl.className = 'detail-panel';
  document.body.appendChild(panelEl);

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideDetailPanel();
  });

  return panelEl;
}

function createEl(tag, className, textContent) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (textContent) el.textContent = textContent;
  return el;
}

export function showDetailPanel(node) {
  const el = ensurePanel();
  currentPoId = node.po_id;

  // Clear safely
  while (el.firstChild) el.removeChild(el.firstChild);

  // Close button
  const closeBtn = createEl('button', 'detail-close', '\u00d7');
  closeBtn.addEventListener('click', hideDetailPanel);
  el.appendChild(closeBtn);

  // Header
  el.appendChild(createEl('div', 'detail-po-id', node.po_id));
  el.appendChild(createEl('div', 'detail-vendor', node.vendor));

  // Info rows
  const infoGrid = createEl('div', 'detail-info');
  const addInfo = (label, value) => {
    const row = createEl('div', 'detail-info-row');
    row.appendChild(createEl('span', 'detail-label', label));
    row.appendChild(createEl('span', 'detail-value', value));
    infoGrid.appendChild(row);
  };
  addInfo('Amount', `$${Number(node.amount).toLocaleString()}`);
  addInfo('Requester', node.requester);
  addInfo('Days Stuck', `${node.daysStuck} days`);
  addInfo('Current Stage', STAGE_LABELS[node.stage] || node.stage);
  el.appendChild(infoGrid);

  // Timeline
  el.appendChild(createEl('div', 'detail-timeline-title', 'PO Journey'));
  const timeline = createEl('div', 'detail-timeline');

  const currentIdx = STAGES.indexOf(node.stage);

  STAGES.forEach((stage, i) => {
    const step = createEl('div', 'timeline-step');
    const dotWrapper = createEl('div', 'timeline-dot-wrapper');
    const dot = createEl('div', 'timeline-dot');

    if (i < currentIdx) {
      dot.classList.add('done');
    } else if (i === currentIdx) {
      dot.classList.add(node.severity);
    } else {
      dot.classList.add('pending');
    }
    dotWrapper.appendChild(dot);
    step.appendChild(dotWrapper);

    const info = createEl('div', 'timeline-info');
    info.appendChild(createEl('div', 'timeline-stage-name', STAGE_LABELS[stage]));

    if (i === currentIdx) {
      const stuck = createEl('div', `timeline-stuck ${node.severity}`);
      stuck.textContent = `${node.daysStuck} days`;
      info.appendChild(stuck);
    } else if (i < currentIdx) {
      info.appendChild(createEl('div', 'timeline-status', 'Completed'));
    }

    step.appendChild(info);
    timeline.appendChild(step);

    // Connector line (except after last)
    if (i < STAGES.length - 1) {
      const line = createEl('div', 'timeline-line');
      if (i < currentIdx) line.classList.add('done');
      timeline.appendChild(line);
    }
  });

  el.appendChild(timeline);
  el.classList.add('open');
}

export function hideDetailPanel() {
  if (panelEl) {
    panelEl.classList.remove('open');
    currentPoId = null;
  }
}

export function isDetailPanelOpen() {
  return panelEl?.classList.contains('open') && currentPoId != null;
}
