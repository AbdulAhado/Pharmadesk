const { getDb, generateInvoiceNumber } = require('../services/database');
const { v4: uuidv4 } = require('uuid');

module.exports = function(ipcMain) {

  ipcMain.handle('pos:searchMedicine', (_, query) => {
    const db = getDb();
    const s = `%${query}%`;
    return db.prepare(`
      SELECT m.*,
        COALESCE(SUM(CASE WHEN date(b.expiry_date) > date('now') THEN b.available_quantity ELSE 0 END), 0) AS available_stock,
        COALESCE(SUM(CASE WHEN date(b.expiry_date) > date('now') THEN b.available_quantity ELSE 0 END), 0) AS total_stock,
        COALESCE(MIN(CASE WHEN date(b.expiry_date) > date('now') AND b.available_quantity > 0 THEN b.selling_price END), m.default_selling_price, 0) AS current_price,
        COALESCE(MIN(CASE WHEN date(b.expiry_date) > date('now') AND b.available_quantity > 0 THEN b.selling_price END), m.default_selling_price, 0) AS sale_price
      FROM medicines m
      LEFT JOIN batches b ON b.medicine_id = m.id
      WHERE m.is_active = 1
        AND (m.name LIKE ? OR m.generic_name LIKE ? OR m.brand LIKE ? OR m.rack_shelf LIKE ?
          OR EXISTS(SELECT 1 FROM barcodes bc WHERE bc.medicine_id=m.id AND bc.barcode_value LIKE ?))
      GROUP BY m.id
      HAVING available_stock > 0 OR 1=1
      ORDER BY m.name
      LIMIT 30
    `).all(s, s, s, s, s);
  });

  ipcMain.handle('pos:getGenericSubstitutes', (_, { genericName, excludeMedicineId }) => {
    if (!genericName || !genericName.trim()) return [];
    const db = getDb();
    return db.prepare(`
      SELECT m.*,
        COALESCE(SUM(CASE WHEN date(b.expiry_date) > date('now') THEN b.available_quantity ELSE 0 END), 0) AS available_stock,
        COALESCE(MIN(CASE WHEN date(b.expiry_date) > date('now') AND b.available_quantity > 0 THEN b.selling_price END), m.default_selling_price, 0) AS sale_price,
        MIN(CASE WHEN date(b.expiry_date) > date('now') AND b.available_quantity > 0 THEN b.expiry_date END) AS earliest_expiry
      FROM medicines m
      JOIN batches b ON b.medicine_id = m.id AND b.available_quantity > 0 AND date(b.expiry_date) > date('now')
      WHERE m.is_active = 1
        AND LOWER(TRIM(m.generic_name)) = LOWER(TRIM(?))
        AND m.id != ?
      GROUP BY m.id
      HAVING available_stock > 0
      ORDER BY available_stock DESC, m.name ASC
      LIMIT 10
    `).all(genericName, excludeMedicineId || '');
  });

  ipcMain.handle('pos:getAvailableBatches', (_, medicineId) => {
    const db = getDb();
    return db.prepare(`
      SELECT *,
        selling_price AS sale_price,
        available_quantity AS current_stock,
        purchase_cost AS purchase_price,
        CAST(julianday(expiry_date) - julianday('now') AS INTEGER) AS days_until_expiry
      FROM batches
      WHERE medicine_id = ?
        AND available_quantity > 0
        AND date(expiry_date) > date('now')
      ORDER BY expiry_date ASC
    `).all(medicineId);
  });

  ipcMain.handle('pos:completeSale', (_, saleData) => {
    const db = getDb();

    // Validate saleData
    if (!saleData.items || saleData.items.length === 0) {
      throw new Error('Sale must have at least one item.');
    }

    const completeSaleTx = db.transaction(() => {
      const saleId = uuidv4();
      const invoiceNumber = generateInvoiceNumber();
      const now = new Date().toISOString();

      // Check current open cash session
      const openSession = db.prepare(`SELECT id FROM cash_sessions WHERE status='OPEN' ORDER BY opened_at DESC LIMIT 1`).get();

      let subtotal = 0;
      let totalDiscount = 0;
      const saleItems = [];

      // Phase 1: Validate all items and resolve batches
      for (const item of saleData.items) {
        if (!item.medicine_id) throw new Error('Invalid item: missing medicine_id');
        const qty = parseInt(item.quantity, 10);
        if (!qty || qty <= 0) throw new Error(`Invalid quantity for item`);

        const medicine = db.prepare('SELECT * FROM medicines WHERE id=? AND is_active=1').get(item.medicine_id);
        if (!medicine) throw new Error(`Medicine not found or inactive`);

        // Get available batches (FEFO order)
        let batches = db.prepare(`
          SELECT * FROM batches
          WHERE medicine_id = ?
            AND available_quantity > 0
            AND date(expiry_date) > date('now')
          ORDER BY expiry_date ASC
        `).all(item.medicine_id);

        const totalAvailable = batches.reduce((sum, b) => sum + b.available_quantity, 0);
        if (totalAvailable < qty) {
          throw new Error(`Insufficient stock for "${medicine.name}". Available: ${totalAvailable}, Requested: ${qty}`);
        }

        // If user explicitly picked a specific batch in cart, prioritize it first!
        const specificBatchId = item.batch_id || (item.batch && item.batch.id);
        if (specificBatchId) {
          const preferred = batches.find(b => b.id === specificBatchId);
          if (preferred) {
            batches = [preferred, ...batches.filter(b => b.id !== specificBatchId)];
          }
        }

        // Resolve from batches
        let remaining = qty;
        const batchAllocations = [];
        for (const batch of batches) {
          if (remaining <= 0) break;
          const take = Math.min(remaining, batch.available_quantity);
          batchAllocations.push({ batch, take });
          remaining -= take;
        }

        const unitPrice = parseFloat(item.unit_selling_price || item.unitPrice || batches[0]?.selling_price || medicine.default_selling_price);
        const discAmt = parseFloat(item.discount_amount || item.discount) || 0;
        const lineTotal = (unitPrice * qty) - discAmt;

        subtotal += unitPrice * qty;
        totalDiscount += discAmt;

        saleItems.push({
          medicine,
          qty,
          unitPrice,
          discAmt,
          lineTotal,
          batchAllocations,
        });
      }

      // Add overall bill discount if any
      const overallDiscount = parseFloat(saleData.overall_discount_amount) || 0;
      totalDiscount += overallDiscount;

      const taxAmount = parseFloat(saleData.tax_amount) || 0;
      const totalAmount = Math.max(0, subtotal - totalDiscount + taxAmount);
      const amountPaid = parseFloat(saleData.amount_paid) !== undefined && !isNaN(parseFloat(saleData.amount_paid))
        ? parseFloat(saleData.amount_paid)
        : totalAmount;
      const changeGiven = Math.max(0, amountPaid - totalAmount);

      const customerName = saleData.customer_name ? saleData.customer_name.trim() : 'Walk-in';
      const customerPhone = saleData.customer_phone ? saleData.customer_phone.trim() : null;

      // Phase 2: Create sale record
      db.prepare(`
        INSERT INTO sales (id, invoice_number, sold_at, subtotal, discount_amount,
          total_amount, payment_method, amount_paid, change_given, status,
          customer_name, customer_phone, tax_amount, notes, cash_session_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?, ?, ?, ?)
      `).run(
        saleId,
        invoiceNumber,
        now,
        subtotal,
        totalDiscount,
        totalAmount,
        saleData.payment_method || 'CASH',
        amountPaid,
        changeGiven,
        customerName,
        customerPhone,
        taxAmount,
        saleData.notes || null,
        openSession ? openSession.id : null
      );

      // Phase 3: Create sale items & update stock
      for (const si of saleItems) {
        const primaryBatch = si.batchAllocations[0].batch;

        db.prepare(`
          INSERT INTO sale_items (id, sale_id, medicine_id, batch_id, quantity,
            unit_selling_price, discount_amount, recorded_unit_cost, line_total)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), saleId, si.medicine.id, primaryBatch.id, si.qty,
          si.unitPrice, si.discAmt, primaryBatch.purchase_cost, si.lineTotal);

        // Deduct stock batch by batch
        for (const { batch, take } of si.batchAllocations) {
          db.prepare(`
            UPDATE batches SET available_quantity = available_quantity - ?, updated_at=datetime('now')
            WHERE id=?
          `).run(take, batch.id);

          db.prepare(`
            INSERT INTO stock_movements (id, medicine_id, batch_id, movement_type,
              quantity_change, unit_cost, reference_type, reference_id)
            VALUES (?, ?, ?, 'SALE', ?, ?, 'SALE', ?)
          `).run(uuidv4(), si.medicine.id, batch.id, -take, batch.purchase_cost, saleId);
        }
      }

      // Phase 4: Add to sync outbox
      db.prepare(`
        INSERT INTO sync_outbox (id, event_id, entity_type, entity_id, operation_type, payload)
        VALUES (?, ?, 'SALE', ?, 'CREATE', ?)
      `).run(uuidv4(), uuidv4(), saleId, JSON.stringify({ saleId, invoiceNumber, totalAmount, customerName }));

      return { saleId, invoiceNumber, totalAmount, changeGiven, customerName };
    });

    return completeSaleTx();
  });
};
