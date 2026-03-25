/**
 * Shared encoding layer — consumed by both SVG and Canvas renderers.
 * Computes visual properties (radius, color, opacity) from PO data.
 */

import { scaleSqrt } from 'd3-scale';
import { getThresholds, COLORS } from './config.js';

/**
 * Compute days stuck at current stage.
 * Returns 0 for invalid/future dates.
 */
export function computeDaysStuck(enteredStageDate, now = new Date()) {
  if (!enteredStageDate) return 0;
  const entered = enteredStageDate instanceof Date ? enteredStageDate : new Date(enteredStageDate);
  if (isNaN(entered.getTime())) return 0;
  const diff = now.getTime() - entered.getTime();
  if (diff < 0) return 0; // future date — treat as healthy
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Compute node radius using sqrt scale.
 * Range: 6px (healthy) to 40px (max stuck).
 */
export function computeRadius(daysStuck, maxDays = 30) {
  if (isNaN(daysStuck) || daysStuck < 0) daysStuck = 0;
  const clampedMax = Math.max(maxDays, 1);
  const scale = scaleSqrt().domain([0, clampedMax]).range([6, 40]).clamp(true);
  return scale(daysStuck);
}

/**
 * Compute node color based on stage-specific SLA thresholds.
 * Returns: 'healthy', 'warning', or 'critical'
 */
export function computeSeverity(daysStuck, stage) {
  if (isNaN(daysStuck) || daysStuck < 0) daysStuck = 0;
  const thresholds = getThresholds(stage);
  if (daysStuck >= thresholds.critical) return 'critical';
  if (daysStuck >= thresholds.warning) return 'warning';
  return 'healthy';
}

/**
 * Get hex color for a severity level.
 */
export function computeColor(severity) {
  switch (severity) {
    case 'critical': return COLORS.critical;
    case 'warning': return COLORS.warning;
    default: return COLORS.healthy;
  }
}

/**
 * Compute node opacity.
 * Healthy: 0.3, Warning: 0.7, Critical: 1.0
 */
export function computeOpacity(severity) {
  switch (severity) {
    case 'critical': return 1.0;
    case 'warning': return 0.7;
    default: return 0.3;
  }
}

/**
 * Compute border style for accessibility (color-blind users).
 * Critical: dashed, Warning: dotted, Healthy: solid (faint)
 */
export function computeBorderStyle(severity) {
  switch (severity) {
    case 'critical': return 'dashed';
    case 'warning': return 'dotted';
    default: return 'solid';
  }
}

/**
 * Compute all visual properties for a PO node.
 */
export function encodeNode(po, maxDays = 30, now = new Date()) {
  const daysStuck = computeDaysStuck(po.entered_stage_date, now);
  const severity = computeSeverity(daysStuck, po.stage);
  // Closed POs are done — always minimal size regardless of time since closure
  const isClosed = po.stage === 'closed';
  return {
    ...po,
    daysStuck,
    severity,
    radius: isClosed ? 6 : computeRadius(daysStuck, maxDays),
    color: computeColor(severity),
    opacity: isClosed ? 0.15 : computeOpacity(severity),
    borderStyle: computeBorderStyle(severity),
  };
}
