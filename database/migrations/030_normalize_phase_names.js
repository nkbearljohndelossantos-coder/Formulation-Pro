/**
 * Migration 030: Normalize all legacy formula_phases to clean Phase A, Phase B, Phase C format
 */
export async function up(knex) {
  try {
    const phases = await knex('formula_phases').select('*');
    for (const p of phases) {
      if (!p.phase_name) continue;
      const match = String(p.phase_name).trim().match(/^Phase\s+([A-Za-z0-9]+)/i);
      let newName = p.phase_name;
      if (match) {
        newName = `Phase ${match[1].toUpperCase()}`;
      } else {
        const lower = String(p.phase_name).toLowerCase();
        if (lower.includes('water')) newName = 'Phase A';
        else if (lower.includes('surfactant') || lower.includes('oil')) newName = 'Phase B';
        else if (lower.includes('active')) newName = 'Phase C';
        else if (lower.includes('cooling')) newName = 'Phase D';
        else if (lower.includes('post')) newName = 'Phase E';
      }

      if (newName !== p.phase_name) {
        await knex('formula_phases').where({ id: p.id }).update({ phase_name: newName });
      }
    }
  } catch (err) {
    console.log('Migration 030 non-blocking note:', err.message);
  }
}

export async function down(knex) {
  // No-op
}
