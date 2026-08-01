/**
 * Migration 029: Remove Unique Constraint from formula_version_materials to allow split/duplicate material additions in same phase
 */
export async function up(knex) {
  try {
    const clientName = (knex.client && knex.client.config && knex.client.config.client) ? String(knex.client.config.client) : '';
    if (clientName.includes('mysql')) {
      await knex.raw('ALTER TABLE formula_version_materials DROP INDEX uq_version_mat_phase;').catch(() => {});
    }
  } catch (err) {
    console.log('Migration 029 non-blocking note:', err.message);
  }
}

export async function down(knex) {
  // No-op
}
