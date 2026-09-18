import { express } from '../cjsRequire.js';
import db from '../db.js';
import crypto from 'crypto';
import { authenticateToken, requireRoles } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = express.Router();

// GET /api/v1/settings
router.get('/', authenticateToken, async (req, res) => {
  try {
    const settings = await db('system_settings').select('*');
    const settingsMap = {
      auto_send_to_operator_mes: 'false', // Default OFF: Print mode only
    };
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }
    return res.json({ success: true, data: settingsMap, raw: settings });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch settings.', error: err.message });
  }
});

// PUT /api/v1/settings
router.put('/', authenticateToken, async (req, res) => {
  try {
    const { settings } = req.body; // Object of key-value pairs
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, message: 'Settings object required.' });
    }

    for (const [key, value] of Object.entries(settings)) {
      const existing = await db('system_settings').where({ key }).first();
      if (existing) {
        await db('system_settings').where({ key }).update({ value: String(value), updated_at: db.fn.now() });
      } else {
        await db('system_settings').insert({ key, value: String(value) });
      }
    }

    await logAudit(req, 'UPDATE_SYSTEM_SETTINGS', 'SystemSettings', null, null, settings);
    return res.json({ success: true, message: 'System settings updated successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update settings.', error: err.message });
  }
});

// POST /api/v1/settings/reset - Dangerous Database Reset (Super Admin Only)
router.post('/reset', authenticateToken, requireRoles('Super Admin'), async (req, res) => {
  try {
    const { confirmation } = req.body;
    if (confirmation !== 'RESET_ALL_DATA') {
      return res.status(400).json({ success: false, message: 'Invalid confirmation code. Please type RESET_ALL_DATA.' });
    }

    await db.raw('SET FOREIGN_KEY_CHECKS = 0');

    const tables = [
      'production_batches',
      'batch_phases',
      'batch_steps',
      'batch_material_requirements',
      'batch_material_entries',
      'batch_assignments',
      'batch_execution_locks',
      'electronic_signatures',
      'qr_tokens',
      'formula_workflow_records',
      'formula_cost_snapshots',
      'formula_cost_snapshot_items',
      'formula_version_materials',
      'formula_instructions',
      'formula_phases',
      'cosmetic_formula_details',
      'perfume_formula_details',
      'supplement_formula_details',
      'formula_versions',
      'formulas',
      'material_cost_history',
      'materials',
      'audit_logs'
    ];

    for (const table of tables) {
      await db(table).truncate();
    }

    await db.raw('SET FOREIGN_KEY_CHECKS = 1');

    return res.json({ success: true, message: 'Database reset completed. All formulation, materials, and batch records have been permanently cleared.' });
  } catch (err) {
    console.error('Database reset failed:', err);
    try {
      await db.raw('SET FOREIGN_KEY_CHECKS = 1');
    } catch (_) {}
    return res.status(500).json({ success: false, message: 'Failed to reset database.', error: err.message });
  }
});

// GET /api/v1/settings/sheet-layout/:code
router.get('/sheet-layout/:code', authenticateToken, async (req, res) => {
  try {
    const { code } = req.params;
    const key = `sheet_layout_${code}`;
    const setting = await db('system_settings').where({ key }).first();
    const defaultLayout = {
      columnWidths: { quantity: 20, rawMaterial: 50, lotNo: 30 },
      rowHeights: { default: 36, rows: {} }
    };

    if (!setting || !setting.value) {
      return res.json({ success: true, layout: defaultLayout });
    }

    try {
      const parsed = JSON.parse(setting.value);
      return res.json({ success: true, layout: parsed });
    } catch (_) {
      return res.json({ success: true, layout: defaultLayout });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch sheet layout.', error: err.message });
  }
});

// PUT /api/v1/settings/sheet-layout/:code
router.put('/sheet-layout/:code', authenticateToken, async (req, res) => {
  try {
    const { code } = req.params;
    const { layout } = req.body;
    if (!layout || typeof layout !== 'object') {
      return res.status(400).json({ success: false, message: 'Layout object required.' });
    }

    const key = `sheet_layout_${code}`;
    const strVal = JSON.stringify(layout);
    const existing = await db('system_settings').where({ key }).first();

    if (existing) {
      await db('system_settings').where({ key }).update({ value: strVal, updated_at: db.fn.now() });
    } else {
      await db('system_settings').insert({ key, value: strVal });
    }

    return res.json({ success: true, message: 'Sheet layout updated successfully.', layout });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update sheet layout.', error: err.message });
  }
});

// GET /api/v1/settings/inventory-api-key - Retrieve or initialize Inventory Formulation API Key
router.get('/inventory-api-key', authenticateToken, async (req, res) => {
  try {
    let keySetting = await db('system_settings').where({ key: 'inventory_api_key' }).first();
    let enabledSetting = await db('system_settings').where({ key: 'inventory_api_enabled' }).first();

    if (!keySetting || !keySetting.value) {
      // Auto-generate default API Key
      const newKey = `nkb_inv_live_${crypto.randomBytes(16).toString('hex')}`;
      if (keySetting) {
        await db('system_settings').where({ key: 'inventory_api_key' }).update({ value: newKey, updated_at: db.fn.now() });
      } else {
        await db('system_settings').insert({
          key: 'inventory_api_key',
          value: newKey,
          description: 'API Key for External Inventory Formulation Raw Materials Access'
        });
      }
      keySetting = { value: newKey, updated_at: new Date() };
    }

    if (!enabledSetting) {
      await db('system_settings').insert({
        key: 'inventory_api_enabled',
        value: 'true',
        description: 'Toggle for External Inventory Formulation API access'
      });
      enabledSetting = { value: 'true' };
    }

    return res.json({
      success: true,
      apiKey: keySetting.value,
      isEnabled: enabledSetting.value === 'true' || enabledSetting.value === '1',
      lastUpdated: keySetting.updated_at
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch inventory API key.', error: err.message });
  }
});

// POST /api/v1/settings/generate-inventory-api-key - Regenerate a fresh secure Inventory API Key
router.post('/generate-inventory-api-key', authenticateToken, async (req, res) => {
  try {
    const newKey = `nkb_inv_live_${crypto.randomBytes(16).toString('hex')}`;
    const existing = await db('system_settings').where({ key: 'inventory_api_key' }).first();

    if (existing) {
      await db('system_settings').where({ key: 'inventory_api_key' }).update({
        value: newKey,
        updated_at: db.fn.now()
      });
    } else {
      await db('system_settings').insert({
        key: 'inventory_api_key',
        value: newKey,
        description: 'API Key for External Inventory Formulation Raw Materials Access'
      });
    }

    await logAudit(req, 'REGENERATE_INVENTORY_API_KEY', 'SystemSettings', null, null, { action: 'regenerate_api_key' });

    return res.json({
      success: true,
      message: 'New Inventory API Key generated successfully.',
      apiKey: newKey
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to generate inventory API key.', error: err.message });
  }
});

// PUT /api/v1/settings/inventory-api-status - Toggle Inventory API Enabled/Disabled
router.put('/inventory-api-status', authenticateToken, async (req, res) => {
  try {
    const { isEnabled } = req.body;
    const strVal = isEnabled ? 'true' : 'false';
    const existing = await db('system_settings').where({ key: 'inventory_api_enabled' }).first();

    if (existing) {
      await db('system_settings').where({ key: 'inventory_api_enabled' }).update({
        value: strVal,
        updated_at: db.fn.now()
      });
    } else {
      await db('system_settings').insert({
        key: 'inventory_api_enabled',
        value: strVal,
        description: 'Toggle for External Inventory Formulation API access'
      });
    }

    return res.json({
      success: true,
      message: `Inventory API is now ${isEnabled ? 'ENABLED' : 'DISABLED'}.`,
      isEnabled: Boolean(isEnabled)
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update inventory API status.', error: err.message });
  }
});

export default router;
