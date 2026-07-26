import bcrypt from 'bcryptjs';
import db from '../db.js';

export async function ensurePerfumeAdminAccounts() {
  try {
    // 1. Accounts Seeding Only (perfume_admin, perfume, perfumeadmin)
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

    // 2. Ensure Perfume domain starts 100% CLEAN & EMPTY (Remove pre-seeded demo perfume vendors/materials)
    const hasVendorCat = await db.schema.hasColumn('vendors', 'category');
    if (hasVendorCat) {
      await db('vendors').where('code', 'like', 'VEND-PRF%').orWhere({ category: 'Perfume' }).del();
    }

    const hasMatCat = await db.schema.hasColumn('materials', 'category');
    if (hasMatCat) {
      await db('materials').where('code', 'like', 'MAT-ETH%')
        .orWhere('code', 'like', 'MAT-ROS%')
        .orWhere('code', 'like', 'MAT-SND%')
        .orWhere('code', 'like', 'MAT-DPG%')
        .orWhere('code', 'like', 'MAT-ISO%')
        .orWhere('code', 'like', 'MAT-MUS%')
        .orWhere({ category: 'Perfume' })
        .del();
    }

    console.log('✅ Perfume Admin accounts configured. Perfume domain initialized 100% clean & empty.');
  } catch (err) {
    console.error('⚠️ Note on Perfume Admin auto-seed:', err.message);
  }
}
