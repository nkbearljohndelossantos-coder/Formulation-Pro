import db from '../db.js';
import { SequenceService } from './SequenceService.js';

export class CompoundingCodeService {
  /**
   * Atomically generates N unique compounding codes (CP-YYYY-XXXX),
   * guaranteeing no duplicates or overwrites, and stores them in compounding_code_logs.
   */
  static async generateUniqueCodes({
    count = 1,
    formulaCode = '',
    formulaName = '',
    formulaVersion = '',
    batchNumber = '',
    targetBatchSize = null,
    targetBatchUom = 'g',
    userId = null,
    userName = 'System Operator',
  }) {
    const numCopies = Math.max(1, parseInt(count, 10) || 1);
    const generatedRecords = [];

    await db.transaction(async (trx) => {
      for (let i = 1; i <= numCopies; i++) {
        let code = '';
        let attempts = 0;
        let isUnique = false;

        // Loop to ensure absolute uniqueness (prevents any rare collision)
        while (!isUnique && attempts < 100) {
          attempts++;
          code = await SequenceService.getNextSequence('COMPOUNDING_CODE', trx);

          // Double check database uniqueness lock
          const existing = await trx('compounding_code_logs')
            .where({ compounding_code: code })
            .first();

          if (!existing) {
            isUnique = true;
          }
        }

        if (!isUnique) {
          throw new Error(`Failed to generate a unique compounding code after ${attempts} attempts.`);
        }

        const logEntry = {
          compounding_code: code,
          batch_number: batchNumber || code.replace('CP-', 'BAT-'),
          formula_code: formulaCode || null,
          formula_name: formulaName || null,
          formula_version: formulaVersion || null,
          copy_number: i,
          total_copies: numCopies,
          target_batch_size: targetBatchSize ? parseFloat(targetBatchSize) : null,
          target_batch_uom: targetBatchUom || 'g',
          printed_by_id: userId || null,
          printed_by_name: userName || 'System Operator',
          created_at: db.fn.now(),
        };

        const [insertedId] = await trx('compounding_code_logs').insert(logEntry);
        generatedRecords.push({
          id: insertedId,
          ...logEntry,
        });
      }
    });

    return generatedRecords;
  }

  /**
   * Retrieves all compounding code logs with optional search & pagination
   */
  static async getLogs({ search = '', limit = 100, offset = 0 } = {}) {
    const query = db('compounding_code_logs');

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      query.where((builder) => {
        builder
          .where('compounding_code', 'like', q)
          .orWhere('batch_number', 'like', q)
          .orWhere('formula_code', 'like', q)
          .orWhere('formula_name', 'like', q)
          .orWhere('printed_by_name', 'like', q);
      });
    }

    const totalRes = await query.clone().count('id as count').first();
    const logs = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return {
      logs,
      total: totalRes ? parseInt(totalRes.count, 10) : 0,
    };
  }

  /**
   * Fetches multiple compounding codes for side-by-side comparison
   */
  static async compareCodes(codes = []) {
    if (!Array.isArray(codes) || codes.length === 0) return [];
    return db('compounding_code_logs')
      .whereIn('compounding_code', codes)
      .orderBy('created_at', 'desc');
  }
}
