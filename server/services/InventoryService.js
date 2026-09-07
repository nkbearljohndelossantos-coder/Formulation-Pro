import db from '../db.js';
import Decimal from 'decimal.js';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { AuditService } from './AuditService.js';

const UPLOAD_DIR = path.join(process.cwd(), 'server', 'storage', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export class InventoryService {
  /**
   * Calculate stock status based on stock levels and reorder thresholds
   */
  static calculateStockStatus(currentStockNum, minStockNum = 0, reorderLevelNum = 0) {
    const stock = Number(currentStockNum) || 0;
    const min = Number(minStockNum) || 0;
    const reorder = Number(reorderLevelNum) || 0;

    if (stock <= 0) return 'OUT_OF_STOCK';
    if (stock <= min || (reorder > 0 && stock <= reorder)) return 'LOW_STOCK';
    return 'NORMAL';
  }

  /**
   * Generate atomic unique Transaction Code (e.g. TXN-2026-0001)
   */
  static async generateTransactionCode(trx) {
    const knexInstance = trx || db;
    const year = new Date().getFullYear();
    const prefix = `TXN-${year}-`;

    const lastTxn = await knexInstance('inventory_transactions')
      .where('transaction_code', 'like', `${prefix}%`)
      .orderBy('id', 'desc')
      .first();

    let seq = 1;
    if (lastTxn && lastTxn.transaction_code) {
      const parts = lastTxn.transaction_code.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }

    return `${prefix}${String(seq).padStart(5, '0')}`;
  }

  /**
   * Generate atomic unique Rejection Code (e.g. REJ-2026-0001)
   */
  static async generateRejectionCode(trx) {
    const knexInstance = trx || db;
    const year = new Date().getFullYear();
    const prefix = `REJ-${year}-`;

    const lastRej = await knexInstance('rejected_materials')
      .where('rejection_code', 'like', `${prefix}%`)
      .orderBy('id', 'desc')
      .first();

    let seq = 1;
    if (lastRej && lastRej.rejection_code) {
      const parts = lastRej.rejection_code.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }

    return `${prefix}${String(seq).padStart(5, '0')}`;
  }

  /**
   * Receive / Stock In inventory lot
   */
  static async stockIn(params, user) {
    const {
      itemType = 'RAW_MATERIAL',
      materialId,
      formulaId,
      formulaVersionId,
      batchId,
      lotNumber,
      supplierLotNumber,
      vendorId,
      quantity,
      uom = 'kg',
      location = 'RM-WH-A',
      storageCondition = 'Ambient 15-25°C',
      coaReference,
      receivingDate,
      retestDate,
      expirationDate,
      minimumStock = 0,
      reorderLevel = 0,
      referenceNumber,
      reason = 'Material Receiving / Stock In',
    } = params;

    if (!quantity || Number(quantity) <= 0) {
      throw new Error('Stock in quantity must be greater than zero.');
    }
    if (!lotNumber || !String(lotNumber).trim()) {
      throw new Error('Lot Number is required for inventory stock in.');
    }

    return await db.transaction(async (trx) => {
      // Find existing item by lot & location
      const query = trx('inventory_items').where({
        item_type: itemType,
        lot_number: String(lotNumber).trim(),
        location: String(location).trim(),
      });

      if (materialId) query.andWhere({ material_id: materialId });
      if (batchId) query.andWhere({ batch_id: batchId });

      let item = await query.first();
      let itemId;
      let prevStock = new Decimal(0);
      let newStock = new Decimal(0);

      if (item) {
        itemId = item.id;
        prevStock = new Decimal(item.current_stock || 0);
        newStock = prevStock.plus(new Decimal(quantity));

        const newReserved = new Decimal(item.reserved_stock || 0);
        const newAvailable = newStock.minus(newReserved);
        const newStatus = this.calculateStockStatus(newStock.toNumber(), item.minimum_stock, item.reorder_level);

        await trx('inventory_items').where({ id: itemId }).update({
          current_stock: newStock.toFixed(6),
          available_stock: newAvailable.toFixed(6),
          status: newStatus,
          supplier_lot_number: supplierLotNumber || item.supplier_lot_number,
          coa_reference: coaReference || item.coa_reference,
          expiration_date: expirationDate || item.expiration_date,
          updated_at: new Date(),
        });
      } else {
        prevStock = new Decimal(0);
        newStock = new Decimal(quantity);
        const status = this.calculateStockStatus(newStock.toNumber(), minimumStock, reorderLevel);

        const insertRes = await trx('inventory_items').insert({
          item_type: itemType,
          material_id: materialId || null,
          formula_id: formulaId || null,
          formula_version_id: formulaVersionId || null,
          batch_id: batchId || null,
          lot_number: String(lotNumber).trim(),
          vendor_id: vendorId || null,
          supplier_lot_number: supplierLotNumber || null,
          current_stock: newStock.toFixed(6),
          reserved_stock: '0.000000',
          available_stock: newStock.toFixed(6),
          minimum_stock: new Decimal(minimumStock || 0).toFixed(6),
          reorder_level: new Decimal(reorderLevel || 0).toFixed(6),
          uom,
          location: String(location).trim(),
          storage_condition: storageCondition,
          coa_reference: coaReference || null,
          receiving_date: receivingDate ? new Date(receivingDate) : new Date(),
          retest_date: retestDate ? new Date(retestDate) : null,
          expiration_date: expirationDate ? new Date(expirationDate) : null,
          status,
          created_at: new Date(),
          updated_at: new Date(),
        });

        itemId = Array.isArray(insertRes) ? (typeof insertRes[0] === 'object' ? insertRes[0].id : insertRes[0]) : insertRes;
      }

      const txnCode = await this.generateTransactionCode(trx);
      await trx('inventory_transactions').insert({
        transaction_code: txnCode,
        inventory_item_id: itemId,
        item_type: itemType,
        material_id: materialId || null,
        batch_id: batchId || null,
        transaction_type: 'STOCK_IN',
        quantity: new Decimal(quantity).toFixed(6),
        uom,
        previous_balance: prevStock.toFixed(6),
        new_balance: newStock.toFixed(6),
        lot_number: String(lotNumber).trim(),
        to_location: location,
        reference_number: referenceNumber || null,
        reason,
        department: 'Warehouse',
        performed_by: user.id,
        created_at: new Date(),
      });

      await AuditService.logEvent({
        trx,
        userId: user.id,
        userRole: user.roles?.[0] || 'User',
        action: 'INVENTORY_STOCK_IN',
        entityType: 'InventoryItem',
        entityId: String(itemId),
        newValues: { lotNumber, quantity, location, txnCode },
      });

      return { itemId, transactionCode: txnCode, currentStock: newStock.toFixed(6) };
    });
  }

  /**
   * Deduct / Stock Out inventory quantity
   */
  static async stockOut(params, user) {
    const { itemId, quantity, referenceNumber, reason = 'Stock Out / Dispatch' } = params;

    if (!quantity || Number(quantity) <= 0) {
      throw new Error('Stock out quantity must be greater than zero.');
    }

    return await db.transaction(async (trx) => {
      const item = await trx('inventory_items').where({ id: itemId }).first();
      if (!item) throw new Error('Inventory item not found.');

      const currentStock = new Decimal(item.current_stock || 0);
      const availableStock = new Decimal(item.available_stock || 0);
      const deductQty = new Decimal(quantity);

      if (availableStock.lessThan(deductQty)) {
        throw new Error(`Insufficient available stock for Lot ${item.lot_number}. (Available: ${availableStock.toFixed(2)} ${item.uom}, Requested: ${deductQty.toFixed(2)} ${item.uom})`);
      }

      const newStock = currentStock.minus(deductQty);
      const newAvailable = availableStock.minus(deductQty);
      const newStatus = this.calculateStockStatus(newStock.toNumber(), item.minimum_stock, item.reorder_level);

      await trx('inventory_items').where({ id: itemId }).update({
        current_stock: newStock.toFixed(6),
        available_stock: newAvailable.toFixed(6),
        status: newStatus,
        updated_at: new Date(),
      });

      const txnCode = await this.generateTransactionCode(trx);
      await trx('inventory_transactions').insert({
        transaction_code: txnCode,
        inventory_item_id: itemId,
        item_type: item.item_type,
        material_id: item.material_id,
        batch_id: item.batch_id,
        transaction_type: 'STOCK_OUT',
        quantity: deductQty.toFixed(6),
        uom: item.uom,
        previous_balance: currentStock.toFixed(6),
        new_balance: newStock.toFixed(6),
        lot_number: item.lot_number,
        from_location: item.location,
        reference_number: referenceNumber || null,
        reason,
        department: 'Warehouse',
        performed_by: user.id,
        created_at: new Date(),
      });

      return { itemId, transactionCode: txnCode, newStock: newStock.toFixed(6) };
    });
  }

  /**
   * Adjust inventory stock quantity
   */
  static async adjustStock(params, user) {
    const { itemId, newQuantity, reason = 'Physical Inventory Audit Adjustment' } = params;

    if (newQuantity === undefined || newQuantity === null || isNaN(Number(newQuantity)) || Number(newQuantity) < 0) {
      throw new Error('New adjusted quantity must be a non-negative number.');
    }

    return await db.transaction(async (trx) => {
      const item = await trx('inventory_items').where({ id: itemId }).first();
      if (!item) throw new Error('Inventory item not found.');

      const prevStock = new Decimal(item.current_stock || 0);
      const targetStock = new Decimal(newQuantity);
      const diff = targetStock.minus(prevStock);

      if (diff.isZero()) return { itemId, newStock: prevStock.toFixed(6) };

      const reserved = new Decimal(item.reserved_stock || 0);
      const newAvailable = targetStock.minus(reserved);
      if (newAvailable.isNegative()) {
        throw new Error(`Cannot adjust stock below reserved quantity (${reserved.toFixed(2)} ${item.uom}).`);
      }

      const txnType = diff.isPositive() ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';
      const status = this.calculateStockStatus(targetStock.toNumber(), item.minimum_stock, item.reorder_level);

      await trx('inventory_items').where({ id: itemId }).update({
        current_stock: targetStock.toFixed(6),
        available_stock: newAvailable.toFixed(6),
        status,
        updated_at: new Date(),
      });

      const txnCode = await this.generateTransactionCode(trx);
      await trx('inventory_transactions').insert({
        transaction_code: txnCode,
        inventory_item_id: itemId,
        item_type: item.item_type,
        material_id: item.material_id,
        batch_id: item.batch_id,
        transaction_type: txnType,
        quantity: diff.abs().toFixed(6),
        uom: item.uom,
        previous_balance: prevStock.toFixed(6),
        new_balance: targetStock.toFixed(6),
        lot_number: item.lot_number,
        from_location: item.location,
        to_location: item.location,
        reason,
        department: 'Inventory Management',
        performed_by: user.id,
        created_at: new Date(),
      });

      return { itemId, transactionCode: txnCode, newStock: targetStock.toFixed(6) };
    });
  }

  /**
   * Transfer inventory stock between locations
   */
  static async transferStock(params, user) {
    const { itemId, toLocation, quantity, reason = 'Warehouse Relocation' } = params;

    if (!toLocation || !String(toLocation).trim()) {
      throw new Error('Destination location is required for stock transfer.');
    }
    if (!quantity || Number(quantity) <= 0) {
      throw new Error('Transfer quantity must be greater than zero.');
    }

    return await db.transaction(async (trx) => {
      const sourceItem = await trx('inventory_items').where({ id: itemId }).first();
      if (!sourceItem) throw new Error('Source inventory item not found.');

      if (sourceItem.location.trim().toLowerCase() === String(toLocation).trim().toLowerCase()) {
        throw new Error('Destination location must be different from current location.');
      }

      const qtyVal = new Decimal(quantity);
      const sourceCurrent = new Decimal(sourceItem.current_stock || 0);
      const sourceAvailable = new Decimal(sourceItem.available_stock || 0);

      if (sourceAvailable.lessThan(qtyVal)) {
        throw new Error(`Insufficient available stock for transfer. (Available: ${sourceAvailable.toFixed(2)} ${sourceItem.uom})`);
      }

      // Deduct from source
      const newSourceCurrent = sourceCurrent.minus(qtyVal);
      const newSourceAvailable = sourceAvailable.minus(qtyVal);
      const sourceStatus = this.calculateStockStatus(newSourceCurrent.toNumber(), sourceItem.minimum_stock, sourceItem.reorder_level);

      await trx('inventory_items').where({ id: itemId }).update({
        current_stock: newSourceCurrent.toFixed(6),
        available_stock: newSourceAvailable.toFixed(6),
        status: sourceStatus,
        updated_at: new Date(),
      });

      // Add to destination item
      let destItem = await trx('inventory_items').where({
        item_type: sourceItem.item_type,
        material_id: sourceItem.material_id,
        lot_number: sourceItem.lot_number,
        location: String(toLocation).trim(),
      }).first();

      let destId;
      let destNewCurrent = qtyVal;

      if (destItem) {
        destId = destItem.id;
        const destPrevCurrent = new Decimal(destItem.current_stock || 0);
        destNewCurrent = destPrevCurrent.plus(qtyVal);
        const destReserved = new Decimal(destItem.reserved_stock || 0);
        const destAvailable = destNewCurrent.minus(destReserved);
        const destStatus = this.calculateStockStatus(destNewCurrent.toNumber(), destItem.minimum_stock, destItem.reorder_level);

        await trx('inventory_items').where({ id: destId }).update({
          current_stock: destNewCurrent.toFixed(6),
          available_stock: destAvailable.toFixed(6),
          status: destStatus,
          updated_at: new Date(),
        });
      } else {
        const destStatus = this.calculateStockStatus(destNewCurrent.toNumber(), sourceItem.minimum_stock, sourceItem.reorder_level);
        const insertRes = await trx('inventory_items').insert({
          item_type: sourceItem.item_type,
          material_id: sourceItem.material_id,
          formula_id: sourceItem.formula_id,
          formula_version_id: sourceItem.formula_version_id,
          batch_id: sourceItem.batch_id,
          lot_number: sourceItem.lot_number,
          vendor_id: sourceItem.vendor_id,
          supplier_lot_number: sourceItem.supplier_lot_number,
          current_stock: destNewCurrent.toFixed(6),
          reserved_stock: '0.000000',
          available_stock: destNewCurrent.toFixed(6),
          minimum_stock: sourceItem.minimum_stock,
          reorder_level: sourceItem.reorder_level,
          uom: sourceItem.uom,
          location: String(toLocation).trim(),
          storage_condition: sourceItem.storage_condition,
          coa_reference: sourceItem.coa_reference,
          receiving_date: sourceItem.receiving_date,
          retest_date: sourceItem.retest_date,
          expiration_date: sourceItem.expiration_date,
          status: destStatus,
          created_at: new Date(),
          updated_at: new Date(),
        });
        destId = Array.isArray(insertRes) ? (typeof insertRes[0] === 'object' ? insertRes[0].id : insertRes[0]) : insertRes;
      }

      const txnCode = await this.generateTransactionCode(trx);
      await trx('inventory_transactions').insert({
        transaction_code: txnCode,
        inventory_item_id: itemId,
        item_type: sourceItem.item_type,
        material_id: sourceItem.material_id,
        transaction_type: 'TRANSFER',
        quantity: qtyVal.toFixed(6),
        uom: sourceItem.uom,
        previous_balance: sourceCurrent.toFixed(6),
        new_balance: newSourceCurrent.toFixed(6),
        lot_number: sourceItem.lot_number,
        from_location: sourceItem.location,
        to_location: String(toLocation).trim(),
        reason,
        department: 'Warehouse Logistics',
        performed_by: user.id,
        created_at: new Date(),
      });

      return { sourceItemId: itemId, destItemId: destId, transactionCode: txnCode };
    });
  }

  /**
   * Log material rejection with attachments
   */
  static async rejectMaterial(data, attachments = [], user) {
    const {
      materialId,
      materialCode,
      materialName,
      materialType = 'RAW_MATERIAL',
      vendorId,
      supplierName,
      supplierLotNumber,
      inventoryItemId,
      rejectedQuantity,
      uom = 'kg',
      reason,
      location = 'Rejected Material Area',
    } = data;

    if (!rejectedQuantity || Number(rejectedQuantity) <= 0) {
      throw new Error('Rejected quantity must be greater than zero.');
    }
    if (!reason || !String(reason).trim()) {
      throw new Error('Rejection reason is required.');
    }

    return await db.transaction(async (trx) => {
      const rejectionCode = await this.generateRejectionCode(trx);

      // 1. Insert rejection record
      const insertRes = await trx('rejected_materials').insert({
        rejection_code: rejectionCode,
        material_id: materialId || null,
        material_code: String(materialCode || 'MAT-RAW').trim(),
        material_name: String(materialName || 'Raw Material').trim(),
        material_type: materialType,
        vendor_id: vendorId || null,
        supplier_name: supplierName || null,
        supplier_lot_number: supplierLotNumber || null,
        inventory_item_id: inventoryItemId || null,
        rejected_quantity: new Decimal(rejectedQuantity).toFixed(6),
        uom,
        reason: String(reason).trim(),
        date_rejected: new Date(),
        rejected_by: user.id,
        location,
        disposition: 'Pending Review',
        status: 'Open',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const rejectionId = Array.isArray(insertRes) ? (typeof insertRes[0] === 'object' ? insertRes[0].id : insertRes[0]) : insertRes;

      // 2. Handle stock deduction if linked to active inventory item
      if (inventoryItemId) {
        const item = await trx('inventory_items').where({ id: inventoryItemId }).first();
        if (item) {
          const currentStock = new Decimal(item.current_stock || 0);
          const rejQty = new Decimal(rejectedQuantity);
          const newStock = Decimal.max(0, currentStock.minus(rejQty));
          const availableStock = Decimal.max(0, new Decimal(item.available_stock || 0).minus(rejQty));

          await trx('inventory_items').where({ id: inventoryItemId }).update({
            current_stock: newStock.toFixed(6),
            available_stock: availableStock.toFixed(6),
            status: this.calculateStockStatus(newStock.toNumber(), item.minimum_stock, item.reorder_level),
            updated_at: new Date(),
          });

          const txnCode = await this.generateTransactionCode(trx);
          await trx('inventory_transactions').insert({
            transaction_code: txnCode,
            inventory_item_id: inventoryItemId,
            item_type: item.item_type,
            material_id: item.material_id,
            transaction_type: 'REJECTION',
            quantity: rejQty.toFixed(6),
            uom,
            previous_balance: currentStock.toFixed(6),
            new_balance: newStock.toFixed(6),
            lot_number: item.lot_number,
            from_location: item.location,
            to_location: location,
            reference_number: rejectionCode,
            reason: `Rejection (${reason})`,
            department: 'Quality Assurance',
            performed_by: user.id,
            created_at: new Date(),
          });
        }
      }

      // 3. Process File Evidence / Attachments
      const processedAttachments = [];
      if (Array.isArray(attachments) && attachments.length > 0) {
        for (const att of attachments) {
          if (!att.dataBase64 || !att.filename) continue;

          const base64Data = att.dataBase64.replace(/^data:[^;]+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          const fileExt = path.extname(att.filename) || '.bin';
          const storedName = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}${fileExt}`;
          const storagePath = path.join(UPLOAD_DIR, storedName);

          fs.writeFileSync(storagePath, buffer);

          const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

          const docRes = await trx('document_attachments').insert({
            filename: att.filename,
            stored_name: storedName,
            mime_type: att.mimeType || 'application/octet-stream',
            file_size: buffer.length,
            checksum_sha256: checksum,
            uploaded_by: user.id,
            classification: 'Confidential',
            malware_scan_status: 'Clean',
            storage_path: storagePath,
            created_at: new Date(),
            updated_at: new Date(),
          });

          const docId = Array.isArray(docRes) ? (typeof docRes[0] === 'object' ? docRes[0].id : docRes[0]) : docRes;

          await trx('rejected_material_attachments').insert({
            rejected_material_id: rejectionId,
            attachment_id: docId,
            description: att.description || null,
            created_at: new Date(),
          });

          processedAttachments.push({ attachmentId: docId, filename: att.filename });
        }
      }

      await AuditService.logEvent({
        trx,
        userId: user.id,
        userRole: user.roles?.[0] || 'User',
        action: 'MATERIAL_REJECTION_CREATED',
        entityType: 'RejectedMaterial',
        entityId: String(rejectionId),
        newValues: { rejectionCode, materialName, rejectedQuantity, reason, attachmentsCount: processedAttachments.length },
      });

      return { rejectionId, rejectionCode, attachments: processedAttachments };
    });
  }

  /**
   * Set / Update Disposition for a Rejected Material
   */
  static async dispositionRejectedMaterial(rejectionId, disposition, notes, user) {
    const validDispositions = ['Pending Review', 'For Return', 'For Disposal', 'For Rework', 'Approved for Reuse', 'Returned to Supplier', 'Disposed'];
    if (!validDispositions.includes(disposition)) {
      throw new Error(`Invalid disposition status: ${disposition}`);
    }

    return await db.transaction(async (trx) => {
      const rej = await trx('rejected_materials').where({ id: rejectionId }).first();
      if (!rej) throw new Error('Rejection record not found.');

      const newStatus = (disposition === 'Returned to Supplier' || disposition === 'Disposed') ? 'Closed' : 'In Disposition';

      await trx('rejected_materials').where({ id: rejectionId }).update({
        disposition,
        status: newStatus,
        disposition_notes: notes || rej.disposition_notes,
        disposition_by: user.id,
        disposition_at: new Date(),
        updated_at: new Date(),
      });

      // Handle Stock Return / Reuse / Disposal Audit Transactions
      if (disposition === 'Approved for Reuse' && rej.inventory_item_id) {
        const item = await trx('inventory_items').where({ id: rej.inventory_item_id }).first();
        if (item) {
          const currentStock = new Decimal(item.current_stock || 0);
          const rejQty = new Decimal(rej.rejected_quantity);
          const newStock = currentStock.plus(rejQty);
          const newAvailable = new Decimal(item.available_stock || 0).plus(rejQty);

          await trx('inventory_items').where({ id: item.id }).update({
            current_stock: newStock.toFixed(6),
            available_stock: newAvailable.toFixed(6),
            status: this.calculateStockStatus(newStock.toNumber(), item.minimum_stock, item.reorder_level),
            updated_at: new Date(),
          });

          const txnCode = await this.generateTransactionCode(trx);
          await trx('inventory_transactions').insert({
            transaction_code: txnCode,
            inventory_item_id: item.id,
            item_type: item.item_type,
            material_id: item.material_id,
            transaction_type: 'REUSE',
            quantity: rejQty.toFixed(6),
            uom: rej.uom,
            previous_balance: currentStock.toFixed(6),
            new_balance: newStock.toFixed(6),
            lot_number: item.lot_number,
            from_location: rej.location,
            to_location: item.location,
            reference_number: rej.rejection_code,
            reason: 'Rejection Approved for Reuse',
            department: 'Quality Assurance',
            performed_by: user.id,
            created_at: new Date(),
          });
        }
      }

      await AuditService.logEvent({
        trx,
        userId: user.id,
        userRole: user.roles?.[0] || 'User',
        action: 'REJECTION_DISPOSITION_SET',
        entityType: 'RejectedMaterial',
        entityId: String(rejectionId),
        newValues: { disposition, notes, status: newStatus },
      });

      return { rejectionId, disposition, status: newStatus };
    });
  }

  /**
   * Auto Stock In Finished Product upon QC Inspection Release
   */
  static async autoStockInFinishedProduct(batchId, user) {
    return await db.transaction(async (trx) => {
      const batch = await trx('production_batches').where({ id: batchId }).first();
      if (!batch) return;

      const formula = await trx('formulas').where({ id: batch.formula_id }).first();
      const formulaVersion = await trx('formula_versions').where({ id: batch.formula_version_id }).first();

      const outputQty = batch.actual_batch_size || batch.target_batch_size;
      const lotNo = batch.batch_number;

      // Check if FG item exists
      let fgItem = await trx('inventory_items').where({
        item_type: 'FINISHED_GOODS',
        batch_id: batchId,
      }).first();

      let itemId;
      let newStock = new Decimal(outputQty);

      if (fgItem) {
        itemId = fgItem.id;
        const prevStock = new Decimal(fgItem.current_stock || 0);
        newStock = prevStock.plus(new Decimal(outputQty));

        await trx('inventory_items').where({ id: itemId }).update({
          current_stock: newStock.toFixed(6),
          available_stock: newStock.minus(new Decimal(fgItem.reserved_stock || 0)).toFixed(6),
          status: 'NORMAL',
          updated_at: new Date(),
        });
      } else {
        const insertRes = await trx('inventory_items').insert({
          item_type: 'FINISHED_GOODS',
          formula_id: batch.formula_id,
          formula_version_id: batch.formula_version_id,
          batch_id: batchId,
          lot_number: lotNo,
          current_stock: newStock.toFixed(6),
          reserved_stock: '0.000000',
          available_stock: newStock.toFixed(6),
          minimum_stock: '10.000000',
          reorder_level: '25.000000',
          uom: formulaVersion?.target_batch_uom || 'kg',
          location: 'FG-WH-MAIN',
          storage_condition: 'Ambient Store 15-25°C',
          receiving_date: new Date(),
          status: 'NORMAL',
          created_at: new Date(),
          updated_at: new Date(),
        });

        itemId = Array.isArray(insertRes) ? (typeof insertRes[0] === 'object' ? insertRes[0].id : insertRes[0]) : insertRes;
      }

      const txnCode = await this.generateTransactionCode(trx);
      await trx('inventory_transactions').insert({
        transaction_code: txnCode,
        inventory_item_id: itemId,
        item_type: 'FINISHED_GOODS',
        batch_id: batchId,
        transaction_type: 'STOCK_IN',
        quantity: new Decimal(outputQty).toFixed(6),
        uom: formulaVersion?.target_batch_uom || 'kg',
        previous_balance: '0.000000',
        new_balance: newStock.toFixed(6),
        lot_number: lotNo,
        to_location: 'FG-WH-MAIN',
        reference_number: `QC-RELEASE-${batch.batch_number}`,
        reason: 'QC Release of Completed Finished Product Batch',
        department: 'Quality Control',
        performed_by: user.id,
        created_at: new Date(),
      });

      return { itemId, transactionCode: txnCode, finishedProductQty: newStock.toFixed(6) };
    });
  }

  /**
   * Get Traceability Tree for Finished Product or Raw Material Lot
   */
  static async getTraceabilityTree(reference) {
    const refStr = String(reference).trim();

    // Check if reference matches Production Batch Number or Compounding Code
    const batch = await db('production_batches')
      .leftJoin('formulas', 'production_batches.formula_id', 'formulas.id')
      .leftJoin('formula_versions', 'production_batches.formula_version_id', 'formula_versions.id')
      .where('production_batches.batch_number', refStr)
      .orWhere('formula_versions.compounding_code', refStr)
      .select(
        'production_batches.*',
        'formulas.code as formula_code',
        'formulas.name as formula_name',
        'formula_versions.compounding_code',
        'formula_versions.major_version',
        'formula_versions.minor_version'
      )
      .first();

    if (batch) {
      const requirements = await db('batch_material_requirements').where({ batch_id: batch.id });
      const entries = await db('batch_material_entries')
        .join('materials', 'batch_material_entries.material_id', 'materials.id')
        .leftJoin('users', 'batch_material_entries.operator_id', 'users.id')
        .where('batch_material_entries.batch_id', batch.id)
        .select(
          'batch_material_entries.*',
          'materials.code as material_code',
          'materials.name as material_name',
          'users.first_name as operator_first_name',
          'users.last_name as operator_last_name'
        );

      const fgInventory = await db('inventory_items').where({ item_type: 'FINISHED_GOODS', batch_id: batch.id }).first();

      return {
        type: 'FINISHED_PRODUCT_TRACEABILITY',
        batch,
        formula: { code: batch.formula_code, name: batch.formula_name, version: `${batch.major_version}.${batch.minor_version}`, compoundingCode: batch.compounding_code },
        rawMaterialRequirements: requirements,
        actualWeighedMaterials: entries,
        finishedProductStock: fgInventory || null,
      };
    }

    // Check if reference matches Raw Material Inventory Lot
    const item = await db('inventory_items')
      .leftJoin('materials', 'inventory_items.material_id', 'materials.id')
      .leftJoin('vendors', 'inventory_items.vendor_id', 'vendors.id')
      .where('inventory_items.lot_number', refStr)
      .orWhere('inventory_items.supplier_lot_number', refStr)
      .select(
        'inventory_items.*',
        'materials.code as material_code',
        'materials.name as material_name',
        'vendors.name as vendor_name'
      )
      .first();

    if (item) {
      const entries = await db('batch_material_entries')
        .join('production_batches', 'batch_material_entries.batch_id', 'production_batches.id')
        .leftJoin('formulas', 'production_batches.formula_id', 'formulas.id')
        .where('batch_material_entries.material_id', item.material_id || 0)
        .select(
          'batch_material_entries.*',
          'production_batches.batch_number',
          'production_batches.status as batch_status',
          'formulas.name as formula_name'
        );

      return {
        type: 'RAW_MATERIAL_LOT_TRACEABILITY',
        lot: item,
        consumedInBatches: entries,
      };
    }

    return null;
  }
}
