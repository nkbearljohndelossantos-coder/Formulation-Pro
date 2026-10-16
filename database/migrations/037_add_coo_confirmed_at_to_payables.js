/**
 * Migration 037: Add coo_confirmed_at column to payables table
 * Accurately preserves original executive approval timestamps
 * Works seamlessly across SQLite and MariaDB/MySQL (Hostinger)
 */
export async function up(knex) {
  const hasPayables = await knex.schema.hasTable('payables');
  if (hasPayables) {
    const hasCol = await knex.schema.hasColumn('payables', 'coo_confirmed_at');
    if (!hasCol) {
      await knex.schema.alterTable('payables', (table) => {
        table.string('coo_confirmed_at', 50).nullable().index();
      });
      console.log('✅ Added column "coo_confirmed_at" to table "payables".');
    }
  }
}

export async function down(knex) {
  const hasPayables = await knex.schema.hasTable('payables');
  if (hasPayables) {
    const hasCol = await knex.schema.hasColumn('payables', 'coo_confirmed_at');
    if (hasCol) {
      await knex.schema.alterTable('payables', (table) => {
        table.dropColumn('coo_confirmed_at');
      });
    }
  }
}
