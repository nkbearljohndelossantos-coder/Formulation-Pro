import { express } from '../cjsRequire.js';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { CompoundingCodeService } from '../services/CompoundingCodeService.js';

const router = express.Router();

// POST /api/v1/compounding-codes/generate - Atomically generate N unique compounding codes & store logs
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const {
      count = 1,
      formulaCode,
      formulaName,
      formulaVersion,
      batchNumber,
      targetBatchSize,
      targetBatchUom,
    } = req.body;

    const userName = req.user
      ? `${req.user.first_name || req.user.firstName || ''} ${req.user.last_name || req.user.lastName || ''}`.trim() || req.user.username
      : 'System Operator';

    const userId = req.user ? req.user.id : null;

    const records = await CompoundingCodeService.generateUniqueCodes({
      count,
      formulaCode,
      formulaName,
      formulaVersion,
      batchNumber,
      targetBatchSize,
      targetBatchUom,
      userId,
      userName,
    });

    return res.json({
      success: true,
      message: `Successfully generated ${records.length} unique compounding code(s).`,
      data: records,
    });
  } catch (err) {
    console.error('Error generating unique compounding code:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate unique compounding code.',
      error: err.message,
    });
  }
});

// GET /api/v1/compounding-codes - Retrieve compounding code logs
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search = '', limit = 100, offset = 0 } = req.query;
    const result = await CompoundingCodeService.getLogs({
      search,
      limit: parseInt(limit, 10) || 100,
      offset: parseInt(offset, 10) || 0,
    });

    return res.json({
      success: true,
      data: result.logs,
      total: result.total,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch compounding code logs.',
      error: err.message,
    });
  }
});

// POST /api/v1/compounding-codes/compare - Compare multiple compounding codes
router.post('/compare', authenticateToken, async (req, res) => {
  try {
    const { codes = [] } = req.body;
    if (!Array.isArray(codes) || codes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of compounding codes to compare.',
      });
    }

    const records = await CompoundingCodeService.compareCodes(codes);
    return res.json({
      success: true,
      data: records,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to compare compounding codes.', error: err.message });
  }
});
// DELETE /api/v1/compounding-codes/:id - Delete compounding code log & associated MES batch
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const log = await db('compounding_code_logs').where({ id }).first();
    if (!log) {
      return res.status(404).json({ success: false, message: 'Compounding code log not found.' });
    }

    await db.transaction(async (trx) => {
      // Find matching production batch
      const batch = await trx('production_batches')
        .where('batch_number', log.compounding_code)
        .orWhere('batch_number', log.batch_number)
        .first();

      if (batch) {
        await trx('batch_material_entries').where({ batch_id: batch.id }).del();
        await trx('batch_material_requirements').where({ batch_id: batch.id }).del();
        await trx('batch_steps').where({ batch_id: batch.id }).del();
        await trx('batch_phases').where({ batch_id: batch.id }).del();
        await trx('batch_execution_locks').where({ batch_id: batch.id }).del();
        await trx('batch_deviations').where({ batch_id: batch.id }).del();
        await trx('qr_tokens').where({ batch_id: batch.id }).del();
        await trx('production_batches').where({ id: batch.id }).del();
      }

      await trx('compounding_code_logs').where({ id }).del();
    });

    return res.json({ success: true, message: `Compounding code log '${log.compounding_code}' deleted successfully.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete compounding code log.', error: err.message });
  }
});

export default router;
