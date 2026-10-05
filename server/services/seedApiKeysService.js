import db from '../db.js';

export const MY_NKB_API_KEY = 'nkb_inv_live_6ae6965c1ca61aef54939d6b1ecfac1b';
export const MY_NKB_LEGACY_KEY = 'nkb_live_317afeed3bd23218969a04d4abecdfb6';
export const PC_NKB_API_KEY = 'nkb_live_f1d0f3378f2fab77868d961f0c9084a5e427174e964eba2f';
export const LEGACY_MASTER_KEY = 'nkb_live_77be0f89d17ebc1b46ce3e7c3151f943';

export const INITIAL_API_KEYS = [
  {
    key_name: 'my.nkbmanufacturing.com API',
    client_app: 'https://my.nkbmanufacturing.com/',
    api_key: MY_NKB_API_KEY,
    scopes: 'payables:read,payables:create,payables:confirm',
    is_active: 1,
  },
  {
    key_name: 'my.nkbmanufacturing.com Secondary API',
    client_app: 'https://my.nkbmanufacturing.com/',
    api_key: MY_NKB_LEGACY_KEY,
    scopes: 'payables:read,payables:create,payables:confirm',
    is_active: 1,
  },
  {
    key_name: 'pc.nkbmanufacturing.com API',
    client_app: 'https://pc.nkbmanufacturing.com/',
    api_key: PC_NKB_API_KEY,
    scopes: 'payables:read,payables:create,payables:confirm',
    is_active: 1,
  },
  {
    key_name: 'Primary NKB Master Key',
    client_app: 'my.nkbmanufacturing.com (Global Admin)',
    api_key: LEGACY_MASTER_KEY,
    scopes: 'payables:read,payables:create,payables:confirm',
    is_active: 1,
  }
];

/**
 * Ensures the `api_keys` table exists and seeds the active NKB portal keys
 * Works seamlessly across SQLite (dev) and MySQL (Hostinger production)
 */
export async function ensureApiKeysTable() {
  try {
    const hasTable = await db.schema.hasTable('api_keys');
    if (!hasTable) {
      await db.schema.createTable('api_keys', (table) => {
        table.increments('id').primary();
        table.string('key_name', 120).notNullable();
        table.string('client_app', 150).notNullable();
        table.string('api_key', 128).notNullable().unique();
        table.string('scopes', 255).defaultTo('payables:read,payables:create,payables:confirm');
        table.boolean('is_active').defaultTo(true);
        table.integer('rate_limit_rpm').defaultTo(120);
        table.timestamp('last_used_at').nullable();
        table.timestamps(true, true);
      });
      console.log('✅ Created table "api_keys" in database.');
    } else {
      // Add missing columns if they don't exist yet on MySQL
      try {
        const hasScopes = await db.schema.hasColumn('api_keys', 'scopes');
        if (!hasScopes) {
          await db.schema.table('api_keys', (t) => {
            t.string('scopes', 255).defaultTo('payables:read,payables:create,payables:confirm');
          });
          console.log('✅ Added missing "scopes" column to api_keys.');
        }
      } catch (_) {}

      try {
        const hasRateLimit = await db.schema.hasColumn('api_keys', 'rate_limit_rpm');
        if (!hasRateLimit) {
          await db.schema.table('api_keys', (t) => {
            t.integer('rate_limit_rpm').defaultTo(120);
          });
          console.log('✅ Added missing "rate_limit_rpm" column to api_keys.');
        }
      } catch (_) {}
    }

    const hasScopesCol = await db.schema.hasColumn('api_keys', 'scopes').catch(() => false);

    // Seed/ensure all predefined system API keys
    for (const keyDef of INITIAL_API_KEYS) {
      const existing = await db('api_keys').where({ api_key: keyDef.api_key }).first();
      if (!existing) {
        const insertObj = {
          key_name: keyDef.key_name,
          client_app: keyDef.client_app,
          api_key: keyDef.api_key,
          is_active: 1,
          created_at: new Date(),
          updated_at: new Date()
        };
        if (hasScopesCol) insertObj.scopes = keyDef.scopes;
        await db('api_keys').insert(insertObj);
        console.log(`✅ Seeded API key "${keyDef.key_name}" (${keyDef.client_app}) in "api_keys".`);
      } else if (!existing.is_active) {
        await db('api_keys').where({ id: existing.id }).update({ is_active: 1, updated_at: db.fn.now() });
      }
    }
  } catch (err) {
    console.error('Error ensuring api_keys table:', err.message);
  }
}
