import { express } from '../cjsRequire.js';
import Decimal from 'decimal.js';
import db from '../db.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { UOM_CATEGORIES } from '../services/unitConversionService.js';

const router = express.Router();

// GET /api/v1/materials - Search & Filter Materials
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, category, uomCategory, productCategory, companyId, vendorId, activeOnly } = req.query;

    const query = db('materials')
      .leftJoin('companies', 'materials.company_id', 'companies.id')
      .leftJoin('vendors', 'materials.vendor_id', 'vendors.id')
      .select(
        'materials.*',
        'companies.name as company_name',
        'companies.code as company_code',
        'vendors.name as vendor_name',
        'vendors.code as vendor_code'
      );

    if (activeOnly !== 'false') {
      query.where('materials.is_active', true);
    }

    if (search) {
      query.andWhere(b => {
        b.where('materials.name', 'like', `%${search}%`)
         .orWhere('materials.code', 'like', `%${search}%`)
         .orWhere('materials.description', 'like', `%${search}%`);
      });
    }

    // UOM Category filter (MASS, VOLUME, COUNT)
    const targetUomCat = uomCategory || (['MASS', 'VOLUME', 'COUNT'].includes(category) ? category : null);
    if (targetUomCat) {
      query.andWhere('materials.uom_category', targetUomCat);
    }

    // Domain Category filter (Cosmetic, Perfume, Supplement)
    const isPerfumeUser = req.user?.username?.toLowerCase().includes('perfume') ||
                          req.user?.email?.toLowerCase().includes('perfume') ||
                          (req.user?.roles && req.user.roles.some(r => String(r).toLowerCase().includes('perfume')));

    let domainCat = productCategory || (!['MASS', 'VOLUME', 'COUNT'].includes(category) ? category : null);
    if (!domainCat && isPerfumeUser) {
      domainCat = 'Perfume';
    }

    const hasCategoryCol = await db.schema.hasColumn('materials', 'category');
    if (hasCategoryCol && domainCat && domainCat !== 'All') {
      query.andWhere(b => {
        b.where('materials.category', domainCat).orWhere('materials.category', 'All');
      });
    }

    if (companyId) {
      query.andWhere('materials.company_id', companyId);
    }

    if (vendorId) {
      query.andWhere('materials.vendor_id', vendorId);
    }

    const materials = await query.orderBy('materials.name', 'asc');
    return res.json({ success: true, data: materials });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch materials.', error: err.message });
  }
});

// POST /api/v1/materials/bulk - Bulk Import/Upload/Update Materials
router.post('/bulk', authenticateToken, async (req, res) => {
  try {
    const { materials } = req.body;
    if (!Array.isArray(materials) || materials.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or empty materials list.' });
    }

    const isPerfumeUser = req.user?.username?.toLowerCase().includes('perfume') ||
                          req.user?.email?.toLowerCase().includes('perfume') ||
                          (req.user?.roles && req.user.roles.some(r => String(r).toLowerCase().includes('perfume')));
    const defaultDomainCategory = isPerfumeUser ? 'Perfume' : 'Cosmetic';
    const hasCategoryCol = await db.schema.hasColumn('materials', 'category');

    let inserted = 0;
    let updated = 0;
    const skipped = [];

    await db.transaction(async (trx) => {
      for (let i = 0; i < materials.length; i++) {
        const m = materials[i];
        if (!m || !m.code || !m.name) {
          skipped.push({ row: i + 1, reason: 'Missing code or name' });
          continue;
        }

        const rawCode = String(m.code).trim();
        const rawName = String(m.name).trim();
        if (!rawCode || !rawName) {
          skipped.push({ row: i + 1, reason: 'Empty code or name' });
          continue;
        }

        // Determine UOM and UOM category (DB column is `uom`, not `default_uom`)
        const rawUom = m.uom || m.default_uom || m.unit || 'g';
        const cleanUom = String(rawUom).trim() || 'g';
        let cleanUomCat = m.uom_category ? String(m.uom_category).trim().toUpperCase() : '';
        if (!['MASS', 'VOLUME', 'COUNT'].includes(cleanUomCat)) {
          cleanUomCat = UOM_CATEGORIES[cleanUom] || 'MASS';
        }

        // Numeric fields formatted cleanly
        const costDec = (m.cost !== null && m.cost !== undefined && !isNaN(Number(m.cost)))
          ? new Decimal(m.cost).toFixed(6)
          : '0.000000';
        const densityDec = (m.density_kg_per_l !== null && m.density_kg_per_l !== undefined && !isNaN(Number(m.density_kg_per_l)))
          ? new Decimal(m.density_kg_per_l).toFixed(6)
          : '1.000000';
        const sgDec = (m.specific_gravity !== null && m.specific_gravity !== undefined && !isNaN(Number(m.specific_gravity)))
          ? new Decimal(m.specific_gravity).toFixed(6)
          : densityDec;

        const rawActive = m.is_active !== undefined ? m.is_active : true;
        const isActive = !(String(rawActive).toLowerCase() === 'false' || String(rawActive) === '0');

        const payload = {
          code: rawCode,
          name: rawName,
          description: m.description ? String(m.description).trim() : null,
          uom: cleanUom,
          uom_category: cleanUomCat,
          cost: costDec,
          currency_code: m.currency_code ? String(m.currency_code).trim().toUpperCase() : 'PHP',
          density_kg_per_l: densityDec,
          specific_gravity: sgDec,
          is_active: isActive,
          updated_at: trx.fn.now(),
        };

        if (hasCategoryCol) {
          payload.category = m.category && String(m.category).trim()
            ? String(m.category).trim()
            : defaultDomainCategory;
        }

        const existing = await trx('materials').where({ code: payload.code }).first();
        if (existing) {
          const oldCost = new Decimal(existing.cost || '0').toFixed(6);
          const newCost = costDec;
          if (oldCost !== newCost) {
            await trx('material_cost_history').insert({
              material_id: existing.id,
              old_cost: oldCost,
              new_cost: newCost,
              old_currency_code: existing.currency_code || 'PHP',
              new_currency_code: payload.currency_code,
              effective_date: trx.fn.now(),
              changed_by_user_id: req.user?.id || null,
            });
          }

          await trx('materials').where({ id: existing.id }).update(payload);
          updated++;
        } else {
          payload.created_at = trx.fn.now();
          const insertResult = await trx('materials').insert(payload);
          const newId = insertResult && insertResult[0] ? (typeof insertResult[0] === 'object' ? insertResult[0].id : insertResult[0]) : null;

          if (newId) {
            await trx('material_cost_history').insert({
              material_id: newId,
              old_cost: '0.000000',
              new_cost: costDec,
              old_currency_code: payload.currency_code,
              new_currency_code: payload.currency_code,
              effective_date: trx.fn.now(),
              changed_by_user_id: req.user?.id || null,
            });
          }

          inserted++;
        }
      }
    });

    return res.json({
      success: true,
      message: `Successfully processed ${inserted + updated} materials (${inserted} new, ${updated} updated).`,
      data: { inserted, updated, skippedCount: skipped.length }
    });
  } catch (err) {
    console.error('Bulk upload error:', err);
    return res.status(500).json({ success: false, message: 'Bulk upload failed: ' + err.message, error: err.message });
  }
});

// GET /api/v1/materials/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const material = await db('materials')
      .leftJoin('companies', 'materials.company_id', 'companies.id')
      .leftJoin('vendors', 'materials.vendor_id', 'vendors.id')
      .where('materials.id', req.params.id)
      .select(
        'materials.*',
        'companies.name as company_name',
        'vendors.name as vendor_name'
      )
      .first();

    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found.' });
    }

    return res.json({ success: true, data: material });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch material details.', error: err.message });
  }
});

// GET /api/v1/materials/:id/cost-history
router.get('/:id/cost-history', authenticateToken, async (req, res) => {
  try {
    const history = await db('material_cost_history')
      .leftJoin('users', 'material_cost_history.changed_by_user_id', 'users.id')
      .where('material_cost_history.material_id', req.params.id)
      .select(
        'material_cost_history.*',
        'users.username as changed_by_username',
        'users.first_name as changed_by_first_name',
        'users.last_name as changed_by_last_name'
      )
      .orderBy('material_cost_history.created_at', 'desc');

    return res.json({ success: true, data: history });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch material cost history.', error: err.message });
  }
});

// POST /api/v1/materials - Create Material (Matches exact requested fields)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      code,
      companyId,
      vendorId,
      uom,
      cost,
      currencyCode,
      densityKgPerL,
      specificGravity,
      unitWeight,
      unitWeightUom,
      description,
      isInventoried,
      category,
    } = req.body;

    if (!name || !code || !uom) {
      return res.status(400).json({ success: false, message: 'Material Name, Code, and UOM are required.' });
    }

    const existing = await db('materials').where({ code }).first();
    if (existing) {
      return res.status(400).json({ success: false, message: `Material Code '${code}' already exists.` });
    }

    const isPerfumeUser = req.user?.username?.toLowerCase().includes('perfume') ||
                          req.user?.email?.toLowerCase().includes('perfume') ||
                          (req.user?.roles && req.user.roles.some(r => String(r).toLowerCase().includes('perfume')));

    const materialCategory = category || (isPerfumeUser ? 'Perfume' : 'Cosmetic');

    const uomCategory = UOM_CATEGORIES[uom] || 'MASS';
    const costDec = new Decimal(cost || '0').toFixed(6);
    const densityDec = new Decimal(densityKgPerL || '1.000000').toFixed(6);
    const sgDec = new Decimal(specificGravity || densityKgPerL || '1.000000').toFixed(6);
    const unitWtDec = unitWeight ? new Decimal(unitWeight).toFixed(6) : null;

    const payload = {
      code,
      name,
      company_id: companyId || null,
      vendor_id: vendorId || null,
      uom,
      uom_category: uomCategory,
      cost: costDec,
      currency_code: currencyCode || 'PHP',
      density_kg_per_l: densityDec,
      specific_gravity: sgDec,
      unit_weight: unitWtDec,
      unit_weight_uom: unitWeightUom || null,
      description: description || null,
      is_inventoried: Boolean(isInventoried),
      is_active: true,
    };

    const hasCatCol = await db.schema.hasColumn('materials', 'category');
    if (hasCatCol) {
      payload.category = materialCategory;
    }

    const [materialId] = await db('materials').insert(payload).then(res => [res[0]]);

    // Record initial cost history entry
    await db('material_cost_history').insert({
      material_id: materialId,
      old_cost: '0.000000',
      new_cost: costDec,
      old_currency_code: currencyCode || 'PHP',
      new_currency_code: currencyCode || 'PHP',
      effective_date: db.fn.now(),
      changed_by_user_id: req.user.id,
    });

    await logAudit(req, 'CREATE_MATERIAL', 'Material', materialId, null, { code, name, cost: costDec });
    return res.status(201).json({ success: true, message: 'Material created successfully.', materialId });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create material.', error: err.message });
  }
});

// PUT /api/v1/materials/:id - Edit Material (Tracks cost history automatically)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db('materials').where({ id }).first();
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Material not found.' });
    }

    const {
      code,
      name,
      companyId,
      vendorId,
      uom,
      cost,
      currencyCode,
      densityKgPerL,
      specificGravity,
      unitWeight,
      unitWeightUom,
      description,
      isInventoried,
      isActive,
      is_active,
      category,
    } = req.body;

    if (code && code.trim() !== existing.code) {
      const codeCheck = await db('materials').where({ code: code.trim() }).whereNot({ id }).first();
      if (codeCheck) {
        return res.status(400).json({ success: false, message: `Material Code '${code}' is already used by another material.` });
      }
    }

    const uomCategory = uom ? (UOM_CATEGORIES[uom] || existing.uom_category) : existing.uom_category;

    const newCostDec = (cost !== undefined && cost !== null && String(cost).trim() !== '')
      ? new Decimal(cost).toFixed(6)
      : (existing.cost ? new Decimal(existing.cost).toFixed(6) : '0.000000');

    const newCurrency = currencyCode || existing.currency_code;
    const oldCostDec = existing.cost ? new Decimal(existing.cost).toFixed(6) : '0.000000';
    const oldCurrency = existing.currency_code;

    const activeStatus = isActive !== undefined ? Boolean(isActive) : (is_active !== undefined ? Boolean(is_active) : Boolean(existing.is_active));

    const densityDec = (densityKgPerL !== undefined && densityKgPerL !== null && String(densityKgPerL).trim() !== '')
      ? new Decimal(densityKgPerL).toFixed(6)
      : (existing.density_kg_per_l ? new Decimal(existing.density_kg_per_l).toFixed(6) : '1.000000');

    const sgDec = (specificGravity !== undefined && specificGravity !== null && String(specificGravity).trim() !== '')
      ? new Decimal(specificGravity).toFixed(6)
      : (existing.specific_gravity ? new Decimal(existing.specific_gravity).toFixed(6) : '1.000000');

    const unitWtDec = (unitWeight !== undefined && unitWeight !== null && String(unitWeight).trim() !== '')
      ? new Decimal(unitWeight).toFixed(6)
      : existing.unit_weight;

    const updatePayload = {
      code: code ? code.trim() : existing.code,
      name: name ? name.trim() : existing.name,
      company_id: companyId !== undefined ? (companyId ? companyId : null) : existing.company_id,
      vendor_id: vendorId !== undefined ? (vendorId ? vendorId : null) : existing.vendor_id,
      uom: uom || existing.uom,
      uom_category: uomCategory,
      cost: newCostDec,
      currency_code: newCurrency,
      density_kg_per_l: densityDec,
      specific_gravity: sgDec,
      unit_weight: unitWtDec,
      unit_weight_uom: unitWeightUom !== undefined ? unitWeightUom : existing.unit_weight_uom,
      description: description !== undefined ? description : existing.description,
      is_inventoried: isInventoried !== undefined ? Boolean(isInventoried) : Boolean(existing.is_inventoried),
      is_active: activeStatus,
      updated_at: db.fn.now(),
    };

    const hasCatCol = await db.schema.hasColumn('materials', 'category');
    if (hasCatCol && category !== undefined) {
      updatePayload.category = category;
    }

    await db('materials').where({ id }).update(updatePayload);

    // Check if cost or currency changed -> insert into material_cost_history
    if (newCostDec !== oldCostDec || newCurrency !== oldCurrency) {
      await db('material_cost_history').insert({
        material_id: id,
        old_cost: oldCostDec,
        new_cost: newCostDec,
        old_currency_code: oldCurrency,
        new_currency_code: newCurrency,
        effective_date: db.fn.now(),
        changed_by_user_id: req.user.id,
      });
    }

    await logAudit(req, 'UPDATE_MATERIAL', 'Material', id, existing, { code: updatePayload.code, name: updatePayload.name, cost: newCostDec, currency: newCurrency });
    return res.json({ success: true, message: 'Material updated successfully.' });
  } catch (err) {
    console.error('Error updating material:', err);
    return res.status(500).json({ success: false, message: 'Failed to update material.', error: err.message });
  }
});

// DELETE /api/v1/materials/:id - Delete material (Soft or Permanent Delete for Admins)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;
    const material = await db('materials').where({ id }).first();
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found.' });
    }

    if (permanent === 'true') {
      await db('materials').where({ id }).del();
      await logAudit(req, 'DELETE_MATERIAL_PERMANENT', 'Material', id, material, null);
      return res.json({ success: true, message: `Material '${material.name}' permanently deleted.` });
    }

    await db('materials').where({ id }).update({
      is_active: false,
      archived_at: db.fn.now(),
      archived_by: req.user.id,
    });

    await logAudit(req, 'DELETE_MATERIAL', 'Material', id, material, { is_active: false });
    return res.json({ success: true, message: `Material '${material.name}' deleted successfully.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete material.', error: err.message });
  }
});

export default router;
