import bcrypt from 'bcryptjs';
import db from '../db.js';

async function createPerfumeAdmin() {
  const accounts = [
    { username: 'perfume_admin', email: 'perfume.admin@nkb.com', password: 'Admin@123456', firstName: 'Perfume', lastName: 'Master Admin' },
    { username: 'perfume', email: 'perfume@nkb.com', password: 'Admin@123456', firstName: 'Perfume', lastName: 'Admin' },
    { username: 'perfumeadmin', email: 'perfumeadmin@nkb.com', password: 'Admin@123456', firstName: 'Perfume', lastName: 'Chemist' },
  ];

  try {
    const adminRole = await db('roles').where({ name: 'Super Admin' }).first();
    const chemistRole = await db('roles').where({ name: 'Formulation Chemist' }).first();

    for (const acc of accounts) {
      const passwordHash = await bcrypt.hash(acc.password, 10);
      const existing = await db('users').where({ email: acc.email }).orWhere({ username: acc.username }).first();

      let userId;
      if (existing) {
        await db('users').where({ id: existing.id }).update({
          password_hash: passwordHash,
          is_active: true,
          updated_at: db.fn.now(),
        });
        userId = existing.id;
        console.log(`🔄 Updated password & activated user '${acc.username}' (${acc.email})`);
      } else {
        const [newId] = await db('users').insert({
          username: acc.username,
          email: acc.email,
          password_hash: passwordHash,
          first_name: acc.firstName,
          last_name: acc.lastName,
          is_active: true,
        }).then(res => [res[0]]);
        userId = newId;
        console.log(`✅ Created new user '${acc.username}' (${acc.email})`);
      }

      if (adminRole) {
        const hasAdminRole = await db('user_roles').where({ user_id: userId, role_id: adminRole.id }).first();
        if (!hasAdminRole) {
          await db('user_roles').insert({ user_id: userId, role_id: adminRole.id });
        }
      }

      if (chemistRole) {
        const hasChemistRole = await db('user_roles').where({ user_id: userId, role_id: chemistRole.id }).first();
        if (!hasChemistRole) {
          await db('user_roles').insert({ user_id: userId, role_id: chemistRole.id });
        }
      }
    }

    console.log(`\n🎉 Perfume Accounts Ready:`);
    accounts.forEach(a => console.log(` - Username: ${a.username} | Email: ${a.email} | Password: ${a.password}`));
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to setup Perfume Admin accounts:', err);
    process.exit(1);
  }
}

createPerfumeAdmin();
