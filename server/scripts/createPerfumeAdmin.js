import bcrypt from 'bcryptjs';
import db from '../db.js';

async function createPerfumeAdmin() {
  const email = process.env.PERFUME_ADMIN_EMAIL || 'perfume.admin@nkb.com';
  const password = process.env.PERFUME_ADMIN_PASSWORD || 'PerfumeAdmin@123456';
  const username = 'perfume_admin';

  try {
    const existing = await db('users').where({ email }).orWhere({ username }).first();
    if (existing) {
      console.log(`ℹ️ Perfume Admin user ('${username}' / '${email}') already exists.`);
      process.exit(0);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [userId] = await db('users').insert({
      username,
      email,
      password_hash: passwordHash,
      first_name: 'Perfume',
      last_name: 'Master Admin',
      is_active: true,
    }).then(res => [res[0]]);

    // Assign Super Admin & Formulation Chemist roles
    let adminRole = await db('roles').where({ name: 'Super Admin' }).first();
    if (!adminRole) {
      const [roleId] = await db('roles').insert({ name: 'Super Admin', description: 'Full system control' }).then(res => [res[0]]);
      adminRole = { id: roleId };
    }

    let chemistRole = await db('roles').where({ name: 'Formulation Chemist' }).first();

    await db('user_roles').insert({ user_id: userId, role_id: adminRole.id });
    if (chemistRole) {
      await db('user_roles').insert({ user_id: userId, role_id: chemistRole.id });
    }

    console.log(`✅ Perfume Master Admin account created successfully!`);
    console.log(`Username: ${username}`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to create Perfume Admin:', err);
    process.exit(1);
  }
}

createPerfumeAdmin();
