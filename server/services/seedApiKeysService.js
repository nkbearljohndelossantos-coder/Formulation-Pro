import db from '../db.js';

export const DEFAULT_MASTER_API_KEY = 'nkb_live_77be0f89d17ebc1b46ce3e7c3151f943';

/**
 * Ensures the `api_keys` table exists and seeds the default master key
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

    // Ensure the default master key exists
    const masterExists = await db('api_keys').where({ api_key: DEFAULT_MASTER_API_KEY }).first();
    if (!masterExists) {
      await db('api_keys').insert({
        key_name: 'Primary NKB Master Key',
        client_app: 'my.nkbmanufacturing.com (Global Admin)',
        api_key: DEFAULT_MASTER_API_KEY,
        scopes: 'payables:read,payables:create,payables:confirm',
        is_active: 1,
        rate_limit_rpm: 300,
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log('✅ Seeded Primary NKB Master Key in "api_keys".');
    }
  } catch (err) {
    console.error('Error ensuring api_keys table:', err.message);
  }
}
