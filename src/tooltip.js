/**
 * Tooltip component — shows PO details near cursor on hover.
 */

let tooltipEl = null;

function ensureTooltip() {
  if (tooltipEl) return tooltipEl;
  tooltipEl = document.createElement('div');
  tooltipEl.id = 'po-tooltip';
  tooltipEl.className = 'tooltip';
  tooltipEl.style.display = 'none';
  document.body.appendChild(tooltipEl);
  return tooltipEl;
}

function createTextDiv(className, text) {
  const div = document.createElement('div');
  div.className = className;
  div.textContent = text;
  return div;
}

function createLabelDiv(className, label, value, bold = false) {
  const div = document.createElement('div');
  div.className = className;
  const labelSpan = document.createTextNode(`${label}: `);
  div.appendChild(labelSpan);
  if (bold) {
    const strong = document.createElement('strong');
    strong.textContent = value;
    div.appendChild(strong);
  } else {
    div.appendChild(document.createTextNode(value));
  }
  return div;
}

export function showTooltip(node, x, y) {
  const el = ensureTooltip();

  // Clear previous content safely
  while (el.firstChild) el.removeChild(el.firstChild);

  const slaClass = node.severity === 'critical' ? 'stuck critical' : node.severity === 'warning' ? 'stuck warning' : '';

  el.appendChild(createTextDiv('tooltip-id', node.po_id));
  el.appendChild(createTextDiv('tooltip-vendor', node.vendor));
  el.appendChild(createLabelDiv('tooltip-row', 'Stage', node.stage, true));
  el.appendChild(createLabelDiv(
    `tooltip-row ${slaClass}`.trim(),
    'Stuck',
    `${node.daysStuck} day${node.daysStuck !== 1 ? 's' : ''}`
  ));
  el.appendChild(createLabelDiv('tooltip-row muted', 'Amount', `$${Number(node.amount).toLocaleString()}`));
  el.appendChild(createLabelDiv('tooltip-row muted', 'Requester', node.requester));

  el.style.display = 'block';

  // Position with 12px offset, keep within viewport
  const rect = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = x + 12;
  let top = y + 12;
  if (left + rect.width > vw - 8) left = x - rect.width - 12;
  if (top + rect.height > vh - 8) top = y - rect.height - 12;
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
}

export function hideTooltip() {
  if (tooltipEl) tooltipEl.style.display = 'none';
}
