import { express } from '../cjsRequire.js';
import db from '../db.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = express.Router();

// GET /api/v1/vendors - List active vendors
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category, productCategory } = req.query;

    const isPerfumeUser = req.user?.username?.toLowerCase().includes('perfume') ||
                          req.user?.email?.toLowerCase().includes('perfume') ||
                          (req.user?.roles && req.user.roles.some(r => String(r).toLowerCase().includes('perfume')));

    let domainCat = productCategory || category;
    if (!domainCat && isPerfumeUser) {
      domainCat = 'Perfume';
    }

    const query = db('vendors').where({ is_active: true });

    const hasCategoryCol = await db.schema.hasColumn('vendors', 'category');
    if (hasCategoryCol && domainCat && domainCat !== 'All') {
      query.andWhere(b => {
        b.where('vendors.category', domainCat).orWhere('vendors.category', 'All');
      });
    }

    const vendors = await query.orderBy('name', 'asc');
    return res.json({ success: true, data: vendors });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch vendors.', error: err.message });
  }
});

// POST /api/v1/vendors - Create vendor reference
router.post('/', authenticateToken, requireRoles('Super Admin', 'Formulator', 'Formulation Chemist', 'Production Supervisor'), async (req, res) => {
  try {
    const { code, name, contactPerson, email, phone, category } = req.body;
    if (!code || !name) {
      return res.status(400).json({ success: false, message: 'Vendor code and name are required.' });
    }

    const existing = await db('vendors').where({ code }).first();
    if (existing) {
      return res.status(400).json({ success: false, message: `Vendor code '${code}' already exists.` });
    }

    const isPerfumeUser = req.user?.username?.toLowerCase().includes('perfume') ||
                          req.user?.email?.toLowerCase().includes('perfume') ||
                          (req.user?.roles && req.user.roles.some(r => String(r).toLowerCase().includes('perfume')));

    const vendorCategory = category || (isPerfumeUser ? 'Perfume' : 'Cosmetic');

    const payload = {
      code,
      name,
      contact_person: contactPerson || null,
      email: email || null,
      phone: phone || null,
      is_active: true,
    };

    const hasCatCol = await db.schema.hasColumn('vendors', 'category');
    if (hasCatCol) {
      payload.category = vendorCategory;
    }

    const [id] = await db('vendors').insert(payload).then(res => [res[0]]);

    await logAudit(req, 'CREATE_VENDOR', 'Vendor', id, null, { code, name });
    return res.status(201).json({ success: true, message: 'Vendor reference created.', vendorId: id, vendor: { id, code, name, contact_person: contactPerson, email, phone, category: vendorCategory } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create vendor.', error: err.message });
  }
});

// DELETE /api/v1/vendors/:id - Delete vendor reference
router.delete('/:id', authenticateToken, requireRoles('Super Admin', 'Formulator', 'Formulation Chemist', 'Production Supervisor'), async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await db('vendors').where({ id }).first();
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found.' });
    }

    // Set materials with this vendor_id to null
    await db('materials').where({ vendor_id: id }).update({ vendor_id: null });
    await db('vendors').where({ id }).del();

    await logAudit(req, 'DELETE_VENDOR', 'Vendor', id, vendor, null);
    return res.json({ success: true, message: `Vendor '${vendor.name}' deleted successfully.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete vendor.', error: err.message });
  }
});

export default router;
