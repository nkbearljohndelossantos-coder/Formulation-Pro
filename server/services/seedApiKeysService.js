import db from '../db.js';

export const MY_NKB_API_KEY = 'nkb_live_317afeed3bd23218969a04d4abecdfb6';
export const PC_NKB_API_KEY = 'nkb_live_f1d0f3378f2fab77868d961f0c9084a5e427174e964eba2f';
export const LEGACY_MASTER_KEY = 'nkb_live_77be0f89d17ebc1b46ce3e7c3151f943';

export const INITIAL_API_KEYS = [
  {
    key_name: 'my.nkbmanufacturing.com API',
    client_app: 'https://my.nkbmanufacturing.com/',
    api_key: MY_NKB_API_KEY,
    scopes: 'payables:read,payables:create,payables:confirm',
    is_active: 1,
    rate_limit_rpm: 300,
  },
  {
    key_name: 'pc.nkbmanufacturing.com API',
    client_app: 'https://pc.nkbmanufacturing.com/',
    api_key: PC_NKB_API_KEY,
    scopes: 'payables:read,payables:create,payables:confirm',
    is_active: 1,
    rate_limit_rpm: 300,
  },
  {
    key_name: 'Primary NKB Master Key',
    client_app: 'my.nkbmanufacturing.com (Global Admin)',
    api_key: LEGACY_MASTER_KEY,
    scopes: 'payables:read,payables:create,payables:confirm',
    is_active: 1,
    rate_limit_rpm: 300,
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
    }

    // Seed/ensure all predefined system API keys
    for (const keyDef of INITIAL_API_KEYS) {
      const existing = await db('api_keys').where({ api_key: keyDef.api_key }).first();
      if (!existing) {
        await db('api_keys').insert({
          ...keyDef,
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log(`✅ Seeded API key "${keyDef.key_name}" (${keyDef.client_app}) in "api_keys".`);
      } else if (!existing.is_active) {
        // Ensure it's active
        await db('api_keys').where({ id: existing.id }).update({ is_active: 1, updated_at: db.fn.now() });
      }
    }
  } catch (err) {
    console.error('Error ensuring api_keys table:', err.message);
  }
}
