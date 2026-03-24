/**
 * CSV parsing and validation using PapaParse.
 * Handles messy ERP exports: BOM, quoted commas, mixed line endings.
 */

import Papa from 'papaparse';
import { REQUIRED_COLUMNS, STAGES } from './config.js';

/**
 * Parse and validate a CSV file.
 * Returns { data: ValidRow[], errors: string[], skipped: number }
 */
export function parseCSV(csvString) {
  if (!csvString || csvString.trim().length === 0) {
    return { data: [], errors: ['File is empty'], skipped: 0 };
  }

  // Strip BOM if present
  const cleaned = csvString.replace(/^\uFEFF/, '');

  const result = Papa.parse(cleaned, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
  });

  if (result.errors.length > 0 && result.data.length === 0) {
    return {
      data: [],
      errors: result.errors.map((e) => `Row ${e.row}: ${e.message}`),
      skipped: 0,
    };
  }

  // Validate required columns
  const headers = result.meta.fields || [];
  const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
  if (missing.length > 0) {
    return {
      data: [],
      errors: [`Missing required columns: ${missing.join(', ')}`],
      skipped: 0,
    };
  }

  // Validate each row
  const validRows = [];
  const rowErrors = [];
  let skipped = 0;

  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i];
    const validation = validateRow(row, i + 2); // +2 for 1-indexed + header row
    if (validation.valid) {
      validRows.push(validation.row);
    } else {
      rowErrors.push(validation.error);
      skipped++;
    }
  }

  return { data: validRows, errors: rowErrors, skipped };
}

/**
 * Validate a single row. Returns { valid, row?, error? }
 */
export function validateRow(row, rowNum) {
  // Check po_id
  if (!row.po_id || row.po_id.trim() === '') {
    return { valid: false, error: `Row ${rowNum}: missing po_id` };
  }

  // Check stage
  const stage = row.stage?.trim().toLowerCase();
  if (!stage) {
    return { valid: false, error: `Row ${rowNum}: missing stage` };
  }
  if (!STAGES.includes(stage)) {
    return { valid: false, error: `Row ${rowNum}: invalid stage "${row.stage}" (expected: ${STAGES.join(', ')})` };
  }

  // Parse entered_stage_date
  const enteredDate = parseDate(row.entered_stage_date);
  if (!enteredDate) {
    return { valid: false, error: `Row ${rowNum}: missing or invalid entered_stage_date` };
  }

  // Parse created_date (optional validation — accept if missing)
  const createdDate = parseDate(row.created_date);

  // Parse amount
  const amount = parseFloat(row.amount);

  return {
    valid: true,
    row: {
      po_id: row.po_id.trim(),
      vendor: row.vendor?.trim() || 'Unknown',
      amount: isNaN(amount) ? 0 : Math.max(0, amount),
      requester: row.requester?.trim() || 'Unknown',
      stage,
      entered_stage_date: enteredDate,
      created_date: createdDate,
    },
  };
}

/**
 * Parse a date string. Returns Date or null.
 */
function parseDate(str) {
  if (!str || str.trim() === '') return null;
  const d = new Date(str.trim());
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Parse a File object (from drag-and-drop or file input).
 * Returns a Promise that resolves to the parse result.
 */
export function parseFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve({ data: [], errors: ['No file provided'], skipped: 0 });
      return;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      resolve({ data: [], errors: ['Please upload a .csv file'], skipped: 0 });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = parseCSV(e.target.result);
      resolve(result);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
