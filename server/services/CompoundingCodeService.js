import db from '../db.js';
import { SequenceService } from './SequenceService.js';
import { CompoundingBatchService } from './CompoundingBatchService.js';

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

        const insertRes = await trx('compounding_code_logs').insert(logEntry);
        let insertedId = null;
        if (Array.isArray(insertRes)) {
          insertedId = typeof insertRes[0] === 'object' ? insertRes[0]?.id : insertRes[0];
        } else if (typeof insertRes === 'object' && insertRes !== null) {
          insertedId = insertRes.id;
        } else {
          insertedId = insertRes;
        }

        // Check Admin toggle setting (auto_send_to_operator_mes). Default OFF: Print mode only
        try {
          const settingRow = await trx('system_settings').where({ key: 'auto_send_to_operator_mes' }).first();
          const isAutoSendEnabled = settingRow ? (settingRow.value === 'true' || settingRow.value === '1') : false;

          if (isAutoSendEnabled) {
            let formula = null;
            let versionRow = null;
            if (formulaCode) {
              formula = await trx('formulas').where({ code: formulaCode }).first();
            }
            if (formula) {
              versionRow = await trx('formula_versions')
                .where({ formula_id: formula.id, version_status: 'APPROVED' })
                .orderBy('major_version', 'desc')
                .orderBy('minor_version', 'desc')
                .first();
            }
            if (formula && versionRow) {
              const mats = await trx('formula_version_materials')
                .leftJoin('materials', 'formula_version_materials.material_id', 'materials.id')
                .leftJoin('formula_phases', 'formula_version_materials.phase_id', 'formula_phases.id')
                .where('formula_version_materials.version_id', versionRow.id)
                .select('formula_version_materials.*', 'materials.code as mat_code', 'materials.name as mat_name', 'formula_phases.phase_name');

              await CompoundingBatchService.createBatch({
                trx,
                compoundingCode: code,
                formulaId: formula.id,
                formulaVersionId: versionRow.id,
                category: formula.product_category || 'Cosmetic',
                targetBatchSize: targetBatchSize || versionRow.target_batch_size || '100.00',
                targetBatchUom: targetBatchUom || 'g',
                userId,
                items: mats,
              });
            }
          }
        } catch (e) {
          console.error('Error instantiating MES batch in generateUniqueCodes:', e);
        }

        generatedRecords.push({
          id: insertedId || i,
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
    const query = db('compounding_code_logs')
      .leftJoin('production_batches', function() {
        this.on('compounding_code_logs.compounding_code', '=', 'production_batches.batch_number')
          .orOn('compounding_code_logs.batch_number', '=', 'production_batches.batch_number');
      })
      .select(
        'compounding_code_logs.*',
        'production_batches.id as production_batch_id',
        'production_batches.status as batch_status',
        'production_batches.overall_progress_percent'
      );

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      query.where((builder) => {
        builder
          .where('compounding_code_logs.compounding_code', 'like', q)
          .orWhere('compounding_code_logs.batch_number', 'like', q)
          .orWhere('compounding_code_logs.formula_code', 'like', q)
          .orWhere('compounding_code_logs.formula_name', 'like', q)
          .orWhere('compounding_code_logs.printed_by_name', 'like', q);
      });
    }

    const totalRes = await query.clone().count('compounding_code_logs.id as count').first();
    const logs = await query
      .orderBy('compounding_code_logs.created_at', 'desc')
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
