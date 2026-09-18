import { express } from '../cjsRequire.js';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * Authentication Middleware:
 * Supports external systems using API Key (via Header 'x-api-key', 'Authorization: Bearer <key>', or query ?api_key=<key>)
 * Also allows authenticated web session users (Admins / Inventory staff) to query directly.
 */
async function authenticateInventoryApi(req, res, next) {
  try {
    const headerKey = req.headers['x-api-key'] || req.headers['x-api-token'];
    const authHeader = req.headers['authorization'];
    const bearerKey = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const queryKey = req.query.api_key;
    const passedKey = (headerKey || bearerKey || queryKey || '').trim();

    // Fetch API Key and enabled state from system_settings
    const keySetting = await db('system_settings').where({ key: 'inventory_api_key' }).first();
    const enabledSetting = await db('system_settings').where({ key: 'inventory_api_enabled' }).first();

    const isEnabled = enabledSetting ? (enabledSetting.value === 'true' || enabledSetting.value === '1') : true;

    if (passedKey) {
      if (!isEnabled) {
        return res.status(403).json({
          success: false,
          message: 'Inventory Formulation API is currently DISABLED in System Settings. Please contact system administrator.'
        });
      }

      if (keySetting && keySetting.value && passedKey === keySetting.value.trim()) {
        req.apiAuthType = 'API_KEY';
        return next();
      } else {
        return res.status(401).json({
          success: false,
          message: 'Invalid Inventory API Key provided. Access denied.'
        });
      }
    }

    // If no API key provided, fall back to standard JWT token / cookie authentication
    return authenticateToken(req, res, next);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Authentication error', error: err.message });
  }
}

/**
 * Helper to compute required raw materials without proprietary percentages or secret phases/instructions
 */
function sanitizeMaterialsForInventory(materials, targetBatchQty, targetUom) {
  const targetQtyNum = parseFloat(targetBatchQty) || 100;

  return materials.map(m => {
    const pct = parseFloat(m.percentage) || 0;
    // Calculate required raw material quantity for target batch
    const requiredQty = (pct / 100) * targetQtyNum;

    return {
      material_code: m.material_code || m.code || 'MAT-000',
      material_name: m.material_name || m.name || 'Raw Material',
      category: m.material_category || m.category || 'General',
      required_quantity: Number(requiredQty.toFixed(4)),
      uom: targetUom,
      supplier: m.vendor_name || m.supplier || 'Approved Supplier',
    };
  });
}

/**
 * 1. GET /api/v1/external/inventory/formulations
 * List all approved formulations and their raw material requirements for inventory
 * ZERO-LEAK GUARANTEE: Only Raw Materials and Required Quantities are exposed.
 */
router.get('/formulations', authenticateInventoryApi, async (req, res) => {
  try {
    const { search, category, batch_size = 100, uom = 'kg' } = req.query;
    const targetBatchQty = parseFloat(batch_size) || 100;
    const targetUom = String(uom).toLowerCase() === 'g' ? 'g' : 'kg';

    let query = db('formulas').select('*').where({ status: 'ACTIVE' }).orderBy('name', 'asc');

    if (category && category !== 'All') {
      query = query.where(builder => {
        builder.where('product_category', 'like', `%${category}%`)
          .orWhere('brand_type', 'like', `%${category}%`);
      });
    }

    if (search) {
      query = query.where(builder => {
        builder.where('code', 'like', `%${search}%`)
          .orWhere('name', 'like', `%${search}%`);
      });
    }

    const formulas = await query;
    if (!formulas || formulas.length === 0) {
      return res.json({ success: true, count: 0, data: [] });
    }

    const formulaIds = formulas.map(f => f.id);

    // Fetch approved versions for these formulas
    const versions = await db('formula_versions')
      .whereIn('formula_id', formulaIds)
      .where({ version_status: 'APPROVED' })
      .orderBy('major_version', 'desc')
      .orderBy('minor_version', 'desc');

    const versionIds = versions.map(v => v.id);

    // Fetch materials for these versions
    const materials = versionIds.length > 0
      ? await db('formula_version_materials')
          .leftJoin('materials', 'formula_version_materials.material_id', 'materials.id')
          .leftJoin('vendors', 'materials.vendor_id', 'vendors.id')
          .whereIn('formula_version_materials.version_id', versionIds)
          .select(
            'formula_version_materials.version_id',
            'formula_version_materials.percentage',
            'materials.code as material_code',
            'materials.name as material_name',
            'materials.category as material_category',
            'vendors.name as vendor_name'
          )
      : [];

    const result = [];
    for (const f of formulas) {
      // Find active approved version
      const fVersions = versions.filter(v => Number(v.formula_id) === Number(f.id));
      if (fVersions.length === 0) continue; // Only expose approved formulations!

      const activeVer = fVersions[0];
      const fMats = materials.filter(m => Number(m.version_id) === Number(activeVer.id));

      const sanitizedRawMaterials = sanitizeMaterialsForInventory(fMats, targetBatchQty, targetUom);

      result.push({
        formula_id: f.id,
        formula_code: f.code,
        formula_name: f.name,
        product_category: f.product_category,
        active_version: `V${activeVer.major_version}.${activeVer.minor_version}`,
        version_status: activeVer.version_status,
        compounding_code: activeVer.compounding_code || null,
        batch_size: targetBatchQty,
        batch_uom: targetUom,
        total_raw_materials_count: sanitizedRawMaterials.length,
        raw_materials_needed: sanitizedRawMaterials
      });
    }

    return res.json({
      success: true,
      count: result.length,
      batch_scaling: {
        batch_size: targetBatchQty,
        uom: targetUom
      },
      data: result
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch inventory formulations.', error: err.message });
  }
});

/**
 * 2. GET /api/v1/external/inventory/formulations/:idOrCode
 * Fetch a single formulation with raw materials scaled to a specific target batch size
 */
router.get('/formulations/:idOrCode', authenticateInventoryApi, async (req, res) => {
  try {
    const { idOrCode } = req.params;
    const { batch_size = 100, uom = 'kg' } = req.query;
    const targetBatchQty = parseFloat(batch_size) || 100;
    const targetUom = String(uom).toLowerCase() === 'g' ? 'g' : 'kg';

    let formula = null;
    if (/^\d+$/.test(idOrCode)) {
      formula = await db('formulas').where({ id: idOrCode }).first();
    }
    if (!formula) {
      formula = await db('formulas').where('code', 'like', idOrCode).first();
    }
    if (!formula) {
      formula = await db('formulas').where('name', 'like', `%${idOrCode}%`).first();
    }

    if (!formula) {
      return res.status(404).json({ success: false, message: `Formula '${idOrCode}' not found.` });
    }

    // Find latest approved version
    const version = await db('formula_versions')
      .where({ formula_id: formula.id, version_status: 'APPROVED' })
      .orderBy('major_version', 'desc')
      .orderBy('minor_version', 'desc')
      .first();

    if (!version) {
      return res.status(404).json({
        success: false,
        message: `No approved version found for formula '${formula.code} — ${formula.name}'. Inventory can only access approved formulations.`
      });
    }

    // Fetch materials
    const materials = await db('formula_version_materials')
      .leftJoin('materials', 'formula_version_materials.material_id', 'materials.id')
      .leftJoin('vendors', 'materials.vendor_id', 'vendors.id')
      .where({ 'formula_version_materials.version_id': version.id })
      .select(
        'formula_version_materials.percentage',
        'materials.code as material_code',
        'materials.name as material_name',
        'materials.category as material_category',
        'vendors.name as vendor_name'
      )
      .orderBy('formula_version_materials.addition_order', 'asc');

    const sanitizedRawMaterials = sanitizeMaterialsForInventory(materials, targetBatchQty, targetUom);

    return res.json({
      success: true,
      formula: {
        formula_id: formula.id,
        code: formula.code,
        name: formula.name,
        category: formula.product_category,
        brand_type: formula.brand_type,
        version: `V${version.major_version}.${version.minor_version}`,
        status: version.version_status,
        compounding_code: version.compounding_code || null,
        target_batch_qty: targetBatchQty,
        target_uom: targetUom
      },
      raw_materials_count: sanitizedRawMaterials.length,
      raw_materials: sanitizedRawMaterials
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch formula raw materials.', error: err.message });
  }
});

/**
 * 3. POST /api/v1/external/inventory/calculate-bom
 * Body: { formula_code: "...", target_batch_qty: 100, target_uom: "kg" }
 * Computes exact raw material quantities needed for inventory picking/staging
 */
router.post('/calculate-bom', authenticateInventoryApi, async (req, res) => {
  try {
    const { formula_code, formula_id, target_batch_qty = 100, target_uom = 'kg' } = req.body;
    const targetQtyNum = parseFloat(target_batch_qty) || 100;
    const uomStr = String(target_uom).toLowerCase() === 'g' ? 'g' : 'kg';

    if (!formula_code && !formula_id) {
      return res.status(400).json({
        success: false,
        message: 'Please provide formula_code or formula_id in the request body.'
      });
    }

    let formula = null;
    if (formula_id) {
      formula = await db('formulas').where({ id: formula_id }).first();
    } else if (formula_code) {
      formula = await db('formulas').where('code', 'like', formula_code.trim()).first();
    }

    if (!formula) {
      return res.status(404).json({ success: false, message: 'Formula not found.' });
    }

    const version = await db('formula_versions')
      .where({ formula_id: formula.id, version_status: 'APPROVED' })
      .orderBy('major_version', 'desc')
      .orderBy('minor_version', 'desc')
      .first();

    if (!version) {
      return res.status(404).json({ success: false, message: 'Approved version not found for this formula.' });
    }

    const materials = await db('formula_version_materials')
      .leftJoin('materials', 'formula_version_materials.material_id', 'materials.id')
      .leftJoin('vendors', 'materials.vendor_id', 'vendors.id')
      .where({ 'formula_version_materials.version_id': version.id })
      .select(
        'formula_version_materials.percentage',
        'materials.code as material_code',
        'materials.name as material_name',
        'materials.category as material_category',
        'vendors.name as vendor_name'
      );

    const sanitizedRawMaterials = sanitizeMaterialsForInventory(materials, targetQtyNum, uomStr);

    return res.json({
      success: true,
      message: 'Raw material requirement calculated successfully for inventory.',
      formula_code: formula.code,
      formula_name: formula.name,
      version: `V${version.major_version}.${version.minor_version}`,
      target_batch_qty: targetQtyNum,
      target_uom: uomStr,
      raw_materials_count: sanitizedRawMaterials.length,
      raw_materials_needed: sanitizedRawMaterials
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to calculate BOM.', error: err.message });
  }
});

/**
 * 4. GET /api/v1/external/inventory/active-batches
 * List active batches queued or currently compounding, and the exact raw materials they need
 */
router.get('/active-batches', authenticateInventoryApi, async (req, res) => {
  try {
    const batches = await db('production_batches')
      .leftJoin('formulas', 'production_batches.formula_id', 'formulas.id')
      .whereIn('production_batches.status', ['PENDING', 'QUEUED', 'IN_PROGRESS', 'APPROVED'])
      .select(
        'production_batches.id as batch_id',
        'production_batches.batch_number',
        'production_batches.compounding_code',
        'production_batches.target_batch_size',
        'production_batches.target_batch_uom',
        'production_batches.status',
        'production_batches.created_at',
        'formulas.code as formula_code',
        'formulas.name as formula_name',
        'formulas.product_category'
      )
      .orderBy('production_batches.created_at', 'desc')
      .limit(50);

    const batchIds = batches.map(b => b.batch_id);

    // Fetch requirements from batch_material_requirements
    const reqs = batchIds.length > 0
      ? await db('batch_material_requirements')
          .leftJoin('materials', 'batch_material_requirements.material_id', 'materials.id')
          .leftJoin('vendors', 'materials.vendor_id', 'vendors.id')
          .whereIn('batch_material_requirements.batch_id', batchIds)
          .select(
            'batch_material_requirements.batch_id',
            'batch_material_requirements.target_quantity',
            'batch_material_requirements.uom',
            'materials.code as material_code',
            'materials.name as material_name',
            'vendors.name as vendor_name'
          )
      : [];

    const result = batches.map(b => {
      const bReqs = reqs.filter(r => Number(r.batch_id) === Number(b.batch_id)).map(r => ({
        material_code: r.material_code || 'MAT-000',
        material_name: r.material_name || 'Raw Material',
        required_quantity: Number(parseFloat(r.target_quantity || 0).toFixed(4)),
        uom: r.uom || b.target_batch_uom || 'kg',
        supplier: r.vendor_name || 'Approved Supplier'
      }));

      return {
        batch_id: b.batch_id,
        batch_number: b.batch_number,
        compounding_code: b.compounding_code,
        formula_code: b.formula_code,
        formula_name: b.formula_name,
        target_batch_size: Number(parseFloat(b.target_batch_size || 0).toFixed(2)),
        target_uom: b.target_batch_uom || 'kg',
        status: b.status,
        created_at: b.created_at,
        raw_materials_count: bReqs.length,
        raw_materials_needed: bReqs
      };
    });

    return res.json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch active batches for inventory.', error: err.message });
  }
});

export default router;
