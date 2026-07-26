import bcrypt from 'bcryptjs';
import db from '../db.js';

export async function ensurePerfumeAdminAccounts() {
  try {
    // 1. Accounts Seeding
    const accounts = [
      { username: 'perfume_admin', email: 'perfume.admin@nkb.com', password: 'Admin@123456', firstName: 'Perfume', lastName: 'Master Admin' },
      { username: 'perfume', email: 'perfume@nkb.com', password: 'Admin@123456', firstName: 'Perfume', lastName: 'Admin' },
      { username: 'perfumeadmin', email: 'perfumeadmin@nkb.com', password: 'Admin@123456', firstName: 'Perfume', lastName: 'Chemist' },
    ];

    let adminRole = await db('roles').where({ name: 'Super Admin' }).first();
    let chemistRole = await db('roles').where({ name: 'Formulation Chemist' }).first();

    for (const acc of accounts) {
      const existing = await db('users').where({ email: acc.email }).orWhere({ username: acc.username }).first();
      const passwordHash = await bcrypt.hash(acc.password, 10);

      let userId;
      if (existing) {
        await db('users').where({ id: existing.id }).update({
          password_hash: passwordHash,
          is_active: true,
          updated_at: db.fn.now(),
        });
        userId = existing.id;
      } else {
        const result = await db('users').insert({
          username: acc.username,
          email: acc.email,
          password_hash: passwordHash,
          first_name: acc.firstName,
          last_name: acc.lastName,
          is_active: true,
        });
        userId = Array.isArray(result) ? result[0] : result;
      }

      if (adminRole && userId) {
        const hasAdmin = await db('user_roles').where({ user_id: userId, role_id: adminRole.id }).first();
        if (!hasAdmin) {
          await db('user_roles').insert({ user_id: userId, role_id: adminRole.id });
        }
      }

      if (chemistRole && userId) {
        const hasChemist = await db('user_roles').where({ user_id: userId, role_id: chemistRole.id }).first();
        if (!hasChemist) {
          await db('user_roles').insert({ user_id: userId, role_id: chemistRole.id });
        }
      }
    }

    // 2. Perfume Vendors Seeding (Category = Perfume)
    const perfumeVendors = [
      { code: 'VEND-PRF-001', name: 'Fine Fragrance Essences & Aroma Chemicals Ltd.', contact_person: 'Jean-Luc Dupont', email: 'orders@fragrance-essences.fr', phone: '+33 4 93 36 00 00', category: 'Perfume' },
      { code: 'VEND-PRF-002', name: 'French Perfumery Ethanol & Fixatives Corp.', contact_person: 'Claire Moreau', email: 'info@perfume-ethanol.fr', phone: '+33 1 42 68 55 00', category: 'Perfume' },
      { code: 'VEND-PRF-003', name: 'Grasse Essential Oils & Natural Extracts Co.', contact_person: 'Antoine Laurent', email: 'sales@grasse-oils.fr', phone: '+33 4 93 70 12 34', category: 'Perfume' },
    ];

    const hasVendorCategoryCol = await db.schema.hasColumn('vendors', 'category');
    if (hasVendorCategoryCol) {
      for (const v of perfumeVendors) {
        const existVend = await db('vendors').where({ code: v.code }).first();
        if (!existVend) {
          await db('vendors').insert({
            code: v.code,
            name: v.name,
            contact_person: v.contact_person,
            email: v.email,
            phone: v.phone,
            category: v.category,
            is_active: true,
          });
        }
      }
    }

    // 3. Perfume Raw Materials Seeding (Category = Perfume)
    const perfumeMaterials = [
      { code: 'MAT-ETH-001', name: 'Dehydrated Perfumery Grade Ethanol 96%', uom: 'g', uom_category: 'MASS', cost: '0.085000', currency_code: 'PHP', density_kg_per_l: '0.808000', specific_gravity: '0.808000', description: 'Solvent carrier base for fine fragrance maceration', category: 'Perfume', is_inventoried: true },
      { code: 'MAT-ROS-002', name: 'Premium Damask Rose Essential Oil Concentrate', uom: 'g', uom_category: 'MASS', cost: '8.500000', currency_code: 'PHP', density_kg_per_l: '0.960000', specific_gravity: '0.960000', description: 'Floral heart note fragrance oil concentrate', category: 'Perfume', is_inventoried: true },
      { code: 'MAT-SND-003', name: 'Mysore Sandalwood & Amber Concentrate', uom: 'g', uom_category: 'MASS', cost: '12.000000', currency_code: 'PHP', density_kg_per_l: '0.980000', specific_gravity: '0.980000', description: 'Woody oriental base note fragrance oil', category: 'Perfume', is_inventoried: true },
      { code: 'MAT-DPG-004', name: 'Dipropylene Glycol (DPG) Scent Fixative', uom: 'g', uom_category: 'MASS', cost: '0.350000', currency_code: 'PHP', density_kg_per_l: '1.023000', specific_gravity: '1.023000', description: 'Fragrance fixative and diluent base', category: 'Perfume', is_inventoried: true },
      { code: 'MAT-ISO-005', name: 'Iso E Super Fragrance Enhancer', uom: 'g', uom_category: 'MASS', cost: '4.200000', currency_code: 'PHP', density_kg_per_l: '0.965000', specific_gravity: '0.965000', description: 'Velvety woody fragrance enhancer & sillage booster', category: 'Perfume', is_inventoried: true },
      { code: 'MAT-MUS-006', name: 'Galaxolide Musk Fixative (50% DPG)', uom: 'g', uom_category: 'MASS', cost: '3.800000', currency_code: 'PHP', density_kg_per_l: '1.005000', specific_gravity: '1.005000', description: 'Clean synthetic musk fixative for longevity', category: 'Perfume', is_inventoried: true },
    ];

    const hasCategoryColumn = await db.schema.hasColumn('materials', 'category');
    if (hasCategoryColumn) {
      for (const m of perfumeMaterials) {
        const existMat = await db('materials').where({ code: m.code }).first();
        if (!existMat) {
          await db('materials').insert({
            code: m.code,
            name: m.name,
            uom: m.uom,
            uom_category: m.uom_category,
            cost: m.cost,
            currency_code: m.currency_code,
            density_kg_per_l: m.density_kg_per_l,
            specific_gravity: m.specific_gravity,
            description: m.description,
            category: m.category,
            is_inventoried: true,
            is_active: true,
          });
        }
      }
    }

    console.log('✅ Automatic Perfume Admin accounts, Vendors & Perfume Raw Materials check complete.');
  } catch (err) {
    console.error('⚠️ Note on Perfume Admin auto-seed:', err.message);
  }
}
