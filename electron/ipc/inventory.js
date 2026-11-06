const { getDb } = require('../services/database');
const { v4: uuidv4 } = require('uuid');

module.exports = function(ipcMain) {

  ipcMain.handle('inventory:getOverview', (_, filters = {}) => {
    const db = getDb();
    let sql = `
      SELECT m.id, m.name, m.generic_name, m.brand, m.category,
        m.dosage_form, m.strength, m.minimum_stock_level, m.reorder_level, m.rack_shelf, m.is_active,
        COALESCE(SUM(CASE WHEN date(b.expiry_date) > date('now') THEN b.available_quantity ELSE 0 END), 0) AS total_stock,
        COALESCE(SUM(b.available_quantity * b.purchase_cost), 0) AS stock_value,
        COUNT(CASE WHEN date(b.expiry_date) > date('now') AND b.available_quantity > 0 THEN 1 END) AS active_batches,
        COUNT(CASE WHEN date(b.expiry_date) <= date('now') AND b.available_quantity > 0 THEN 1 END) AS expired_batches,
        MIN(CASE WHEN date(b.expiry_date) > date('now') AND b.available_quantity > 0 THEN b.expiry_date END) AS next_expiry
      FROM medicines m
      LEFT JOIN batches b ON b.medicine_id = m.id
    `;
    const params = [];
    const where = [];
    const having = [];

    if (filters.search) {
      where.push(`(m.name LIKE ? OR m.generic_name LIKE ? OR m.brand LIKE ? OR m.rack_shelf LIKE ?)`);
      const s = `%${filters.search}%`;
      params.push(s, s, s, s);
    }
    if (filters.category) { where.push(`m.category = ?`); params.push(filters.category); }
    if (filters.isActive !== undefined) { where.push(`m.is_active = ?`); params.push(filters.isActive ? 1 : 0); }

    const isLowStock = filters.lowStock || filters.low_stock;
    if (isLowStock) {
      having.push(`total_stock <= m.minimum_stock_level`);
    }

    const isOutOfStock = filters.outOfStock || filters.out_of_stock;
    if (isOutOfStock) {
      having.push(`total_stock = 0`);
    }

    if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
    sql += ` GROUP BY m.id`;
    if (having.length) sql += ` HAVING ${having.join(' AND ')}`;
    sql += ` ORDER BY m.name`;

    return db.prepare(sql).all(...params);
  });

  ipcMain.handle('inventory:getBatches', (_, medicineId) => {
    const db = getDb();
    return db.prepare(`
      SELECT b.*, m.name AS medicine_name,
        CASE WHEN date(b.expiry_date) < date('now') THEN 1 ELSE 0 END AS is_expired,
        CAST(julianday(b.expiry_date) - julianday('now') AS INTEGER) AS days_until_expiry
      FROM batches b
      JOIN medicines m ON m.id = b.medicine_id
      WHERE b.medicine_id = ?
      ORDER BY b.expiry_date
    `).all(medicineId);
  });

  ipcMain.handle('inventory:getAllBatches', (_, filters = {}) => {
    const db = getDb();
    let sql = `
      SELECT b.*, m.name AS medicine_name, m.brand, m.category,
        CAST(julianday(b.expiry_date) - julianday('now') AS INTEGER) AS days_until_expiry,
        CASE WHEN date(b.expiry_date) < date('now') THEN 1 ELSE 0 END AS is_expired
      FROM batches b
      JOIN medicines m ON m.id = b.medicine_id
    `;
    const params = [];
    const where = [];
    if (filters.medicineId) { where.push(`b.medicine_id = ?`); params.push(filters.medicineId); }
    if (filters.hasStock) { where.push(`b.available_quantity > 0`); }
    if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
    sql += ` ORDER BY b.expiry_date`;
    return db.prepare(sql).all(...params);
  });

  ipcMain.handle('inventory:adjustStock', (_, data) => {
    const db = getDb();
    const adjustTx = db.transaction(() => {
      const batch = db.prepare('SELECT * FROM batches WHERE id=?').get(data.batch_id);
      if (!batch) throw new Error('Batch not found');

      const rawQty = Math.abs(parseInt(data.quantity, 10));
      if (!rawQty || isNaN(rawQty)) throw new Error('Valid quantity required');

      let newQty = batch.available_quantity;
      let movType = 'ADJUSTMENT_OUT';
      let delta = -rawQty;

      // Handle both UI action modes and standard modes
      const type = String(data.type || '').toUpperCase();
      const isIncrease = data.direction === 'increase' || type === 'ADD' || type === 'FOUND';

      if (isIncrease) {
        newQty = batch.available_quantity + rawQty;
        movType = 'ADJUSTMENT_IN';
        delta = rawQty;
      } else {
        if (batch.available_quantity < rawQty) {
          throw new Error(`Insufficient stock for adjustment. Available: ${batch.available_quantity}, Requested deduction: ${rawQty}`);
        }
        newQty = batch.available_quantity - rawQty;
        delta = -rawQty;

        if (type === 'DAMAGE' || type === 'DAMAGED') {
          movType = 'DAMAGE';
        } else if (type === 'EXPIRED_WRITE_OFF') {
          movType = 'EXPIRY_WRITEOFF';
        } else {
          movType = 'ADJUSTMENT_OUT';
        }
      }

      db.prepare(`UPDATE batches SET available_quantity=?, updated_at=datetime('now') WHERE id=?`).run(newQty, data.batch_id);
      db.prepare(`
        INSERT INTO stock_movements(id, medicine_id, batch_id, movement_type, quantity_change, unit_cost, reason)
        VALUES(?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), batch.medicine_id, data.batch_id, movType, delta, batch.purchase_cost, data.notes || data.reason || 'Inventory Adjustment');
    });
    adjustTx();
    return { success: true };
  });

  ipcMain.handle('inventory:writeOffExpired', (_, data) => {
    const db = getDb();
    const tx = db.transaction(() => {
      const batch = db.prepare('SELECT * FROM batches WHERE id=?').get(data.batch_id);
      if (!batch) throw new Error('Batch not found');
      const qty = data.quantity ? Math.abs(parseInt(data.quantity, 10)) : batch.available_quantity;
      if (batch.available_quantity < qty) throw new Error('Cannot write off more than available stock.');

      db.prepare(`UPDATE batches SET available_quantity = available_quantity - ?, updated_at=datetime('now') WHERE id=?`).run(qty, data.batch_id);
      db.prepare(`
        INSERT INTO stock_movements(id, medicine_id, batch_id, movement_type, quantity_change, unit_cost, reason)
        VALUES(?, ?, ?, 'EXPIRY_WRITEOFF', ?, ?, ?)
      `).run(uuidv4(), batch.medicine_id, data.batch_id, -qty, batch.purchase_cost, data.notes ? `${data.reason || 'Expired'}: ${data.notes}` : (data.reason || 'Expired stock write-off'));
    });
    tx();
    return { success: true };
  });

  ipcMain.handle('inventory:returnToSupplier', (_, data) => {
    const db = getDb();
    const returnTx = db.transaction(() => {
      const batch = db.prepare(`
        SELECT b.*, m.name AS medicine_name
        FROM batches b
        JOIN medicines m ON m.id = b.medicine_id
        WHERE b.id=?
      `).get(data.batch_id);

      if (!batch) throw new Error('Batch not found');
      const qty = data.quantity ? Math.abs(parseInt(data.quantity, 10)) : batch.available_quantity;
      if (batch.available_quantity < qty) throw new Error('Insufficient batch stock for supplier return.');

      const supplierId = data.supplier_id || batch.supplier_id;
      if (!supplierId) throw new Error('Supplier information is required to claim return.');

      const totalCredit = qty * (batch.purchase_cost || 0);
      const returnId = uuidv4();

      // Deduct stock
      db.prepare(`UPDATE batches SET available_quantity = available_quantity - ?, updated_at=datetime('now') WHERE id=?`).run(qty, data.batch_id);

      // Record movement
      db.prepare(`
        INSERT INTO stock_movements (id, medicine_id, batch_id, movement_type, quantity_change, unit_cost, reference_type, reference_id, reason)
        VALUES (?, ?, ?, 'ADJUSTMENT_OUT', ?, ?, 'SUPPLIER_RETURN', ?, ?)
      `).run(uuidv4(), batch.medicine_id, data.batch_id, -qty, batch.purchase_cost, returnId, `Returned to supplier: ${data.notes || data.reason || 'Near expiry'}`);

      // Record supplier return claim
      db.prepare(`
        INSERT INTO supplier_returns (id, supplier_id, batch_id, medicine_id, quantity, unit_cost, total_credit, claim_reason, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(returnId, supplierId, data.batch_id, batch.medicine_id, qty, batch.purchase_cost, totalCredit, data.reason || 'EXPIRED', data.notes || null);

      return { returnId, totalCredit };
    });

    return returnTx();
  });

  ipcMain.handle('inventory:getMovements', (_, filters = {}) => {
    const db = getDb();
    let sql = `
      SELECT sm.*, m.name AS medicine_name, b.batch_number
      FROM stock_movements sm
      JOIN medicines m ON m.id = sm.medicine_id
      JOIN batches b ON b.id = sm.batch_id
    `;
    const params = [];
    const where = [];
    if (filters.medicineId) { where.push(`sm.medicine_id = ?`); params.push(filters.medicineId); }
    if (filters.batchId) { where.push(`sm.batch_id = ?`); params.push(filters.batchId); }
    if (filters.type) { where.push(`sm.movement_type = ?`); params.push(filters.type); }
    if (filters.from) { where.push(`date(sm.created_at) >= ?`); params.push(filters.from); }
    if (filters.to) { where.push(`date(sm.created_at) <= ?`); params.push(filters.to); }
    if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
    sql += ` ORDER BY sm.created_at DESC LIMIT 500`;
    return db.prepare(sql).all(...params);
  });

  ipcMain.handle('inventory:getLowStock', () => {
    const db = getDb();
    return db.prepare(`
      SELECT m.*, COALESCE(SUM(CASE WHEN date(b.expiry_date)>date('now') THEN b.available_quantity ELSE 0 END),0) AS total_stock
      FROM medicines m
      LEFT JOIN batches b ON b.medicine_id = m.id
      WHERE m.is_active = 1
      GROUP BY m.id
      HAVING total_stock <= m.minimum_stock_level
      ORDER BY total_stock
    `).all();
  });

  ipcMain.handle('inventory:getExpiryAlerts', (_, days = 30) => {
    const db = getDb();
    const rows = db.prepare(`
      SELECT b.*,
        m.name AS medicine_name,
        m.name AS name,
        m.brand,
        m.category,
        s.name AS supplier_name,
        b.available_quantity AS current_stock,
        b.purchase_cost AS purchase_price,
        (b.available_quantity * b.purchase_cost) AS potential_loss,
        CAST(julianday(b.expiry_date) - julianday('now') AS INTEGER) AS days_until_expiry,
        CAST(julianday(b.expiry_date) - julianday('now') AS INTEGER) AS days_to_expiry,
        CASE WHEN date(b.expiry_date) < date('now') THEN 1 ELSE 0 END AS is_expired
      FROM batches b
      JOIN medicines m ON m.id = b.medicine_id
      LEFT JOIN suppliers s ON s.id = b.supplier_id
      WHERE b.available_quantity > 0
        AND date(b.expiry_date) <= date('now', '+' || ? || ' days')
      ORDER BY b.expiry_date, days_until_expiry
    `).all(days);

    return rows;
  });
};
