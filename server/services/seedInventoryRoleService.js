import db from '../db.js';

export const INVENTORY_PERMISSIONS = [
  { key: 'inventory.view', name: 'View Inventory', description: 'Allows viewing stock levels, locations, and inventory items' },
  { key: 'inventory.stock_in', name: 'Stock In Inventory', description: 'Allows receiving raw materials, packaging, and finished goods' },
  { key: 'inventory.stock_out', name: 'Stock Out Inventory', description: 'Allows deducting inventory stock for production or dispatch' },
  { key: 'inventory.adjust', name: 'Adjust Inventory', description: 'Allows manually adjusting stock quantities' },
  { key: 'inventory.transfer', name: 'Transfer Inventory', description: 'Allows moving inventory stock between locations' },
  { key: 'inventory.history', name: 'View Inventory History', description: 'Allows viewing full transaction history and ledgers' },
  { key: 'material.view', name: 'View Material Master', description: 'Allows viewing material master list' },
  { key: 'material.create', name: 'Create Material', description: 'Allows registering new materials' },
  { key: 'material.edit', name: 'Edit Material', description: 'Allows editing material master entries' },
  { key: 'rejected_material.view', name: 'View Rejected Materials', description: 'Allows viewing rejected materials and evidence' },
  { key: 'rejected_material.create', name: 'Reject Material', description: 'Allows logging material rejections with attachments' },
  { key: 'rejected_material.disposition', name: 'Set Rejection Disposition', description: 'Allows setting disposition actions for rejected materials' },
];

export async function seedInventoryRoleAndPermissions() {
  try {
    // 1. Ensure permissions exist
    const permissionIds = [];
    for (const p of INVENTORY_PERMISSIONS) {
      let existing = await db('permissions').where({ key: p.key }).first();
      if (!existing) {
        const [id] = await db('permissions').insert({
          key: p.key,
          name: p.name,
          description: p.description,
          created_at: new Date(),
          updated_at: new Date(),
        });
        permissionIds.push(typeof id === 'object' ? id.id : id);
      } else {
        permissionIds.push(existing.id);
      }
    }

    // 2. Ensure "Inventory Account" role exists
    let inventoryRole = await db('roles').where({ name: 'Inventory Account' }).first();
    let inventoryRoleId;
    if (!inventoryRole) {
      const [id] = await db('roles').insert({
        name: 'Inventory Account',
        description: 'Inventory Manager responsible for material stock, receiving, dispatch, transfers, and rejections',
        created_at: new Date(),
        updated_at: new Date(),
      });
      inventoryRoleId = typeof id === 'object' ? id.id : id;
    } else {
      inventoryRoleId = inventoryRole.id;
    }

    // 3. Link permissions to "Inventory Account"
    for (const permId of permissionIds) {
      if (permId) {
        const link = await db('role_permissions').where({ role_id: inventoryRoleId, permission_id: permId }).first();
        if (!link) {
          await db('role_permissions').insert({ role_id: inventoryRoleId, permission_id: permId });
        }
      }
    }

    // 4. Ensure "Super Admin" role has all permissions linked
    const superAdminRole = await db('roles').where({ name: 'Super Admin' }).first();
    if (superAdminRole) {
      for (const permId of permissionIds) {
        if (permId) {
          const link = await db('role_permissions').where({ role_id: superAdminRole.id, permission_id: permId }).first();
          if (!link) {
            await db('role_permissions').insert({ role_id: superAdminRole.id, permission_id: permId });
          }
        }
      }
    }

    console.log('✅ Inventory Account role and permissions seeded successfully.');
  } catch (err) {
    console.error('Error seeding Inventory Account role:', err.message);
  }
}
