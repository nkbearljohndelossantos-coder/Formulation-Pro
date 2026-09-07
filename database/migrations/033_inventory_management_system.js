/**
 * Migration 033: Enterprise Inventory Management System
 * Adds inventory_items, inventory_transactions, rejected_materials,
 * rejected_material_attachments, and inventory_reservations.
 */

export async function up(knex) {
  // 1. Inventory Items / Stock Ledger
  await knex.schema.createTable('inventory_items', (table) => {
    table.increments('id').primary();
    table.string('item_type', 30).notNullable(); // RAW_MATERIAL, PACKAGING, FINISHED_GOODS
    table.integer('material_id').unsigned().nullable().references('id').inTable('materials').onDelete('SET NULL');
    table.integer('formula_id').unsigned().nullable().references('id').inTable('formulas').onDelete('SET NULL');
    table.integer('formula_version_id').unsigned().nullable().references('id').inTable('formula_versions').onDelete('SET NULL');
    table.integer('batch_id').unsigned().nullable().references('id').inTable('production_batches').onDelete('SET NULL');
    table.string('lot_number', 100).notNullable().index();
    table.integer('vendor_id').unsigned().nullable().references('id').inTable('vendors').onDelete('SET NULL');
    table.string('supplier_lot_number', 100).nullable();
    table.decimal('current_stock', 18, 6).notNullable().defaultTo(0);
    table.decimal('reserved_stock', 18, 6).notNullable().defaultTo(0);
    table.decimal('available_stock', 18, 6).notNullable().defaultTo(0);
    table.decimal('minimum_stock', 18, 6).notNullable().defaultTo(0);
    table.decimal('reorder_level', 18, 6).notNullable().defaultTo(0);
    table.decimal('maximum_stock', 18, 6).nullable();
    table.string('uom', 20).notNullable().defaultTo('kg');
    table.string('location', 100).notNullable().defaultTo('RM-WH-A');
    table.string('storage_condition', 100).nullable().defaultTo('Ambient 15-25°C');
    table.string('coa_reference', 100).nullable();
    table.timestamp('receiving_date').nullable();
    table.date('retest_date').nullable();
    table.date('expiration_date').nullable();
    table.string('status', 30).notNullable().defaultTo('NORMAL'); // NORMAL, LOW_STOCK, OUT_OF_STOCK, OVERSTOCK, QC_HOLD, EXPIRED
    table.timestamps(true, true);
  });

  // 2. Inventory Transactions (Append-Only Transaction Ledger)
  await knex.schema.createTable('inventory_transactions', (table) => {
    table.increments('id').primary();
    table.string('transaction_code', 50).notNullable().unique();
    table.integer('inventory_item_id').unsigned().notNullable().references('id').inTable('inventory_items').onDelete('CASCADE');
    table.string('item_type', 30).notNullable();
    table.integer('material_id').unsigned().nullable().references('id').inTable('materials');
    table.integer('batch_id').unsigned().nullable().references('id').inTable('production_batches');
    table.string('transaction_type', 30).notNullable(); // STOCK_IN, STOCK_OUT, ADJUSTMENT_IN, ADJUSTMENT_OUT, TRANSFER, RESERVE, UNRESERVE, REJECTION, RETURN, DISPOSAL, REUSE
    table.decimal('quantity', 18, 6).notNullable();
    table.string('uom', 20).notNullable().defaultTo('kg');
    table.decimal('previous_balance', 18, 6).notNullable();
    table.decimal('new_balance', 18, 6).notNullable();
    table.string('lot_number', 100).notNullable();
    table.string('from_location', 100).nullable();
    table.string('to_location', 100).nullable();
    table.string('reference_number', 100).nullable();
    table.text('reason').nullable();
    table.string('department', 100).nullable().defaultTo('Warehouse');
    table.integer('performed_by').unsigned().notNullable().references('id').inTable('users');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 3. Rejected Materials
  await knex.schema.createTable('rejected_materials', (table) => {
    table.increments('id').primary();
    table.string('rejection_code', 50).notNullable().unique();
    table.integer('material_id').unsigned().nullable().references('id').inTable('materials').onDelete('SET NULL');
    table.string('material_code', 50).notNullable();
    table.string('material_name', 150).notNullable();
    table.string('material_type', 30).notNullable().defaultTo('RAW_MATERIAL'); // RAW_MATERIAL, PACKAGING
    table.integer('vendor_id').unsigned().nullable().references('id').inTable('vendors').onDelete('SET NULL');
    table.string('supplier_name', 150).nullable();
    table.string('supplier_lot_number', 100).nullable();
    table.integer('inventory_item_id').unsigned().nullable().references('id').inTable('inventory_items').onDelete('SET NULL');
    table.decimal('rejected_quantity', 18, 6).notNullable();
    table.string('uom', 20).notNullable().defaultTo('kg');
    table.text('reason').notNullable();
    table.timestamp('date_rejected').defaultTo(knex.fn.now());
    table.integer('rejected_by').unsigned().notNullable().references('id').inTable('users');
    table.string('location', 100).notNullable().defaultTo('Rejected Material Area');
    table.string('disposition', 50).notNullable().defaultTo('Pending Review'); // Pending Review, For Return, For Disposal, For Rework, Approved for Reuse, Returned to Supplier, Disposed
    table.string('status', 30).notNullable().defaultTo('Open'); // Open, In Disposition, Closed
    table.text('disposition_notes').nullable();
    table.integer('disposition_by').unsigned().nullable().references('id').inTable('users');
    table.timestamp('disposition_at').nullable();
    table.timestamps(true, true);
  });

  // 4. Rejected Material Attachments (Evidence & Documentation Junction)
  await knex.schema.createTable('rejected_material_attachments', (table) => {
    table.increments('id').primary();
    table.integer('rejected_material_id').unsigned().notNullable().references('id').inTable('rejected_materials').onDelete('CASCADE');
    table.integer('attachment_id').unsigned().notNullable().references('id').inTable('document_attachments').onDelete('CASCADE');
    table.text('description').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 5. Inventory Batch Reservations
  await knex.schema.createTable('inventory_reservations', (table) => {
    table.increments('id').primary();
    table.integer('batch_id').unsigned().notNullable().references('id').inTable('production_batches').onDelete('CASCADE');
    table.integer('inventory_item_id').unsigned().notNullable().references('id').inTable('inventory_items').onDelete('CASCADE');
    table.integer('material_id').unsigned().notNullable().references('id').inTable('materials');
    table.decimal('reserved_quantity', 18, 6).notNullable();
    table.string('uom', 20).notNullable().defaultTo('kg');
    table.string('status', 30).notNullable().defaultTo('RESERVED'); // RESERVED, CONSUMED, RELEASED
    table.timestamps(true, true);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('inventory_reservations');
  await knex.schema.dropTableIfExists('rejected_material_attachments');
  await knex.schema.dropTableIfExists('rejected_materials');
  await knex.schema.dropTableIfExists('inventory_transactions');
  await knex.schema.dropTableIfExists('inventory_items');
}
