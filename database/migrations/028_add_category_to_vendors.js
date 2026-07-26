/**
 * Migration 028: Add category column to vendors table
 */
export async function up(knex) {
  const hasCategory = await knex.schema.hasColumn('vendors', 'category');
  if (!hasCategory) {
    await knex.schema.table('vendors', (table) => {
      table.string('category', 50).notNullable().defaultTo('Cosmetic');
    });
  }
}

export async function down(knex) {
  const hasCategory = await knex.schema.hasColumn('vendors', 'category');
  if (hasCategory) {
    await knex.schema.table('vendors', (table) => {
      table.dropColumn('category');
    });
  }
}
