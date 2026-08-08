import { express } from '../cjsRequire.js';
import Decimal from 'decimal.js';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { convertUnit } from '../services/unitConversionService.js';
import { logAudit } from '../middleware/audit.js';
import { SequenceService } from '../services/SequenceService.js';

const router = express.Router();

// POST /api/v1/batch-calculations - Run Batch Calculator Session (Isolated scaling)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { versionId, targetBatchQty, targetUom, processLossPct } = req.body;

    if (!versionId || !targetBatchQty || !targetUom) {
      return res.status(400).json({ success: false, message: 'Version ID, Target Batch Quantity, and Target UOM are required.' });
    }

    const version = await db('formula_versions')
      .join('formulas', 'formula_versions.formula_id', 'formulas.id')
      .where('formula_versions.id', versionId)
      .select('formula_versions.*', 'formulas.code as formula_code', 'formulas.name as formula_name', 'formulas.product_category')
      .first();

    if (!version) {
      return res.status(404).json({ success: false, message: 'Formula version not found.' });
    }

    if (version.version_status !== 'APPROVED') {
      return res.status(400).json({ success: false, message: 'Only APPROVED formula versions can be selected for batch calculation.' });
    }

    const categoryDetails = await db('cosmetic_formula_details').where({ version_id: versionId }).first();

    const materials = await db('formula_version_materials')
      .leftJoin('materials', 'formula_version_materials.material_id', 'materials.id')
      .leftJoin('formula_phases', 'formula_version_materials.phase_id', 'formula_phases.id')
      .where('formula_version_materials.version_id', versionId)
      .select(
        'formula_version_materials.*',
        'materials.code as mat_code',
        'materials.name as mat_name',
        'materials.uom as default_uom',
        'materials.cost as current_cost',
        'materials.currency_code',
        'materials.density_kg_per_l',
        'materials.specific_gravity',
        'materials.unit_weight',
        'materials.unit_weight_uom',
        'formula_phases.phase_name',
        'formula_phases.phase_order'
      )
      .orderBy('formula_version_materials.addition_order', 'asc')
      .orderBy('formula_version_materials.id', 'asc');

    const targetQtyDec = new Decimal(targetBatchQty);
    const lossPctDec = new Decimal(processLossPct || '0');
    const lossMultiplier = new Decimal(1).plus(lossPctDec.div(100));

    // Convert target batch to KG (or base unit) if needed to compute scale factor
    const refBatchSize = new Decimal(version.target_batch_size || '1');
    const refUom = version.target_batch_uom || 'kg';

    // 1. Calculate scaling ratio: targetQtyInRefUom / refBatchSize
    // Convert targetBatchQty in targetUom to refUom
    const targetQtyInRefUom = new Decimal(
      convertUnit(targetBatchQty, targetUom, refUom, '1.000000', null)
    );

    const scaleFactor = targetQtyInRefUom.div(refBatchSize);

    const items = [];
    let totalBatchCost = new Decimal(0);

    for (const m of materials) {
      const pctDec = new Decimal(m.percentage || '0');
      const scaledQtyDec = pctDec.div(100).times(targetQtyDec).times(lossMultiplier);

      const rawCost = new Decimal(m.current_cost || m.cost || '0');
      const rawUom = String(m.default_uom || m.uom || 'g').trim().toLowerCase();
      const unitCostG = rawUom === 'kg' ? rawCost.div(1000) : rawCost;

      const lineCostDec = scaledQtyDec.times(unitCostG);
      totalBatchCost = totalBatchCost.plus(lineCostDec);

      items.push({
        material_id: m.material_id,
        material_code_snapshot: m.material_code_snapshot || m.mat_code,
        material_name_snapshot: m.material_name_snapshot || m.mat_name,
        phase_name: m.phase_name || 'Phase A - Water Phase',
        percentage: pctDec.toFixed(4),
        scaled_qty: scaledQtyDec.toFixed(2),
        scaled_uom: 'g',
        unit_cost_g: unitCostG.toFixed(4),
        cost_per_uom: rawCost.toFixed(4),
        line_cost: lineCostDec.toFixed(2),
        currency_code: m.currency_code || 'PHP',
      });
    }

    // Save batch calculation record & generate unique compounding code
    let generatedCpCode = '';
    let mesBatchId = null;

    const batchCalcId = await db.transaction(async trx => {
      generatedCpCode = await SequenceService.getNextSequence('COMPOUNDING_CODE', trx);

      const insertRes = await trx('batch_calculations').insert({
        version_id: versionId,
        target_batch_qty: targetQtyDec.toFixed(2),
        target_uom: targetUom,
        process_loss_pct: lossPctDec.toFixed(2),
        created_by: req.user.id,
      });
      const id = Array.isArray(insertRes) ? insertRes[0] : (typeof insertRes === 'object' ? insertRes.id : insertRes);

      for (const item of items) {
        await trx('batch_calculation_items').insert({
          batch_calculation_id: id,
          material_id: item.material_id,
          material_code_snapshot: item.material_code_snapshot,
          material_name_snapshot: item.material_name_snapshot,
          percentage: item.percentage,
          scaled_qty: item.scaled_qty,
          scaled_uom: item.scaled_uom,
          line_cost: item.line_cost,
        });
      }

      await trx('compounding_code_logs').insert({
        compounding_code: generatedCpCode,
        batch_number: generatedCpCode.replace('CP-', 'BAT-'),
        formula_code: version.formula_code,
        formula_name: version.formula_name,
        formula_version: `V${version.major_version}.${version.minor_version}`,
        target_batch_size: targetQtyDec.toFixed(2),
        target_batch_uom: targetUom,
        printed_by_id: req.user.id,
        printed_by_name: req.user ? `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.username : 'Formulator',
        created_at: trx.fn.now(),
      }).catch(() => {});

      // Instantiate active MES production batch for Operator Compounding Station
      try {
        const hashInput = `${versionId}_${targetQtyDec.toFixed(2)}_${generatedCpCode}_${Date.now()}`;
        const snapshotHash = crypto.createHash('sha256').update(hashInput).digest('hex');

        const batchRes = await trx('production_batches').insert({
          batch_number: generatedCpCode,
          formula_id: version.formula_id,
          formula_version_id: versionId,
          category: version.product_category || 'Cosmetic',
          status: 'Assigned',
          target_batch_size: targetQtyDec.toFixed(6),
          overall_progress_percent: '0.000000',
          snapshot_hash: snapshotHash,
          lock_version: 1,
          assigned_operator_id: req.user ? req.user.id : null,
          created_by: req.user ? req.user.id : 1,
        });
        mesBatchId = Array.isArray(batchRes) ? batchRes[0] : (typeof batchRes === 'object' ? batchRes.id : batchRes);

        // Group scaled material items by phase for batch_phases, batch_steps, and batch_material_requirements
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
          
          const phaseInsertRes = await trx('batch_phases').insert({
            batch_id: mesBatchId,
            phase_letter: phaseLetter,
            phase_name: pName,
            sequence: phaseSeq++,
            status: 'Waiting',
          });
          const phaseId = Array.isArray(phaseInsertRes) ? phaseInsertRes[0] : (typeof phaseInsertRes === 'object' ? phaseInsertRes.id : phaseInsertRes);

          for (const item of pItems) {
            const stepInsertRes = await trx('batch_steps').insert({
              batch_id: mesBatchId,
              phase_id: phaseId,
              step_number: globalStepNo++,
              material_id: item.material_id,
              instructions: `Weigh and add ${item.material_name_snapshot} (${item.scaled_qty} g)`,
              status: 'Pending',
              lock_version: 1,
            });
            const stepId = Array.isArray(stepInsertRes) ? stepInsertRes[0] : (typeof stepInsertRes === 'object' ? stepInsertRes.id : stepInsertRes);

            const scaledWeightDec = new Decimal(item.scaled_qty || '0');
            const minWeight = scaledWeightDec.times(0.99).toFixed(6);
            const maxWeight = scaledWeightDec.times(1.01).toFixed(6);

            await trx('batch_material_requirements').insert({
              batch_id: mesBatchId,
              step_id: stepId,
              material_id: item.material_id,
              material_code: item.material_code_snapshot || 'MAT',
              material_name: item.material_name_snapshot || 'Material',
              percentage: item.percentage || '0.000000',
              target_weight: scaledWeightDec.toFixed(6),
              tolerance_percent: '1.000000',
              min_weight: minWeight,
              max_weight: maxWeight,
            });
          }
        }
      } catch (mesErr) {
        console.error('Error instantiating MES compounding batch from calculator:', mesErr);
      }

      return id;
    });

    await logAudit(req, 'CALCULATE_BATCH', 'BatchCalculation', batchCalcId, null, { versionId, targetBatchQty, targetUom, compounding_code: generatedCpCode });

    return res.json({
      success: true,
      batchCalculationId: batchCalcId,
      productionBatchId: mesBatchId,
      data: {
        compounding_code: generatedCpCode,
        batch_number: generatedCpCode.replace('CP-', 'BAT-'),
        production_batch_id: mesBatchId,
        formula_code: version.formula_code,
        formula_name: version.formula_name,
        version: `${version.major_version}.${version.minor_version}`,
        target_batch_qty: targetQtyDec.toFixed(2),
        target_uom: targetUom,
        process_loss_pct: lossPctDec.toFixed(2),
        scale_factor: scaleFactor.toFixed(2),
        total_batch_cost: totalBatchCost.toFixed(2),
        items,
        categoryDetails,
      },
    });
  } catch (err) {
    console.error('Batch Calculator Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/batch-calculations/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const calc = await db('batch_calculations')
      .join('formula_versions', 'batch_calculations.version_id', 'formula_versions.id')
      .join('formulas', 'formula_versions.formula_id', 'formulas.id')
      .leftJoin('users', 'batch_calculations.created_by', 'users.id')
      .where('batch_calculations.id', req.params.id)
      .select(
        'batch_calculations.*',
        'formulas.code as formula_code',
        'formulas.name as formula_name',
        'formula_versions.major_version',
        'formula_versions.minor_version',
        'users.username as created_by_username'
      )
      .first();

    if (!calc) {
      return res.status(404).json({ success: false, message: 'Batch calculation record not found.' });
    }

    const items = await db('batch_calculation_items').where({ batch_calculation_id: req.params.id });

    return res.json({ success: true, data: { ...calc, items } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch batch calculation.', error: err.message });
  }
});

export default router;
