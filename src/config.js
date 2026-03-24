/**
 * Stage definitions, configurable SLA thresholds, and color scales.
 */

export const STAGES = ['draft', 'approval', 'sent', 'received', 'invoiced', 'closed'];

export const STAGE_LABELS = {
  draft: 'Draft',
  approval: 'Approval',
  sent: 'Sent',
  received: 'Received',
  invoiced: 'Invoiced',
  closed: 'Closed',
};

// Default SLA thresholds (days) per stage — configurable
const DEFAULT_THRESHOLDS = {
  draft: { warning: 3, critical: 7 },
  approval: { warning: 2, critical: 5 },
  sent: { warning: 5, critical: 10 },
  received: { warning: 5, critical: 10 },
  invoiced: { warning: 3, critical: 7 },
  closed: { warning: 999, critical: 999 },
};

const FALLBACK_THRESHOLD = { warning: 3, critical: 7 };

let customThresholds = {};

export function getThresholds(stage) {
  const key = stage?.toLowerCase();
  return customThresholds[key] || DEFAULT_THRESHOLDS[key] || FALLBACK_THRESHOLD;
}

export function setThresholds(stage, thresholds) {
  customThresholds[stage?.toLowerCase()] = thresholds;
}

export function resetThresholds() {
  customThresholds = {};
}

// Design system color tokens
export const COLORS = {
  canvas: '#0a0e1a',
  chrome: '#0d1224',
  tooltipBg: '#161b2e',
  border: '#1e2338',
  borderEm: '#2a3050',
  textPrimary: '#e2e6ee',
  textBody: '#c8ccd4',
  textMuted: '#8891b0',
  healthy: '#4dff91',
  warning: '#ffb84d',
  critical: '#ff4d6a',
};

// Renderer thresholds
export const RENDERER_THRESHOLDS = {
  svgMax: 1000,
  canvasMax: 2000,
};

// Required CSV columns
export const REQUIRED_COLUMNS = [
  'po_id', 'vendor', 'amount', 'requester', 'stage',
  'entered_stage_date', 'created_date',
];
