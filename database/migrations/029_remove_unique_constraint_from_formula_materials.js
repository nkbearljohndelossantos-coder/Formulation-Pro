/**
 * Migration 029: Remove Unique Constraint from formula_version_materials to allow split/duplicate material additions in same phase
 */
export async function up(knex) {
  const hasTable = await knex.schema.hasTable('formula_version_materials');
  if (hasTable) {
    try {
      await knex.schema.alterTable('formula_version_materials', (table) => {
        table.dropUnique(['version_id', 'material_id', 'phase_id'], 'uq_version_mat_phase');
      });
    } catch (err) {
      // Ignore if index does not exist or already dropped
    }
  }
}

export async function down(knex) {
  // No-op
}
