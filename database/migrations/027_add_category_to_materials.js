/**
 * Migration 027: Add category column to materials table
 */
export async function up(knex) {
  const hasCategory = await knex.schema.hasColumn('materials', 'category');
  if (!hasCategory) {
    await knex.schema.table('materials', (table) => {
      table.string('category', 50).notNullable().defaultTo('Cosmetic');
    });
  }
}

export async function down(knex) {
  const hasCategory = await knex.schema.hasColumn('materials', 'category');
  if (hasCategory) {
    await knex.schema.table('materials', (table) => {
      table.dropColumn('category');
    });
  }
}
