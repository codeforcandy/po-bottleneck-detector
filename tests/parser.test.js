import { describe, it, expect } from 'vitest';
import { parseCSV, validateRow } from '../src/parser.js';

const HEADER = 'po_id,vendor,amount,requester,stage,entered_stage_date,created_date';

function csv(rows) {
  return [HEADER, ...rows].join('\n');
}

describe('parseCSV', () => {
  it('parses valid CSV with all columns', () => {
    const input = csv(['PO-001,Acme,47200,Maria,received,2026-03-06,2026-02-15']);
    const result = parseCSV(input);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].po_id).toBe('PO-001');
    expect(result.data[0].stage).toBe('received');
    expect(result.data[0].amount).toBe(47200);
    expect(result.errors).toHaveLength(0);
    expect(result.skipped).toBe(0);
  });

  it('returns error for empty file', () => {
    const result = parseCSV('');
    expect(result.data).toHaveLength(0);
    expect(result.errors[0]).toContain('empty');
  });

  it('returns error for missing required columns', () => {
    const result = parseCSV('po_id,vendor\nPO-001,Acme');
    expect(result.data).toHaveLength(0);
    expect(result.errors[0]).toContain('Missing required columns');
  });

  it('handles BOM characters', () => {
    const input = '\uFEFF' + csv(['PO-001,Acme,1000,Bob,draft,2026-03-20,2026-03-18']);
    const result = parseCSV(input);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].po_id).toBe('PO-001');
  });

  it('handles quoted commas in vendor names', () => {
    const input = csv(['"PO-001","Acme, Inc.",5000,Bob,sent,2026-03-15,2026-03-10']);
    const result = parseCSV(input);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].vendor).toBe('Acme, Inc.');
  });

  it('handles mixed line endings', () => {
    const input = HEADER + '\r\nPO-001,Acme,1000,Bob,draft,2026-03-20,2026-03-18\r\nPO-002,Beta,2000,Sue,sent,2026-03-19,2026-03-17\n';
    const result = parseCSV(input);
    expect(result.data).toHaveLength(2);
  });

  it('skips rows with invalid stage', () => {
    const input = csv([
      'PO-001,Acme,1000,Bob,draft,2026-03-20,2026-03-18',
      'PO-002,Beta,2000,Sue,invalid_stage,2026-03-19,2026-03-17',
    ]);
    const result = parseCSV(input);
    expect(result.data).toHaveLength(1);
    expect(result.skipped).toBe(1);
    expect(result.errors[0]).toContain('invalid stage');
  });

  it('skips rows with missing entered_stage_date', () => {
    const input = csv(['PO-001,Acme,1000,Bob,draft,,2026-03-18']);
    const result = parseCSV(input);
    expect(result.data).toHaveLength(0);
    expect(result.skipped).toBe(1);
  });

  it('handles negative amounts by clamping to 0', () => {
    const input = csv(['PO-001,Acme,-500,Bob,draft,2026-03-20,2026-03-18']);
    const result = parseCSV(input);
    expect(result.data[0].amount).toBe(0);
  });

  it('handles malformed dates', () => {
    const input = csv(['PO-001,Acme,1000,Bob,draft,not-a-date,2026-03-18']);
    const result = parseCSV(input);
    expect(result.skipped).toBe(1);
  });

  it('normalizes header whitespace', () => {
    const input = '  po_id , vendor , amount , requester , stage , entered_stage_date , created_date \nPO-001,Acme,1000,Bob,draft,2026-03-20,2026-03-18';
    const result = parseCSV(input);
    expect(result.data).toHaveLength(1);
  });

  it('parses multiple valid rows', () => {
    const input = csv([
      'PO-001,Acme,1000,Bob,draft,2026-03-20,2026-03-18',
      'PO-002,Beta,2000,Sue,sent,2026-03-19,2026-03-17',
      'PO-003,Gamma,3000,Ann,received,2026-03-01,2026-02-20',
    ]);
    const result = parseCSV(input);
    expect(result.data).toHaveLength(3);
    expect(result.skipped).toBe(0);
  });
});

describe('validateRow', () => {
  it('validates a correct row', () => {
    const row = { po_id: 'PO-001', vendor: 'Acme', amount: '5000', requester: 'Bob', stage: 'draft', entered_stage_date: '2026-03-20', created_date: '2026-03-18' };
    const result = validateRow(row, 2);
    expect(result.valid).toBe(true);
    expect(result.row.amount).toBe(5000);
  });

  it('rejects row with missing po_id', () => {
    const row = { po_id: '', vendor: 'Acme', amount: '5000', requester: 'Bob', stage: 'draft', entered_stage_date: '2026-03-20', created_date: '2026-03-18' };
    const result = validateRow(row, 2);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('po_id');
  });

  it('rejects row with invalid stage', () => {
    const row = { po_id: 'PO-001', vendor: 'Acme', amount: '5000', requester: 'Bob', stage: 'unknown', entered_stage_date: '2026-03-20', created_date: '2026-03-18' };
    const result = validateRow(row, 2);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('invalid stage');
  });

  it('defaults missing vendor to Unknown', () => {
    const row = { po_id: 'PO-001', vendor: '', amount: '5000', requester: 'Bob', stage: 'draft', entered_stage_date: '2026-03-20', created_date: '2026-03-18' };
    const result = validateRow(row, 2);
    expect(result.valid).toBe(true);
    expect(result.row.vendor).toBe('Unknown');
  });
});
