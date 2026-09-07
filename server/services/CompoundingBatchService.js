import db from '../db.js';
import Decimal from 'decimal.js';
import crypto from 'crypto';

export class CompoundingBatchService {
  /**
   * Robustly instantiates an MES production batch with phases, steps, and material requirements.
   */
  static async createBatch({
    trx,
    compoundingCode,
    formulaId,
    formulaVersionId,
    category = 'Cosmetic',
    targetBatchSize,
    targetBatchUom = 'g',
    userId,
    items = [],
  }) {
    const dbClient = trx || db;

    // Verify valid user_id for created_by constraint
    let validUserId = userId;
    if (validUserId) {
      const u = await dbClient('users').where({ id: validUserId }).first();
      if (!u) validUserId = null;
    }
    if (!validUserId) {
      const firstUser = await dbClient('users').first();
      validUserId = firstUser ? firstUser.id : 1;
    }

    const hashInput = `${formulaVersionId}_${targetBatchSize}_${compoundingCode}_${Date.now()}`;
    const snapshotHash = crypto.createHash('sha256').update(hashInput).digest('hex');

    const targetQtyDec = new Decimal(targetBatchSize || '0');

    // 1. Insert Production Batch
    const batchRes = await dbClient('production_batches').insert({
      batch_number: compoundingCode,
      formula_id: formulaId,
      formula_version_id: formulaVersionId,
      category: category || 'Cosmetic',
      status: 'Assigned',
      target_batch_size: targetQtyDec.toFixed(6),
      overall_progress_percent: '0.000000',
      snapshot_hash: snapshotHash,
      lock_version: 1,
      assigned_operator_id: validUserId,
      created_by: validUserId,
      created_at: dbClient.fn.now(),
      updated_at: dbClient.fn.now(),
    });

    const batchId = Array.isArray(batchRes) ? batchRes[0] : (typeof batchRes === 'object' ? batchRes.id : batchRes);

    // 2. Group items by phase name for batch_phases, batch_steps, and batch_material_requirements
    const phaseGroupMap = {};
    items.forEach(item => {
      const pName = item.phase_name || 'Phase A';
      if (!phaseGroupMap[pName]) phaseGroupMap[pName] = [];
      phaseGroupMap[pName].push(item);
    });

    let phaseSeq = 1;
    let globalStepNo = 1;

    for (const [pName, pItems] of Object.entries(phaseGroupMap)) {
      const phaseMatch = pName.match(/Phase\s+([A-Za-z0-9]+)/i);
      const phaseLetter = phaseMatch ? phaseMatch[1].toUpperCase() : String.fromCharCode(64 + phaseSeq);

      const phaseRes = await dbClient('batch_phases').insert({
        batch_id: batchId,
        phase_letter: phaseLetter,
        phase_name: pName,
        sequence: phaseSeq++,
        status: 'Waiting',
      });
      const phaseId = Array.isArray(phaseRes) ? phaseRes[0] : (typeof phaseRes === 'object' ? phaseRes.id : phaseRes);

      for (const item of pItems) {
        // Ensure material_id exists or fetch a fallback
        let matId = item.material_id;
        if (matId) {
          const matExists = await dbClient('materials').where({ id: matId }).first();
          if (!matExists) matId = null;
        }
        if (!matId) {
          const firstMat = await dbClient('materials').first();
          matId = firstMat ? firstMat.id : 1;
        }

        const scaledWeightDec = new Decimal(item.scaled_qty || item.calculated_quantity || '0');
        const minWeight = scaledWeightDec.times(0.99).toFixed(6);
        const maxWeight = scaledWeightDec.times(1.01).toFixed(6);
        const matName = item.material_name_snapshot || item.material_name || item.name || 'Material';

        const stepRes = await dbClient('batch_steps').insert({
          batch_id: batchId,
          phase_id: phaseId,
          step_number: globalStepNo++,
          material_id: matId,
          instructions: `Weigh and add ${matName} (${scaledWeightDec.toFixed(2)} g)`,
          status: 'Pending',
          lock_version: 1,
        });
        const stepId = Array.isArray(stepRes) ? stepRes[0] : (typeof stepRes === 'object' ? stepRes.id : stepRes);

        await dbClient('batch_material_requirements').insert({
          batch_id: batchId,
          step_id: stepId,
          material_id: matId,
          material_code: item.material_code_snapshot || item.material_code || 'MAT',
          material_name: matName,
          percentage: new Decimal(item.percentage || '0').toFixed(6),
          target_weight: scaledWeightDec.toFixed(6),
          tolerance_percent: '1.000000',
          min_weight: minWeight,
          max_weight: maxWeight,
        });
      }
    }

    return batchId;
  }
}
