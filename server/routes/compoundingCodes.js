import { express } from '../cjsRequire.js';
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
    return res.status(500).json({
      success: false,
      message: 'Failed to compare compounding codes.',
      error: err.message,
    });
  }
});

export default router;
