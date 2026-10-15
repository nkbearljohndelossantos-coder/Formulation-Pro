/**
 * Migration 036: Create payables and payable_items tables
 * Ensures persistent, durable storage for external website payable requests
 * Works seamlessly across SQLite and MySQL (Hostinger)
 */
export async function up(knex) {
  const hasPayables = await knex.schema.hasTable('payables');
  if (!hasPayables) {
    await knex.schema.createTable('payables', (table) => {
      table.increments('id').primary();
      table.string('payable_number', 100).notNullable().unique();
      table.string('req_cheque_no', 100).nullable().index();
      table.string('external_reference', 150).nullable().index();
      table.string('idempotency_key', 150).nullable().index();
      table.string('source_portal', 100).defaultTo('my.nkbmanufacturing.com');
      table.string('source_system', 255).nullable();
      table.string('source_badge', 50).defaultTo('my.nkb');
      table.string('company', 255).notNullable();
      table.string('company_code', 50).nullable();
      table.string('payee_beneficiary', 255).notNullable();
      table.string('category', 150).nullable();
      table.string('bank_account', 150).nullable();
      table.text('purpose_usage').nullable();
      table.decimal('amount', 15, 2).notNullable().defaultTo(0.00);
      table.decimal('total', 15, 2).notNullable().defaultTo(0.00);
      table.decimal('amount_due', 15, 2).notNullable().defaultTo(0.00);
      table.decimal('subtotal', 15, 2).defaultTo(0.00);
      table.decimal('vat', 15, 2).defaultTo(0.00);
      table.decimal('vat_zero_rated', 15, 2).defaultTo(0.00);
      table.decimal('non_vat', 15, 2).defaultTo(0.00);
      table.decimal('withheld', 15, 2).defaultTo(0.00);
      table.string('date', 50).nullable();
      table.string('date_prepared', 50).nullable();
      table.string('date_cheque_issued', 50).nullable();
      table.string('cheque_date', 50).nullable();
      table.string('cheque_number', 100).nullable();
      table.string('control_number', 100).nullable();
      table.string('invoice_number', 100).nullable();
      table.string('invoice_date', 50).nullable();
      table.string('due_date', 50).nullable();
      table.string('term', 100).defaultTo('Net 30');
      table.string('status', 50).defaultTo('PENDING_COO_APPROVAL');
      table.string('coo_approval', 50).defaultTo('PENDING_COO_APPROVAL');
      table.string('checked_by', 150).nullable();
      table.string('prepared_by', 150).nullable();
      table.string('created_by', 150).nullable();
      table.text('attachment_url').nullable();
      table.text('files_json').nullable();
      table.text('items_json').nullable();
      table.text('comments').nullable();
      table.integer('api_key_id').nullable();
      table.text('raw_payload').nullable();
      table.timestamps(true, true);
    });
  }

  const hasPayableItems = await knex.schema.hasTable('payable_items');
  if (!hasPayableItems) {
    await knex.schema.createTable('payable_items', (table) => {
      table.increments('id').primary();
      table.integer('payable_id').unsigned().nullable();
      table.string('payable_number', 100).nullable().index();
      table.text('description').nullable();
      table.string('expense_category', 150).nullable();
      table.decimal('quantity', 12, 4).defaultTo(1.0000);
      table.decimal('cost', 15, 2).defaultTo(0.00);
      table.decimal('subtotal', 15, 2).defaultTo(0.00);
      table.decimal('total', 15, 2).defaultTo(0.00);
      table.decimal('vat', 15, 2).defaultTo(0.00);
      table.boolean('inclusive').defaultTo(false);
      table.string('date', 50).nullable();
      table.timestamps(true, true);
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('payable_items');
  await knex.schema.dropTableIfExists('payables');
}
