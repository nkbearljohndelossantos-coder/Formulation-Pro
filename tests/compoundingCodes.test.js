import { describe, it, expect, beforeAll } from 'vitest';
import db from '../server/db.js';
import { CompoundingCodeService } from '../server/services/CompoundingCodeService.js';

describe('Compounding Code Unique Generator & Storage', () => {
  beforeAll(async () => {
    // Run latest migrations on SQLite database before executing tests
    await db.migrate.latest();
  });

  it('generates unique compounding codes with CP- prefix and sequential format', async () => {
    const records = await CompoundingCodeService.generateUniqueCodes({
      count: 3,
      formulaCode: 'FORM-COS-001',
      formulaName: 'Gentle Cleansing Lotion',
      formulaVersion: 'V1.0',
      targetBatchSize: 500,
      targetBatchUom: 'g',
      userName: 'Test Chemist',
    });

    expect(records).toHaveLength(3);
    expect(records[0].compounding_code).toMatch(/^CP-\d{4}-\d{4}$/);
    expect(records[1].compounding_code).toMatch(/^CP-\d{4}-\d{4}$/);
    expect(records[2].compounding_code).toMatch(/^CP-\d{4}-\d{4}$/);

    // Verify all generated codes in the batch are distinct and unique
    const uniqueCodesSet = new Set(records.map((r) => r.compounding_code));
    expect(uniqueCodesSet.size).toBe(3);

    // Check copy numbering
    expect(records[0].copy_number).toBe(1);
    expect(records[1].copy_number).toBe(2);
    expect(records[2].copy_number).toBe(3);
    expect(records[0].total_copies).toBe(3);
  });

  it('fetches compounding code logs and supports search filter', async () => {
    const logsResult = await CompoundingCodeService.getLogs({ search: 'Gentle Cleansing Lotion' });
    expect(logsResult.logs.length).toBeGreaterThan(0);
    expect(logsResult.logs[0].formula_name).toContain('Gentle Cleansing Lotion');
  });

  it('compares selected compounding codes side-by-side', async () => {
    const logsResult = await CompoundingCodeService.getLogs({ limit: 2 });
    if (logsResult.logs.length >= 2) {
      const targetCodes = logsResult.logs.map((l) => l.compounding_code);
      const comparison = await CompoundingCodeService.compareCodes(targetCodes);
      expect(comparison).toHaveLength(targetCodes.length);
    }
  });
});
