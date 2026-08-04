/**
 * Migration 032: Add compounding_code to formula_versions
 * Ensures every formula version has a persistent, unique Compounding Code (CP-YYYY-XXXX).
 */

export async function up(knex) {
  const hasColumn = await knex.schema.hasColumn('formula_versions', 'compounding_code');
  if (!hasColumn) {
    await knex.schema.table('formula_versions', (table) => {
      table.string('compounding_code', 50).nullable();
    });
  }

  // Backfill existing formula_versions without compounding_code
  const versions = await knex('formula_versions').whereNull('compounding_code').orWhere('compounding_code', '');
  const currentYear = new Date().getFullYear();

  for (const v of versions) {
    const seq = await knex('system_sequences').where({ sequence_name: 'COMPOUNDING_CODE' }).first();
    let nextVal = 1;
    if (!seq) {
      await knex('system_sequences').insert({
        sequence_name: 'COMPOUNDING_CODE',
        current_val: 1,
        prefix: 'CP',
        year: currentYear,
      });
    } else {
      nextVal = seq.current_val + 1;
      await knex('system_sequences')
        .where({ sequence_name: 'COMPOUNDING_CODE' })
        .update({ current_val: nextVal, updated_at: knex.fn.now() });
    }

    const paddedVal = String(nextVal).padStart(4, '0');
    const code = `CP-${paddedVal}`;

    await knex('formula_versions')
      .where({ id: v.id })
      .update({ compounding_code: code });

    // Also register in compounding_code_logs for complete history
    const existingLog = await knex('compounding_code_logs').where({ compounding_code: code }).first();
    if (!existingLog) {
      await knex('compounding_code_logs').insert({
        compounding_code: code,
        batch_number: code.replace('CP-', 'BAT-'),
        formula_version: `V${v.major_version}.${v.minor_version}`,
        target_batch_size: v.target_batch_size,
        target_batch_uom: v.target_batch_uom || 'g',
        printed_by_name: 'System Pre-fill',
        created_at: knex.fn.now(),
      });
    }
  }
}

export async function down(knex) {
  const hasColumn = await knex.schema.hasColumn('formula_versions', 'compounding_code');
  if (hasColumn) {
    await knex.schema.table('formula_versions', (table) => {
      table.dropColumn('compounding_code');
    });
  }
}
