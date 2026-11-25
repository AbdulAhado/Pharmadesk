const { getDb } = require('../services/database');
const { v4: uuidv4 } = require('uuid');

module.exports = function(ipcMain) {

  /**
   * Get all medicines with dynamic calculated stock from batches
   */
  ipcMain.handle('medicines:getAll', (_, filters = {}) => {
    const db = getDb();
    let sql = `
      SELECT m.*,
        -- Saleable stock: active batches, not expired, quantity > 0
        COALESCE(SUM(CASE
          WHEN COALESCE(b.status, 'ACTIVE') = 'ACTIVE'
            AND date(b.expiry_date) > date('now')
            AND b.available_quantity > 0
          THEN b.available_quantity
          ELSE 0
        END), 0) AS total_stock,

        COALESCE(SUM(CASE
          WHEN COALESCE(b.status, 'ACTIVE') = 'ACTIVE'
            AND date(b.expiry_date) > date('now')
            AND b.available_quantity > 0
          THEN b.available_quantity
          ELSE 0
        END), 0) AS saleable_stock,

        -- Physical stock: all units in physical warehouse/shelves regardless of expiry or status
        COALESCE(SUM(b.available_quantity), 0) AS physical_stock,

        -- Expired stock: available quantity in expired batches
        COALESCE(SUM(CASE
          WHEN date(b.expiry_date) <= date('now') AND b.available_quantity > 0
          THEN b.available_quantity
          ELSE 0
        END), 0) AS expired_stock,

        -- Near-expiry stock (within 30 days)
        COALESCE(SUM(CASE
          WHEN date(b.expiry_date) > date('now')
            AND date(b.expiry_date) <= date('now', '+30 days')
            AND b.available_quantity > 0
          THEN b.available_quantity
          ELSE 0
        END), 0) AS near_expiry_stock,

        -- Total batch counts
        COUNT(DISTINCT b.id) AS batch_count,
        COUNT(DISTINCT CASE WHEN b.available_quantity > 0 THEN b.id END) AS active_batch_count,

        -- Earliest active expiry date
        MIN(CASE
          WHEN COALESCE(b.status, 'ACTIVE') = 'ACTIVE'
            AND date(b.expiry_date) > date('now')
            AND b.available_quantity > 0
          THEN b.expiry_date
        END) AS earliest_expiry,

        -- Live purchase & selling prices (from medicine master or earliest active batch)
        COALESCE(NULLIF(m.default_purchase_price, 0), (SELECT purchase_cost FROM batches WHERE medicine_id = m.id AND available_quantity > 0 ORDER BY expiry_date ASC LIMIT 1), m.default_purchase_price, 0) AS purchase_price,
        COALESCE(NULLIF(m.default_selling_price, 0), (SELECT selling_price FROM batches WHERE medicine_id = m.id AND available_quantity > 0 ORDER BY expiry_date ASC LIMIT 1), m.default_selling_price, 0) AS selling_price,
        COALESCE(NULLIF(m.default_selling_price, 0), (SELECT selling_price FROM batches WHERE medicine_id = m.id AND available_quantity > 0 ORDER BY expiry_date ASC LIMIT 1), m.default_selling_price, 0) AS sale_price,

        -- Primary barcode if exists
        (SELECT barcode_value FROM barcodes WHERE medicine_id = m.id LIMIT 1) AS primary_barcode

      FROM medicines m
      LEFT JOIN batches b ON b.medicine_id = m.id
    `;

    const params = [];
    const where = [];

    if (filters.search) {
      where.push(`(m.name LIKE ? OR m.generic_name LIKE ? OR m.brand LIKE ? OR m.manufacturer LIKE ? OR m.rack_shelf LIKE ? OR EXISTS (SELECT 1 FROM barcodes bc WHERE bc.medicine_id = m.id AND bc.barcode_value LIKE ?))`);
      const s = `%${filters.search}%`;
      params.push(s, s, s, s, s, s);
    }
    if (filters.category) { where.push(`m.category = ?`); params.push(filters.category); }
    if (filters.dosage_form) { where.push(`m.dosage_form = ?`); params.push(filters.dosage_form); }
    if (filters.dosage) { where.push(`m.dosage_form = ?`); params.push(filters.dosage); }

    // Support both active and isActive
    const activeVal = filters.isActive !== undefined ? filters.isActive : filters.active;
    if (activeVal !== undefined) {
      where.push(`m.is_active = ?`);
      params.push(activeVal ? 1 : 0);
    }

    if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
    sql += ` GROUP BY m.id ORDER BY m.name ASC`;

    if (filters.limit) { sql += ` LIMIT ?`; params.push(filters.limit); }

    return db.prepare(sql).all(...params);
  });

  /**
   * Get single medicine by ID with full batch details & barcodes
   */
  ipcMain.handle('medicines:getById', (_, id) => {
    if (!id) return null;
    const db = getDb();
    const medicine = db.prepare(`
      SELECT m.*,
        COALESCE(SUM(CASE
          WHEN COALESCE(b.status, 'ACTIVE') = 'ACTIVE'
            AND date(b.expiry_date) > date('now')
            AND b.available_quantity > 0
          THEN b.available_quantity
          ELSE 0
        END), 0) AS total_stock,
        COALESCE(SUM(b.available_quantity), 0) AS physical_stock,
        COALESCE(SUM(CASE
          WHEN date(b.expiry_date) <= date('now') AND b.available_quantity > 0
          THEN b.available_quantity
          ELSE 0
        END), 0) AS expired_stock
      FROM medicines m
      LEFT JOIN batches b ON b.medicine_id = m.id
      WHERE m.id = ?
      GROUP BY m.id
    `).get(id);

    if (!medicine) return null;

    const batches = db.prepare(`
      SELECT b.*,
        b.purchase_cost AS purchase_price,
        b.selling_price AS sale_price,
        b.received_quantity AS initial_quantity,
        b.available_quantity AS current_stock,
        s.name AS supplier_name,
        CASE WHEN date(b.expiry_date) <= date('now') THEN 1 ELSE 0 END AS is_expired,
        CASE WHEN date(b.expiry_date) > date('now') AND date(b.expiry_date) <= date('now', '+30 days') THEN 1 ELSE 0 END AS is_near_expiry,
        CAST(julianday(b.expiry_date) - julianday('now') AS INTEGER) AS days_until_expiry
      FROM batches b
      LEFT JOIN suppliers s ON s.id = b.supplier_id
      WHERE b.medicine_id = ?
      ORDER BY b.expiry_date ASC, b.created_at ASC
    `).all(id);

    const barcodes = db.prepare('SELECT * FROM barcodes WHERE medicine_id = ?').all(id);
    return { ...medicine, batches, barcodes };
  });

  /**
   * Create new medicine — supports optional opening batch and stock level!
   */
  ipcMain.handle('medicines:create', (_, data) => {
    const db = getDb();
    if (!data.name || !String(data.name).trim()) {
      throw new Error('Medicine name is required.');
    }

    const id = uuidv4();
    const minStock = data.minimum_stock_level !== undefined ? data.minimum_stock_level : (data.min_stock_level !== undefined ? data.min_stock_level : 10);
    const reorderLevel = data.reorder_level || (parseInt(minStock, 10) * 2);
    const defaultCost = parseFloat(data.default_purchase_price || data.purchase_price || 0) || 0;
    const defaultSale = parseFloat(data.default_selling_price || data.selling_price || data.sale_price || 0) || 0;
    const packSize = parseInt(data.pack_size, 10) || 1;

    // Check if initial stock was provided
    const initialStock = parseInt(data.initial_stock || data.opening_stock || data.stock || data.quantity || 0, 10);

    const createMedicineTx = db.transaction(() => {
      // 1. Insert medicine record
      db.prepare(`
        INSERT INTO medicines (
          id, name, generic_name, brand, manufacturer, strength,
          dosage_form, category, pack_size, default_purchase_price, default_selling_price,
          minimum_stock_level, reorder_level, rack_shelf, requires_prescription, is_narcotic,
          unit_of_measure, preferred_supplier_id, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
      `).run(
        id,
        data.name.trim(),
        data.generic_name ? data.generic_name.trim() : null,
        data.brand ? data.brand.trim() : null,
        data.manufacturer ? data.manufacturer.trim() : null,
        data.strength ? data.strength.trim() : null,
        data.dosage_form || 'Tablet',
        data.category ? data.category.trim() : 'General',
        packSize,
        defaultCost,
        defaultSale,
        parseInt(minStock, 10) || 10,
        parseInt(reorderLevel, 10) || 20,
        data.rack_shelf ? data.rack_shelf.trim() : null,
        data.requires_prescription ? 1 : 0,
        data.is_narcotic ? 1 : 0,
        data.unit_of_measure || 'Pcs',
        data.preferred_supplier_id || null
      );

      // 2. If initial stock > 0, create opening batch and audit records
      if (initialStock > 0) {
        const batchId = uuidv4();
        const batchNum = data.batch_number && data.batch_number.trim()
          ? data.batch_number.trim()
          : `OP-${new Date().getFullYear().toString().slice(-2)}${String(new Date().getMonth() + 1).padStart(2, '0')}`;

        // Default expiry date: 2 years from today if not specified
        let expiryDate = data.expiry_date;
        if (!expiryDate || !expiryDate.trim()) {
          const future = new Date();
          future.setFullYear(future.getFullYear() + 2);
          expiryDate = future.toISOString().slice(0, 10);
        }

        const mfgDate = data.mfg_date ? data.mfg_date.trim() : new Date().toISOString().slice(0, 10);
        const batchCost = parseFloat(data.purchase_cost || data.purchase_price || defaultCost) || defaultCost;
        const batchSale = parseFloat(data.selling_price || data.sale_price || defaultSale) || defaultSale;

        db.prepare(`
          INSERT INTO batches (
            id, medicine_id, batch_number, mfg_date, expiry_date,
            purchase_cost, selling_price, received_quantity, available_quantity,
            supplier_id, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', datetime('now'), datetime('now'))
        `).run(
          batchId,
          id,
          batchNum,
          mfgDate,
          expiryDate,
          batchCost,
          batchSale,
          initialStock,
          initialStock,
          data.preferred_supplier_id || null
        );

        // Record stock movements
        db.prepare(`
          INSERT INTO stock_movements (
            id, medicine_id, batch_id, movement_type, quantity_change,
            old_quantity, new_quantity, unit_cost, reference_type, reference_id,
            reason, user_name, created_at
          ) VALUES (?, ?, ?, 'OPENING', ?, 0, ?, ?, 'OPENING_STOCK', ?, 'Initial Opening Stock upon creation', ?, datetime('now'))
        `).run(
          uuidv4(),
          id,
          batchId,
          initialStock,
          initialStock,
          batchCost,
          batchId,
          data.user_name || 'Administrator'
        );

        // Record stock adjustments
        db.prepare(`
          INSERT INTO stock_adjustments (
            id, medicine_id, batch_id, old_quantity, new_quantity,
            quantity_change, reason, notes, adjusted_by, created_at
          ) VALUES (?, ?, ?, 0, ?, ?, 'Initial Stock Entry', ?, ?, datetime('now'))
        `).run(
          uuidv4(),
          id,
          batchId,
          initialStock,
          initialStock,
          `Opening stock assigned to batch ${batchNum}`,
          data.user_name || 'Administrator'
        );
      }

      // 3. Register barcode if provided
      if (data.barcode && data.barcode.trim()) {
        try {
          db.prepare(`
            INSERT OR IGNORE INTO barcodes (id, medicine_id, barcode_value, unit_type, unit_multiplier)
            VALUES (?, ?, ?, 'PACK', ?)
          `).run(uuidv4(), id, data.barcode.trim(), packSize);
        } catch (err) {
          console.warn('[DB] Barcode auto-add ignored:', err.message);
        }
      }
    });

    createMedicineTx();
    return { id, success: true };
  });

  /**
   * Update medicine master information
   */
  ipcMain.handle('medicines:update', (_, id, data) => {
    const db = getDb();
    if (!id) throw new Error('Medicine ID is required.');
    if (!data.name || !String(data.name).trim()) throw new Error('Medicine name cannot be empty.');

    const minStock = data.minimum_stock_level !== undefined ? data.minimum_stock_level : (data.min_stock_level !== undefined ? data.min_stock_level : 10);
    const reorderLevel = data.reorder_level || (parseInt(minStock, 10) * 2);
    const defaultCost = parseFloat(data.default_purchase_price || data.purchase_price || 0) || 0;
    const defaultSale = parseFloat(data.default_selling_price || data.selling_price || data.sale_price || 0) || 0;
    const packSize = parseInt(data.pack_size, 10) || 1;
    const isActive = data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1;

    const updateTx = db.transaction(() => {
      db.prepare(`
        UPDATE medicines SET
          name = ?,
          generic_name = ?,
          brand = ?,
          manufacturer = ?,
          strength = ?,
          dosage_form = ?,
          category = ?,
          pack_size = ?,
          default_purchase_price = ?,
          default_selling_price = ?,
          minimum_stock_level = ?,
          reorder_level = ?,
          rack_shelf = ?,
          requires_prescription = ?,
          is_narcotic = ?,
          unit_of_measure = ?,
          preferred_supplier_id = ?,
          is_active = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `).run(
        data.name.trim(),
        data.generic_name ? data.generic_name.trim() : null,
        data.brand ? data.brand.trim() : null,
        data.manufacturer ? data.manufacturer.trim() : null,
        data.strength ? data.strength.trim() : null,
        data.dosage_form || null,
        data.category ? data.category.trim() : null,
        packSize,
        defaultCost,
        defaultSale,
        parseInt(minStock, 10) || 10,
        parseInt(reorderLevel, 10) || 20,
        data.rack_shelf ? data.rack_shelf.trim() : null,
        data.requires_prescription ? 1 : 0,
        data.is_narcotic ? 1 : 0,
        data.unit_of_measure || 'Pcs',
        data.preferred_supplier_id || null,
        isActive,
        id
      );

      // If barcode provided, add or update primary barcode
      if (data.barcode && data.barcode.trim()) {
        const val = data.barcode.trim();
        const existingBc = db.prepare('SELECT id FROM barcodes WHERE medicine_id = ? LIMIT 1').get(id);
        if (existingBc) {
          try {
            db.prepare('UPDATE barcodes SET barcode_value = ?, unit_multiplier = ? WHERE id = ?').run(val, packSize, existingBc.id);
          } catch (_) {}
        } else {
          try {
            db.prepare(`
              INSERT OR IGNORE INTO barcodes (id, medicine_id, barcode_value, unit_type, unit_multiplier)
              VALUES (?, ?, ?, 'PACK', ?)
            `).run(uuidv4(), id, val, packSize);
          } catch (_) {}
        }
      }

      // Sync updated prices to active batches so POS and checkout immediately use the new price
      if (defaultSale > 0 || defaultCost > 0) {
        db.prepare(`
          UPDATE batches SET
            selling_price = CASE WHEN ? > 0 THEN ? ELSE selling_price END,
            purchase_cost = CASE WHEN ? > 0 THEN ? ELSE purchase_cost END,
            updated_at = datetime('now')
          WHERE medicine_id = ? AND COALESCE(status, 'ACTIVE') = 'ACTIVE'
        `).run(defaultSale, defaultSale, defaultCost, defaultCost, id);
      }
    });

    updateTx();
    return { success: true };
  });

  ipcMain.handle('medicines:deactivate', (_, id) => {
    const db = getDb();
    db.prepare(`UPDATE medicines SET is_active=0, updated_at=datetime('now') WHERE id=?`).run(id);
    return { success: true };
  });

  ipcMain.handle('medicines:reactivate', (_, id) => {
    const db = getDb();
    db.prepare(`UPDATE medicines SET is_active=1, updated_at=datetime('now') WHERE id=?`).run(id);
    return { success: true };
  });

  ipcMain.handle('medicines:searchByBarcode', (_, barcode) => {
    const db = getDb();
    return db.prepare(`
      SELECT m.*, b.barcode_value, b.unit_type, b.unit_multiplier
      FROM barcodes b
      JOIN medicines m ON m.id = b.medicine_id
      WHERE b.barcode_value = ? AND m.is_active = 1
    `).get(barcode);
  });

  ipcMain.handle('medicines:getBarcodes', (_, medicineId) => {
    const db = getDb();
    return db.prepare('SELECT * FROM barcodes WHERE medicine_id = ?').all(medicineId);
  });

  ipcMain.handle('medicines:addBarcode', (_, data) => {
    const db = getDb();
    const id = uuidv4();
    const val = data.barcode_value || data.barcode;
    if (!val || !val.trim()) throw new Error('Barcode value is required.');
    try {
      db.prepare(`
        INSERT INTO barcodes (id, medicine_id, barcode_value, unit_type, unit_multiplier)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, data.medicine_id, val.trim(), data.unit_type || 'PACK', data.unit_multiplier || 1);
      return { id };
    } catch (e) {
      if (e.message.includes('UNIQUE')) throw new Error('Barcode already registered to another medicine.');
      throw e;
    }
  });

  ipcMain.handle('medicines:removeBarcode', (_, id) => {
    const db = getDb();
    db.prepare('DELETE FROM barcodes WHERE id=?').run(id);
    return { success: true };
  });

  ipcMain.handle('medicines:getCategories', () => {
    const db = getDb();
    return db.prepare(`
      SELECT DISTINCT category FROM medicines
      WHERE category IS NOT NULL AND category != ''
      ORDER BY category
    `).all().map(r => r.category);
  });

  ipcMain.handle('medicines:importCSV', (_, rows) => {
    const db = getDb();
    let imported = 0, skipped = 0;
    const insert = db.prepare(`
      INSERT OR IGNORE INTO medicines (id, name, generic_name, brand, manufacturer,
        strength, dosage_form, category, pack_size, default_purchase_price,
        default_selling_price, minimum_stock_level, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
    `);

    const insertBatch = db.prepare(`
      INSERT INTO batches (id, medicine_id, batch_number, mfg_date, expiry_date,
        purchase_cost, selling_price, received_quantity, available_quantity, status, created_at, updated_at)
      VALUES (?, ?, ?, date('now'), date('now', '+2 years'), ?, ?, ?, ?, 'ACTIVE', datetime('now'), datetime('now'))
    `);

    const importAll = db.transaction(() => {
      for (const row of rows) {
        if (!row.name || !String(row.name).trim()) { skipped++; continue; }
        const id = uuidv4();
        const cost = parseFloat(row.purchase_price) || 0;
        const sale = parseFloat(row.selling_price) || 0;
        const stock = parseInt(row.stock || row.quantity || 0, 10);

        const result = insert.run(
          id,
          row.name.trim(),
          row.generic_name || null,
          row.brand || null,
          row.manufacturer || null,
          row.strength || null,
          row.dosage_form || 'Tablet',
          row.category || 'General',
          row.pack_size || 1,
          cost,
          sale,
          parseInt(row.min_stock, 10) || 10
        );

        if (result.changes > 0) {
          imported++;
          // If CSV row has stock, create initial batch!
          if (stock > 0) {
            const batchNum = row.batch_number || `OP-${new Date().getFullYear().toString().slice(-2)}01`;
            const expiry = row.expiry_date || new Date(Date.now() + 730 * 86400000).toISOString().slice(0, 10);
            insertBatch.run(uuidv4(), id, batchNum, cost, sale, stock, stock);
          }
        } else {
          skipped++;
        }
      }
    });

    importAll();
    return { imported, skipped };
  });

};
