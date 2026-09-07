/**
 * Migration 034: Purchasing Rejection Tickets & QA Bypass Workflow
 */

export async function up(knex) {
  await knex.schema.createTable('purchasing_tickets', (table) => {
    table.increments('id').primary();
    table.string('ticket_number', 50).notNullable().unique();
    table.integer('rejected_material_id').unsigned().notNullable().references('id').inTable('rejected_materials').onDelete('CASCADE');
    table.integer('inventory_item_id').unsigned().nullable().references('id').inTable('inventory_items').onDelete('SET NULL');
    table.string('status', 40).notNullable().defaultTo('PENDING_PURCHASING_REVIEW'); // PENDING_PURCHASING_REVIEW, RETURN_TO_SUPPLIER, ON_HOLD, QA_BYPASSED, CLOSED
    table.string('issue_category', 100).nullable(); // Damaged Packaging, Expired / Retest Failed, Specification Mismatch, Contamination, COA Missing, Other
    table.text('purchasing_notes').nullable();
    table.text('bypass_justification').nullable();
    table.integer('decided_by').unsigned().nullable().references('id').inTable('users');
    table.timestamp('decided_at').nullable();
    table.timestamps(true, true);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('purchasing_tickets');
}
