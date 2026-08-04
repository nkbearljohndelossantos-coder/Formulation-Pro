/**
 * Migration 031: Compounding Code Storage & Audit Log Table
 * Stores all generated unique compounding codes (CP-YYYY-XXXX), batch numbers,
 * formula metadata, copy numbers, target weights, and printing user signatures.
 */

export async function up(knex) {
  const hasTable = await knex.schema.hasTable('compounding_code_logs');
  if (!hasTable) {
    await knex.schema.createTable('compounding_code_logs', (table) => {
      table.increments('id').primary();
      table.string('compounding_code', 50).notNullable().unique();
      table.string('batch_number', 50).nullable();
      table.string('formula_code', 50).nullable();
      table.string('formula_name', 150).nullable();
      table.string('formula_version', 20).nullable();
      table.integer('copy_number').notNullable().defaultTo(1);
      table.integer('total_copies').notNullable().defaultTo(1);
      table.decimal('target_batch_size', 18, 6).nullable();
      table.string('target_batch_uom', 20).nullable().defaultTo('g');
      table.integer('printed_by_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
      table.string('printed_by_name', 100).nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // Ensure system_sequences has COMPOUNDING_CODE sequence entry initialized
  const seq = await knex('system_sequences').where({ sequence_name: 'COMPOUNDING_CODE' }).first();
  if (!seq) {
    const currentYear = new Date().getFullYear();
    await knex('system_sequences').insert({
      sequence_name: 'COMPOUNDING_CODE',
      current_val: 0,
      prefix: 'CP',
      year: currentYear,
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('compounding_code_logs');
}
