const { getDb } = require('../services/database');
const { v4: uuidv4 } = require('uuid');

module.exports = function(ipcMain) {

  ipcMain.handle('sales:getAll', (_, filters = {}) => {
    const db = getDb();
    let sql = `
      SELECT s.*,
        COUNT(si.id) AS item_count,
        COALESCE(r.total_returned, 0) AS returned_amount
      FROM sales s
      LEFT JOIN sale_items si ON si.sale_id = s.id
      LEFT JOIN (
        SELECT sale_id, SUM(total_refund_amount) AS total_returned
        FROM sale_returns
        GROUP BY sale_id
      ) r ON r.sale_id = s.id
    `;
    const params = [];
    const where = [];

    if (filters.search) {
      where.push(`(s.invoice_number LIKE ? OR s.customer_name LIKE ? OR s.customer_phone LIKE ?)`);
      const q = `%${filters.search}%`;
      params.push(q, q, q);
    }

    const fromDate = filters.from || filters.from_date;
    const toDate = filters.to || filters.to_date;

    if (fromDate) { where.push(`date(s.sold_at) >= ?`); params.push(fromDate); }
    if (toDate) { where.push(`date(s.sold_at) <= ?`); params.push(toDate); }
    if (filters.payment_method) { where.push(`s.payment_method = ?`); params.push(filters.payment_method); }

    if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
    sql += ` GROUP BY s.id ORDER BY s.sold_at DESC`;
    if (filters.limit) { sql += ` LIMIT ?`; params.push(filters.limit); }
    return db.prepare(sql).all(...params);
  });

  ipcMain.handle('sales:getById', (_, id) => {
    const db = getDb();
    const sale = db.prepare('SELECT * FROM sales WHERE id=?').get(id);
    if (!sale) return null;
    const items = db.prepare(`
      SELECT si.*, m.name AS medicine_name, m.brand, m.rack_shelf, b.batch_number, b.expiry_date
      FROM sale_items si
      JOIN medicines m ON m.id=si.medicine_id
      JOIN batches b ON b.id=si.batch_id
      WHERE si.sale_id=?
    `).all(id);

    const returns = db.prepare(`
      SELECT sr.*, sri.quantity AS returned_quantity, sri.medicine_id, sri.batch_id
      FROM sale_returns sr
      JOIN sale_return_items sri ON sri.return_id = sr.id
      WHERE sr.sale_id=?
    `).all(id);

    return { ...sale, items, returns };
  });

  ipcMain.handle('sales:getItems', (_, saleId) => {
    const db = getDb();
    return db.prepare(`
      SELECT si.*, m.name AS medicine_name, m.brand, m.rack_shelf, b.batch_number, b.expiry_date
      FROM sale_items si
      JOIN medicines m ON m.id=si.medicine_id
      JOIN batches b ON b.id=si.batch_id
      WHERE si.sale_id=?
    `).all(saleId);
  });

  ipcMain.handle('sales:processReturn', (_, data) => {
    const db = getDb();
    const returnTx = db.transaction(() => {
      const sale = db.prepare('SELECT * FROM sales WHERE id=?').get(data.sale_id);
      if (!sale) throw new Error('Original sale invoice not found.');

      if (!data.items || data.items.length === 0) {
        throw new Error('At least one item must be selected for return.');
      }

      // Check current open cash session
      const openSession = db.prepare(`SELECT id FROM cash_sessions WHERE status='OPEN' ORDER BY opened_at DESC LIMIT 1`).get();
      const returnId = uuidv4();
      let totalRefund = 0;

      for (const item of data.items) {
        const qty = parseInt(item.quantity, 10);
        if (isNaN(qty) || qty <= 0) continue;

        const saleItem = db.prepare('SELECT * FROM sale_items WHERE id=?').get(item.sale_item_id);
        if (!saleItem) throw new Error('Sale line item not found.');

        // Check already returned quantity
        const alreadyReturned = db.prepare(`
          SELECT COALESCE(SUM(quantity), 0) AS total_returned
          FROM sale_return_items
          WHERE sale_item_id=?
        `).get(saleItem.id);

        const maxReturnable = saleItem.quantity - (alreadyReturned.total_returned || 0);
        if (qty > maxReturnable) {
          throw new Error(`Cannot return ${qty} units. Maximum returnable: ${maxReturnable}`);
        }

        const refundPrice = parseFloat(item.refund_unit_price !== undefined ? item.refund_unit_price : saleItem.unit_selling_price);
        const lineRefund = qty * refundPrice;
        totalRefund += lineRefund;

        // Record return line item
        db.prepare(`
          INSERT INTO sale_return_items (id, return_id, sale_item_id, medicine_id, batch_id, quantity, refund_unit_price, line_total)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), returnId, saleItem.id, saleItem.medicine_id, saleItem.batch_id, qty, refundPrice, lineRefund);

        // Restore stock in batch
        db.prepare(`
          UPDATE batches SET available_quantity = available_quantity + ?, updated_at=datetime('now')
          WHERE id=?
        `).run(qty, saleItem.batch_id);

        // Record stock movement
        db.prepare(`
          INSERT INTO stock_movements (id, medicine_id, batch_id, movement_type, quantity_change, unit_cost, reference_type, reference_id, reason)
          VALUES (?, ?, ?, 'ADJUSTMENT_IN', ?, ?, 'SALE_RETURN', ?, ?)
        `).run(uuidv4(), saleItem.medicine_id, saleItem.batch_id, qty, saleItem.recorded_unit_cost, returnId, `Customer Sale Return (Inv: ${sale.invoice_number}): ${data.reason || 'Unused/Exchange'}`);
      }

      if (totalRefund <= 0) throw new Error('Total refund amount must be greater than 0.');

      // Record return master
      db.prepare(`
        INSERT INTO sale_returns (id, sale_id, invoice_number, returned_at, total_refund_amount, payment_method, reason, cash_session_id)
        VALUES (?, ?, ?, datetime('now'), ?, ?, ?, ?)
      `).run(
        returnId,
        sale.id,
        sale.invoice_number,
        totalRefund,
        data.payment_method || 'CASH',
        data.reason || 'Customer Return',
        openSession ? openSession.id : null
      );

      // Record sync outbox
      db.prepare(`
        INSERT INTO sync_outbox (id, event_id, entity_type, entity_id, operation_type, payload)
        VALUES (?, ?, 'SALE_RETURN', ?, 'CREATE', ?)
      `).run(uuidv4(), uuidv4(), returnId, JSON.stringify({ returnId, saleId: sale.id, invoiceNumber: sale.invoice_number, totalRefund }));

      return { success: true, returnId, totalRefund };
    });

    return returnTx();
  });

  ipcMain.handle('sales:getReturns', (_, filters = {}) => {
    const db = getDb();
    let sql = `
      SELECT sr.*, s.customer_name, s.sold_at, COUNT(sri.id) AS item_count
      FROM sale_returns sr
      JOIN sales s ON s.id = sr.sale_id
      LEFT JOIN sale_return_items sri ON sri.return_id = sr.id
    `;
    const params = [];
    const where = [];
    if (filters.search) {
      where.push(`(sr.invoice_number LIKE ? OR s.customer_name LIKE ?)`);
      const q = `%${filters.search}%`;
      params.push(q, q);
    }
    if (filters.from) { where.push(`date(sr.returned_at) >= ?`); params.push(filters.from); }
    if (filters.to) { where.push(`date(sr.returned_at) <= ?`); params.push(filters.to); }
    if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
    sql += ` GROUP BY sr.id ORDER BY sr.returned_at DESC`;
    if (filters.limit) { sql += ` LIMIT ?`; params.push(filters.limit); }
    return db.prepare(sql).all(...params);
  });
};
