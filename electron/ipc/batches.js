const { getDb } = require('../services/database');
const { v4: uuidv4 } = require('uuid');

module.exports = function(ipcMain) {

  /**
   * Get all batches for a specific medicine
   */
  ipcMain.handle('batches:getByMedicine', (_, medicineId) => {
    if (!medicineId) return [];
    const db = getDb();
    return db.prepare(`
      SELECT b.*,
        b.purchase_cost AS purchase_price,
        b.selling_price AS sale_price,
        b.received_quantity AS initial_quantity,
        b.available_quantity AS current_stock,
        m.name AS medicine_name,
        m.generic_name,
        m.brand,
        s.name AS supplier_name,
        CASE WHEN date(b.expiry_date) <= date('now') THEN 1 ELSE 0 END AS is_expired,
        CASE WHEN date(b.expiry_date) > date('now') AND date(b.expiry_date) <= date('now', '+30 days') THEN 1 ELSE 0 END AS is_near_expiry,
        CAST(julianday(b.expiry_date) - julianday('now') AS INTEGER) AS days_until_expiry
      FROM batches b
      JOIN medicines m ON m.id = b.medicine_id
      LEFT JOIN suppliers s ON s.id = b.supplier_id
      WHERE b.medicine_id = ?
      ORDER BY b.expiry_date ASC, b.created_at ASC
    `).all(medicineId);
  });

  /**
   * Get single batch by ID
   */
  ipcMain.handle('batches:getById', (_, batchId) => {
    if (!batchId) return null;
    const db = getDb();
    return db.prepare(`
      SELECT b.*,
        b.purchase_cost AS purchase_price,
        b.selling_price AS sale_price,
        b.received_quantity AS initial_quantity,
        b.available_quantity AS current_stock,
        m.name AS medicine_name,
        s.name AS supplier_name,
        CASE WHEN date(b.expiry_date) <= date('now') THEN 1 ELSE 0 END AS is_expired,
        CAST(julianday(b.expiry_date) - julianday('now') AS INTEGER) AS days_until_expiry
      FROM batches b
      JOIN medicines m ON m.id = b.medicine_id
      LEFT JOIN suppliers s ON s.id = b.supplier_id
      WHERE b.id = ?
    `).get(batchId);
  });

  /**
   * Create a new batch for a medicine
   */
  ipcMain.handle('batches:create', (_, data) => {
    const db = getDb();

    if (!data.medicine_id) throw new Error('Medicine ID is required to create a batch.');
    if (!data.expiry_date) throw new Error('Expiry date is required.');

    let batchNumber = String(data.batch_number || '').trim();
    if (!batchNumber) {
      const expTag = String(data.expiry_date).replace(/-/g, '').slice(0, 8) || 'STK';
      batchNumber = `EXP-${expTag}-${Math.floor(100 + Math.random() * 900)}`;
    }

    // Check duplicate batch number for this medicine (case-insensitive)
    const existing = db.prepare(`
      SELECT id FROM batches
      WHERE medicine_id = ? AND LOWER(TRIM(batch_number)) = LOWER(TRIM(?))
    `).get(data.medicine_id, batchNumber);

    if (existing) {
      if (!data.batch_number || !String(data.batch_number).trim()) {
        // Auto-generated collision: append unique suffix
        batchNumber = `${batchNumber}-${Date.now().toString().slice(-3)}`;
      } else {
        throw new Error(`Batch "${batchNumber}" already exists for this medicine. Please use a unique batch number or adjust existing batch stock.`);
      }
    }

    const initialQty = Math.max(0, parseInt(data.initial_quantity || data.received_quantity || data.quantity || data.available_quantity || 0, 10));
    const availableQty = data.available_quantity !== undefined ? Math.max(0, parseInt(data.available_quantity, 10)) : initialQty;
    const purchaseCost = Math.max(0, parseFloat(data.purchase_cost || data.purchase_price || 0));
    const sellingPrice = Math.max(0, parseFloat(data.selling_price || data.sale_price || 0));
    const status = ['ACTIVE', 'BLOCKED', 'EXPIRED', 'QUARANTINED'].includes(data.status) ? data.status : 'ACTIVE';
    const batchId = uuidv4();
    const mfgDate = data.mfg_date ? String(data.mfg_date).trim() : null;

    const createBatchTx = db.transaction(() => {
      db.prepare(`
        INSERT INTO batches (
          id, medicine_id, batch_number, mfg_date, expiry_date,
          purchase_cost, selling_price, received_quantity, available_quantity,
          supplier_id, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        batchId,
        data.medicine_id,
        batchNumber,
        mfgDate,
        data.expiry_date,
        purchaseCost,
        sellingPrice,
        initialQty,
        availableQty,
        data.supplier_id || null,
        status
      );

      // If initial stock was given, record movement and adjustment audit log
      if (availableQty > 0) {
        db.prepare(`
          INSERT INTO stock_movements (
            id, medicine_id, batch_id, movement_type, quantity_change,
            old_quantity, new_quantity, unit_cost, reference_type, reference_id,
            reason, user_name, created_at
          ) VALUES (?, ?, ?, 'OPENING', ?, 0, ?, ?, 'BATCH_CREATE', ?, ?, ?, datetime('now'))
        `).run(
          uuidv4(),
          data.medicine_id,
          batchId,
          availableQty,
          availableQty,
          purchaseCost,
          batchId,
          data.reason || 'New Batch Stock Entry',
          data.user_name || 'Administrator'
        );

        db.prepare(`
          INSERT INTO stock_adjustments (
            id, medicine_id, batch_id, old_quantity, new_quantity,
            quantity_change, reason, notes, adjusted_by, created_at
          ) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, datetime('now'))
        `).run(
          uuidv4(),
          data.medicine_id,
          batchId,
          availableQty,
          availableQty,
          data.reason || 'New Batch Created',
          data.notes || null,
          data.user_name || 'Administrator'
        );
      }
    });

    createBatchTx();
    return { id: batchId, success: true };
  });

  /**
   * Update an existing batch (dates, prices, status, supplier, batch number)
   */
  ipcMain.handle('batches:update', (_, id, data) => {
    const db = getDb();
    if (!id) throw new Error('Batch ID is required.');

    const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(id);
    if (!batch) throw new Error('Batch not found.');

    const batchNumber = data.batch_number ? String(data.batch_number).trim() : batch.batch_number;
    if (!batchNumber) throw new Error('Batch number cannot be empty.');

    // If batch number is changed, ensure no other batch of this medicine has this number
    if (batchNumber.toLowerCase() !== batch.batch_number.toLowerCase()) {
      const duplicate = db.prepare(`
        SELECT id FROM batches
        WHERE medicine_id = ? AND LOWER(TRIM(batch_number)) = LOWER(TRIM(?)) AND id != ?
      `).get(batch.medicine_id, batchNumber, id);
      if (duplicate) {
        throw new Error(`Another batch with number "${batchNumber}" already exists for this medicine.`);
      }
    }

    const expiryDate = data.expiry_date || batch.expiry_date;
    const mfgDate = data.mfg_date !== undefined ? (data.mfg_date ? String(data.mfg_date).trim() : null) : batch.mfg_date;
    const purchaseCost = data.purchase_cost !== undefined ? parseFloat(data.purchase_cost) : (data.purchase_price !== undefined ? parseFloat(data.purchase_price) : batch.purchase_cost);
    const sellingPrice = data.selling_price !== undefined ? parseFloat(data.selling_price) : (data.sale_price !== undefined ? parseFloat(data.sale_price) : batch.selling_price);
    const status = data.status || batch.status || 'ACTIVE';
    const supplierId = data.supplier_id !== undefined ? (data.supplier_id || null) : batch.supplier_id;

    db.prepare(`
      UPDATE batches SET
        batch_number = ?,
        mfg_date = ?,
        expiry_date = ?,
        purchase_cost = ?,
        selling_price = ?,
        status = ?,
        supplier_id = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      batchNumber,
      mfgDate,
      expiryDate,
      isNaN(purchaseCost) ? 0 : purchaseCost,
      isNaN(sellingPrice) ? 0 : sellingPrice,
      status,
      supplierId,
      id
    );

    return { success: true };
  });

  /**
   * Adjust batch stock with mandatory reason and complete audit trail
   */
  ipcMain.handle('batches:adjustStock', (_, data) => {
    const db = getDb();
    if (!data.batch_id) throw new Error('Batch ID is required for stock adjustment.');
    if (!data.reason || !String(data.reason).trim()) {
      throw new Error('Adjustment reason is required (e.g. Physical Count, Damaged Stock, Expired Write-off, Stock Received).');
    }

    const adjustTx = db.transaction(() => {
      const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(data.batch_id);
      if (!batch) throw new Error('Batch not found.');

      const oldQuantity = parseInt(batch.available_quantity, 10) || 0;
      let newQuantity = oldQuantity;
      let delta = 0;

      if (data.new_quantity !== undefined && data.new_quantity !== null && data.new_quantity !== '') {
        newQuantity = parseInt(data.new_quantity, 10);
        if (isNaN(newQuantity) || newQuantity < 0) {
          throw new Error('New stock quantity must be a non-negative number.');
        }
        delta = newQuantity - oldQuantity;
      } else if (data.quantity !== undefined && data.quantity !== null) {
        const change = parseInt(data.quantity, 10);
        if (isNaN(change)) throw new Error('Invalid adjustment quantity.');
        newQuantity = oldQuantity + change;
        if (newQuantity < 0) {
          throw new Error(`Deduction would result in negative stock. Current: ${oldQuantity}, requested change: ${change}`);
        }
        delta = change;
      } else {
        throw new Error('Either new_quantity or adjustment quantity must be provided.');
      }

      if (delta === 0) {
        return { success: true, message: 'Stock quantity unchanged', old_quantity: oldQuantity, new_quantity: newQuantity, delta: 0 };
      }

      // Determine movement type based on delta and reason
      const reasonUpper = String(data.reason).toUpperCase();
      let movementType = delta > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';
      if (reasonUpper.includes('DAMAGE')) {
        movementType = 'DAMAGE';
      } else if (reasonUpper.includes('EXPIR')) {
        movementType = 'EXPIRY_WRITEOFF';
      } else if (reasonUpper.includes('OPENING') || reasonUpper.includes('INITIAL')) {
        movementType = 'OPENING';
      }

      // Update batches table
      db.prepare(`
        UPDATE batches
        SET available_quantity = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(newQuantity, data.batch_id);

      // Record in dedicated stock_adjustments table
      const adjId = uuidv4();
      db.prepare(`
        INSERT INTO stock_adjustments (
          id, medicine_id, batch_id, old_quantity, new_quantity,
          quantity_change, reason, notes, adjusted_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        adjId,
        batch.medicine_id,
        data.batch_id,
        oldQuantity,
        newQuantity,
        delta,
        data.reason.trim(),
        data.notes ? data.notes.trim() : null,
        data.user_name || 'Administrator'
      );

      // Record in stock_movements
      db.prepare(`
        INSERT INTO stock_movements (
          id, medicine_id, batch_id, movement_type, quantity_change,
          old_quantity, new_quantity, unit_cost, reference_type, reference_id,
          reason, user_name, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'STOCK_ADJUSTMENT', ?, ?, ?, datetime('now'))
      `).run(
        uuidv4(),
        batch.medicine_id,
        data.batch_id,
        movementType,
        delta,
        oldQuantity,
        newQuantity,
        batch.purchase_cost,
        adjId,
        `${data.reason}${data.notes ? ': ' + data.notes : ''}`,
        data.user_name || 'Administrator'
      );

      return {
        success: true,
        old_quantity: oldQuantity,
        new_quantity: newQuantity,
        delta
      };
    });

    return adjustTx();
  });

  /**
   * Get complete stock adjustment & movement audit history for a batch
   */
  ipcMain.handle('batches:getHistory', (_, batchId) => {
    if (!batchId) return [];
    const db = getDb();
    return db.prepare(`
      SELECT
        sm.id,
        sm.batch_id,
        sm.movement_type,
        sm.quantity_change,
        sm.old_quantity,
        sm.new_quantity,
        sm.unit_cost,
        sm.reason,
        sm.user_name,
        sm.created_at,
        b.batch_number,
        m.name AS medicine_name
      FROM stock_movements sm
      JOIN batches b ON b.id = sm.batch_id
      JOIN medicines m ON m.id = sm.medicine_id
      WHERE sm.batch_id = ?
      ORDER BY sm.created_at DESC
      LIMIT 100
    `).all(batchId);
  });

  /**
   * Delete batch (only if no sales or purchases reference it, otherwise mark BLOCKED)
   */
  ipcMain.handle('batches:delete', (_, batchId) => {
    const db = getDb();
    if (!batchId) throw new Error('Batch ID required.');

    // Check references in sale_items or purchase_items
    const hasSales = db.prepare('SELECT 1 FROM sale_items WHERE batch_id = ? LIMIT 1').get(batchId);
    const hasPurchases = db.prepare('SELECT 1 FROM purchase_items WHERE batch_id = ? LIMIT 1').get(batchId);

    if (hasSales || hasPurchases) {
      // Cannot hard delete to preserve historical invoices; set to BLOCKED with 0 stock
      db.prepare(`
        UPDATE batches
        SET status = 'BLOCKED', available_quantity = 0, updated_at = datetime('now')
        WHERE id = ?
      `).run(batchId);
      return { success: true, archived: true, message: 'Batch has historical transaction records. Status set to BLOCKED and available stock set to 0 to preserve invoice history.' };
    }

    // Clean delete
    db.prepare('DELETE FROM stock_adjustments WHERE batch_id = ?').run(batchId);
    db.prepare('DELETE FROM stock_movements WHERE batch_id = ?').run(batchId);
    db.prepare('DELETE FROM batches WHERE id = ?').run(batchId);
    return { success: true, message: 'Batch removed successfully.' };
  });

};

