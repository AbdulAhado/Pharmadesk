const { getDb, generatePurchaseNumber } = require('../services/database');
const { v4: uuidv4 } = require('uuid');

module.exports = function(ipcMain) {

  // ── Suppliers ──────────────────────────────────────────────────────────────

  ipcMain.handle('purchases:getSuppliers', (_, filters = {}) => {
    const db = getDb();
    let sql = `
      SELECT s.*,
        COALESCE(SUM(p.outstanding_amount), 0) AS total_outstanding
      FROM suppliers s
      LEFT JOIN purchases p ON p.supplier_id = s.id AND p.payment_status != 'PAID'
    `;
    const params = [];
    const where = [];
    if (filters.search) {
      where.push(`(s.name LIKE ? OR s.phone LIKE ?)`);
      const q = `%${filters.search}%`;
      params.push(q, q);
    }
    if (filters.isActive !== undefined) { where.push(`s.is_active=?`); params.push(filters.isActive ? 1 : 0); }
    if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
    sql += ` GROUP BY s.id ORDER BY s.name`;
    return db.prepare(sql).all(...params);
  });

  ipcMain.handle('purchases:getSupplierById', (_, id) => {
    const db = getDb();
    return db.prepare('SELECT * FROM suppliers WHERE id=?').get(id);
  });

  ipcMain.handle('purchases:createSupplier', (_, data) => {
    const db = getDb();
    const id = uuidv4();
    db.prepare(`
      INSERT INTO suppliers (id, name, phone, address, opening_balance, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(id, data.name, data.phone || null, data.address || null, data.opening_balance || 0);
    return { id };
  });

  ipcMain.handle('purchases:updateSupplier', (_, id, data) => {
    const db = getDb();
    db.prepare(`
      UPDATE suppliers SET name=?, phone=?, address=?, updated_at=datetime('now') WHERE id=?
    `).run(data.name, data.phone || null, data.address || null, id);
    return { success: true };
  });

  // ── Purchases ─────────────────────────────────────────────────────────────

  ipcMain.handle('purchases:getAll', (_, filters = {}) => {
    const db = getDb();
    let sql = `
      SELECT p.*, s.name AS supplier_name,
        COUNT(pi.id) AS item_count
      FROM purchases p
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      LEFT JOIN purchase_items pi ON pi.purchase_id = p.id
    `;
    const params = [];
    const where = [];
    if (filters.search) {
      where.push(`(p.invoice_number LIKE ? OR p.supplier_invoice_no LIKE ? OR s.name LIKE ?)`);
      const q = `%${filters.search}%`;
      params.push(q, q, q);
    }
    if (filters.supplierId) { where.push(`p.supplier_id=?`); params.push(filters.supplierId); }
    if (filters.status) { where.push(`p.payment_status=?`); params.push(filters.status); }
    if (filters.from) { where.push(`date(p.purchase_date)>=?`); params.push(filters.from); }
    if (filters.to) { where.push(`date(p.purchase_date)<=?`); params.push(filters.to); }
    if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
    sql += ` GROUP BY p.id ORDER BY p.created_at DESC`;
    if (filters.limit) { sql += ` LIMIT ?`; params.push(filters.limit); }
    return db.prepare(sql).all(...params);
  });

  ipcMain.handle('purchases:getById', (_, id) => {
    const db = getDb();
    const purchase = db.prepare(`
      SELECT p.*, s.name AS supplier_name FROM purchases p
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.id=?
    `).get(id);
    if (!purchase) return null;
    const items = db.prepare(`
      SELECT pi.*, m.name AS medicine_name, m.brand, b.batch_number, b.expiry_date
      FROM purchase_items pi
      JOIN medicines m ON m.id=pi.medicine_id
      JOIN batches b ON b.id=pi.batch_id
      WHERE pi.purchase_id=?
    `).all(id);
    return { ...purchase, items };
  });

  ipcMain.handle('purchases:create', (_, data) => {
    const db = getDb();

    const createTx = db.transaction(() => {
      const purchaseId = uuidv4();
      const invoiceNumber = generatePurchaseNumber();
      const supplierInvoiceNo = data.invoice_number ? data.invoice_number.trim() : null;

      let subtotal = 0;
      const processedItems = [];

      // Validate and prepare items
      for (const item of data.items) {
        const medicine = db.prepare('SELECT * FROM medicines WHERE id=?').get(item.medicine_id);
        if (!medicine) throw new Error(`Medicine not found: ${item.medicine_id}`);

        const qty = parseInt(item.quantity, 10);
        if (isNaN(qty) || qty <= 0) throw new Error('Valid quantity required for all items');

        // Accept unit_purchase_cost OR purchase_price (fallback gracefully)
        const cost = parseFloat(item.unit_purchase_cost !== undefined ? item.unit_purchase_cost : (item.purchase_price !== undefined ? item.purchase_price : medicine.default_purchase_price));
        const sellPrice = parseFloat(item.unit_selling_price !== undefined ? item.unit_selling_price : (item.sale_price !== undefined ? item.sale_price : medicine.default_selling_price));

        const lineTotal = qty * (isNaN(cost) ? 0 : cost);
        subtotal += lineTotal;

        processedItems.push({
          ...item,
          medicine,
          qty,
          cost: isNaN(cost) ? 0 : cost,
          sellPrice: isNaN(sellPrice) ? 0 : sellPrice,
          lineTotal
        });
      }

      const discount = parseFloat(data.discount) || 0;
      const additionalCosts = parseFloat(data.additional_costs) || 0;
      const totalAmount = data.total_amount ? parseFloat(data.total_amount) : (subtotal - discount + additionalCosts);
      const paidAmount = parseFloat(data.paid_amount) || 0;
      const outstanding = Math.max(0, totalAmount - paidAmount);
      const paymentStatus = paidAmount >= totalAmount ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID';

      db.prepare(`
        INSERT INTO purchases (id, invoice_number, supplier_invoice_no, supplier_id, purchase_date,
          subtotal, discount, additional_costs, total_amount, paid_amount,
          outstanding_amount, payment_status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(purchaseId, invoiceNumber, supplierInvoiceNo, data.supplier_id || null,
        data.purchase_date || data.invoice_date || new Date().toISOString().slice(0, 10),
        subtotal, discount, additionalCosts,
        totalAmount, paidAmount, outstanding, paymentStatus, data.notes || null);

      for (const item of processedItems) {
        // Find or create batch
        let batch = db.prepare(`
          SELECT * FROM batches WHERE medicine_id=? AND batch_number=?
        `).get(item.medicine_id, item.batch_number);

        if (!batch) {
          const batchId = uuidv4();
          db.prepare(`
            INSERT INTO batches (id, medicine_id, batch_number, expiry_date, purchase_cost,
              selling_price, received_quantity, available_quantity, supplier_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(batchId, item.medicine_id, item.batch_number, item.expiry_date,
            item.cost, item.sellPrice, item.qty, item.qty, data.supplier_id || null);
          batch = db.prepare('SELECT * FROM batches WHERE id=?').get(batchId);
        } else {
          // Update existing batch
          db.prepare(`
            UPDATE batches
            SET available_quantity = available_quantity + ?,
                received_quantity = received_quantity + ?,
                purchase_cost = ?,
                selling_price = ?,
                expiry_date = ?,
                updated_at = datetime('now')
            WHERE id = ?
          `).run(item.qty, item.qty, item.cost, item.sellPrice, item.expiry_date, batch.id);
        }

        db.prepare(`
          INSERT INTO purchase_items (id, purchase_id, medicine_id, batch_id,
            quantity, unit_purchase_cost, unit_selling_price, line_total)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), purchaseId, item.medicine_id, batch.id,
          item.qty, item.cost, item.sellPrice, item.lineTotal);

        db.prepare(`
          INSERT INTO stock_movements (id, medicine_id, batch_id, movement_type,
            quantity_change, unit_cost, reference_type, reference_id)
          VALUES (?, ?, ?, 'PURCHASE', ?, ?, 'PURCHASE', ?)
        `).run(uuidv4(), item.medicine_id, batch.id, item.qty, item.cost, purchaseId);

        // Update medicine default prices
        db.prepare(`
          UPDATE medicines SET default_purchase_price=?, default_selling_price=?,
            updated_at=datetime('now') WHERE id=?
        `).run(item.cost, item.sellPrice, item.medicine_id);
      }

      // Record initial payment if any
      if (paidAmount > 0 && data.supplier_id) {
        db.prepare(`
          INSERT INTO supplier_payments (id, supplier_id, purchase_id, amount, payment_date, method, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), data.supplier_id, purchaseId, paidAmount,
          data.purchase_date, data.payment_method || 'CASH', 'Payment with purchase');
      }

      // Sync outbox
      db.prepare(`
        INSERT INTO sync_outbox (id, event_id, entity_type, entity_id, operation_type, payload)
        VALUES (?, ?, 'PURCHASE', ?, 'CREATE', ?)
      `).run(uuidv4(), uuidv4(), purchaseId, JSON.stringify({ purchaseId, invoiceNumber }));

      return { purchaseId, invoiceNumber };
    });

    return createTx();
  });

  ipcMain.handle('purchases:recordPayment', (_, data) => {
    const db = getDb();
    const tx = db.transaction(() => {
      const payId = uuidv4();
      db.prepare(`
        INSERT INTO supplier_payments (id, supplier_id, purchase_id, amount, payment_date, method, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(payId, data.supplier_id, data.purchase_id || null,
        data.amount, data.payment_date, data.method || 'CASH', data.notes || null);

      if (data.purchase_id) {
        const purchase = db.prepare('SELECT * FROM purchases WHERE id=?').get(data.purchase_id);
        if (purchase) {
          const newPaid = purchase.paid_amount + data.amount;
          const newOutstanding = Math.max(0, purchase.total_amount - newPaid);
          const newStatus = newOutstanding <= 0 ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'UNPAID';
          db.prepare(`
            UPDATE purchases SET paid_amount=?, outstanding_amount=?, payment_status=? WHERE id=?
          `).run(newPaid, newOutstanding, newStatus, data.purchase_id);
        }
      }
    });
    tx();
    return { success: true };
  });

  ipcMain.handle('purchases:getPayments', (_, supplierId) => {
    const db = getDb();
    return db.prepare(`
      SELECT sp.*, p.invoice_number AS purchase_invoice
      FROM supplier_payments sp
      LEFT JOIN purchases p ON p.id=sp.purchase_id
      WHERE sp.supplier_id=?
      ORDER BY sp.payment_date DESC
    `).all(supplierId);
  });
};
