import { describe, it, expect } from 'vitest';
import {
  computeDaysStuck,
  computeRadius,
  computeSeverity,
  computeColor,
  computeOpacity,
  computeBorderStyle,
  encodeNode,
} from '../src/encoding.js';
import { COLORS } from '../src/config.js';

describe('computeDaysStuck', () => {
  const now = new Date('2026-03-24T00:00:00Z');

  it('calculates days between entered date and now', () => {
    expect(computeDaysStuck('2026-03-14', now)).toBe(10);
  });

  it('returns 0 for same day', () => {
    expect(computeDaysStuck('2026-03-24', now)).toBe(0);
  });

  it('returns 0 for future entered_stage_date', () => {
    expect(computeDaysStuck('2026-04-01', now)).toBe(0);
  });

  it('returns 0 for null input', () => {
    expect(computeDaysStuck(null, now)).toBe(0);
  });

  it('returns 0 for invalid date string', () => {
    expect(computeDaysStuck('not-a-date', now)).toBe(0);
  });

  it('accepts Date objects', () => {
    expect(computeDaysStuck(new Date('2026-03-22'), now)).toBe(2);
  });
});

describe('computeRadius', () => {
  it('returns minimum radius for 0 days', () => {
    expect(computeRadius(0)).toBe(6);
  });

  it('returns maximum radius at maxDays', () => {
    expect(computeRadius(30, 30)).toBe(40);
  });

  it('clamps above maxDays', () => {
    expect(computeRadius(365, 30)).toBe(40);
  });

  it('handles NaN input as 0', () => {
    expect(computeRadius(NaN)).toBe(6);
  });

  it('scales proportionally (sqrt)', () => {
    const r = computeRadius(15, 30);
    expect(r).toBeGreaterThan(6);
    expect(r).toBeLessThan(40);
  });
});

describe('computeSeverity', () => {
  it('returns healthy below warning threshold', () => {
    expect(computeSeverity(1, 'approval')).toBe('healthy');
  });

  it('returns warning at warning threshold', () => {
    expect(computeSeverity(2, 'approval')).toBe('warning');
  });

  it('returns critical at critical threshold', () => {
    expect(computeSeverity(5, 'approval')).toBe('critical');
  });

  it('uses fallback for unknown stage', () => {
    expect(computeSeverity(4, 'nonexistent')).toBe('warning');
  });

  it('handles NaN as healthy', () => {
    expect(computeSeverity(NaN, 'draft')).toBe('healthy');
  });
});

describe('computeColor', () => {
  it('returns green for healthy', () => {
    expect(computeColor('healthy')).toBe(COLORS.healthy);
  });

  it('returns amber for warning', () => {
    expect(computeColor('warning')).toBe(COLORS.warning);
  });

  it('returns red for critical', () => {
    expect(computeColor('critical')).toBe(COLORS.critical);
  });
});

describe('computeOpacity', () => {
  it('returns 0.3 for healthy', () => {
    expect(computeOpacity('healthy')).toBe(0.3);
  });

  it('returns 0.7 for warning', () => {
    expect(computeOpacity('warning')).toBe(0.7);
  });

  it('returns 1.0 for critical', () => {
    expect(computeOpacity('critical')).toBe(1.0);
  });
});

describe('computeBorderStyle', () => {
  it('returns dashed for critical', () => {
    expect(computeBorderStyle('critical')).toBe('dashed');
  });

  it('returns dotted for warning', () => {
    expect(computeBorderStyle('warning')).toBe('dotted');
  });

  it('returns solid for healthy', () => {
    expect(computeBorderStyle('healthy')).toBe('solid');
  });
});

describe('encodeNode', () => {
  const now = new Date('2026-03-24T00:00:00Z');

  it('encodes a critical PO node', () => {
    const po = { po_id: 'PO-001', stage: 'approval', entered_stage_date: '2026-03-10' };
    const result = encodeNode(po, 30, now);
    expect(result.daysStuck).toBe(14);
    expect(result.severity).toBe('critical');
    expect(result.color).toBe(COLORS.critical);
    expect(result.opacity).toBe(1.0);
    expect(result.borderStyle).toBe('dashed');
    expect(result.radius).toBeGreaterThan(6);
    expect(result.po_id).toBe('PO-001');
  });

  // Regression: ISSUE-001 — closed POs had giant radius because daysStuck was high
  // Found by /qa on 2026-03-25
  it('encodes closed PO with minimal radius regardless of days since closure', () => {
    const po = { po_id: 'PO-003', stage: 'closed', entered_stage_date: '2026-02-01' };
    const result = encodeNode(po, 30, now);
    expect(result.radius).toBe(6); // always minimum for closed
    expect(result.opacity).toBe(0.15); // very faded
  });

  it('encodes a healthy PO node', () => {
    const po = { po_id: 'PO-002', stage: 'draft', entered_stage_date: '2026-03-23' };
    const result = encodeNode(po, 30, now);
    expect(result.daysStuck).toBe(1);
    expect(result.severity).toBe('healthy');
    expect(result.opacity).toBe(0.3);
  });
});
