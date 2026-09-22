/**
 * Migration 035: Add SOP Timestamps to Batch Calculations & Compounding Logs
 */

export async function up(knex) {
  const hasBatchCalc = await knex.schema.hasTable('batch_calculations');
  if (hasBatchCalc) {
    const hasCol = await knex.schema.hasColumn('batch_calculations', 'sop_timestamps');
    if (!hasCol) {
      await knex.schema.table('batch_calculations', (table) => {
        table.text('sop_timestamps').nullable();
      });
    }
  }

  const hasCpLogs = await knex.schema.hasTable('compounding_code_logs');
  if (hasCpLogs) {
    const hasCol = await knex.schema.hasColumn('compounding_code_logs', 'sop_timestamps');
    if (!hasCol) {
      await knex.schema.table('compounding_code_logs', (table) => {
        table.text('sop_timestamps').nullable();
      });
    }
  }
}

export async function down(knex) {
  const hasBatchCalc = await knex.schema.hasTable('batch_calculations');
  if (hasBatchCalc) {
    const hasCol = await knex.schema.hasColumn('batch_calculations', 'sop_timestamps');
    if (hasCol) {
      await knex.schema.table('batch_calculations', (table) => {
        table.dropColumn('sop_timestamps');
      });
    }
  }

  const hasCpLogs = await knex.schema.hasTable('compounding_code_logs');
  if (hasCpLogs) {
    const hasCol = await knex.schema.hasColumn('compounding_code_logs', 'sop_timestamps');
    if (hasCol) {
      await knex.schema.table('compounding_code_logs', (table) => {
        table.dropColumn('sop_timestamps');
      });
    }
  }
}
