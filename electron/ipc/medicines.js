const { getDb } = require('../services/database');
const { v4: uuidv4 } = require('uuid');

module.exports = function(ipcMain) {

  ipcMain.handle('medicines:getAll', (_, filters = {}) => {
    const db = getDb();
    let sql = `
      SELECT m.*,
        COALESCE(SUM(b.available_quantity), 0) AS total_stock
      FROM medicines m
      LEFT JOIN batches b ON b.medicine_id = m.id AND b.available_quantity > 0
        AND date(b.expiry_date) > date('now')
    `;
    const params = [];
    const where = [];

    if (filters.search) {
      where.push(`(m.name LIKE ? OR m.generic_name LIKE ? OR m.brand LIKE ? OR m.manufacturer LIKE ? OR m.rack_shelf LIKE ?)`);
      const s = `%${filters.search}%`;
      params.push(s, s, s, s, s);
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
    sql += ` GROUP BY m.id ORDER BY m.name`;

    if (filters.limit) { sql += ` LIMIT ?`; params.push(filters.limit); }

    return db.prepare(sql).all(...params);
  });

  ipcMain.handle('medicines:getById', (_, id) => {
    const db = getDb();
    const medicine = db.prepare('SELECT * FROM medicines WHERE id = ?').get(id);
    if (!medicine) return null;
    const batches = db.prepare('SELECT * FROM batches WHERE medicine_id = ? ORDER BY expiry_date').all(id);
    const barcodes = db.prepare('SELECT * FROM barcodes WHERE medicine_id = ?').all(id);
    return { ...medicine, batches, barcodes };
  });

  ipcMain.handle('medicines:create', (_, data) => {
    const db = getDb();
    const id = uuidv4();
    const minStock = data.minimum_stock_level !== undefined ? data.minimum_stock_level : (data.min_stock_level || 10);
    const reorderLevel = data.reorder_level || (minStock * 2);

    db.prepare(`
      INSERT INTO medicines (id, name, generic_name, brand, manufacturer, strength,
        dosage_form, category, pack_size, default_purchase_price, default_selling_price,
        minimum_stock_level, reorder_level, rack_shelf, requires_prescription, is_narcotic, unit_of_measure,
        preferred_supplier_id, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      id,
      data.name,
      data.generic_name || null,
      data.brand || null,
      data.manufacturer || null,
      data.strength || null,
      data.dosage_form || 'Tablet',
      data.category || null,
      data.pack_size || 1,
      parseFloat(data.default_purchase_price) || 0,
      parseFloat(data.default_selling_price) || 0,
      parseInt(minStock) || 10,
      parseInt(reorderLevel) || 20,
      data.rack_shelf ? data.rack_shelf.trim() : null,
      data.requires_prescription ? 1 : 0,
      data.is_narcotic ? 1 : 0,
      data.unit_of_measure || 'Pcs',
      data.preferred_supplier_id || null
    );

    // If barcode was supplied on creation, auto-register
    if (data.barcode && data.barcode.trim()) {
      try {
        db.prepare(`
          INSERT OR IGNORE INTO barcodes (id, medicine_id, barcode_value, unit_type, unit_multiplier)
          VALUES (?, ?, ?, 'PACK', ?)
        `).run(uuidv4(), id, data.barcode.trim(), data.pack_size || 1);
      } catch (err) {
        console.warn('[DB] Barcode auto-add ignored:', err.message);
      }
    }

    return { id };
  });

  ipcMain.handle('medicines:update', (_, id, data) => {
    const db = getDb();
    const minStock = data.minimum_stock_level !== undefined ? data.minimum_stock_level : (data.min_stock_level || 10);
    const reorderLevel = data.reorder_level || (minStock * 2);

    db.prepare(`
      UPDATE medicines SET
        name=?, generic_name=?, brand=?, manufacturer=?,
        strength=?, dosage_form=?, category=?, pack_size=?,
        default_purchase_price=?, default_selling_price=?, minimum_stock_level=?,
        reorder_level=?, rack_shelf=?, requires_prescription=?, is_narcotic=?, unit_of_measure=?,
        preferred_supplier_id=?, updated_at=datetime('now')
      WHERE id=?
    `).run(
      data.name,
      data.generic_name || null,
      data.brand || null,
      data.manufacturer || null,
      data.strength || null,
      data.dosage_form || null,
      data.category || null,
      data.pack_size || 1,
      parseFloat(data.default_purchase_price) || 0,
      parseFloat(data.default_selling_price) || 0,
      parseInt(minStock) || 10,
      parseInt(reorderLevel) || 20,
      data.rack_shelf ? data.rack_shelf.trim() : null,
      data.requires_prescription ? 1 : 0,
      data.is_narcotic ? 1 : 0,
      data.unit_of_measure || 'Pcs',
      data.preferred_supplier_id || null,
      id
    );
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
        default_selling_price, minimum_stock_level, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    const importAll = db.transaction(() => {
      for (const row of rows) {
        if (!row.name) { skipped++; continue; }
        const id = uuidv4();
        const result = insert.run(id, row.name, row.generic_name || null, row.brand || null,
          row.manufacturer || null, row.strength || null, row.dosage_form || null,
          row.category || null, row.pack_size || 1,
          parseFloat(row.purchase_price) || 0, parseFloat(row.selling_price) || 0,
          parseInt(row.min_stock) || 10);
        if (result.changes > 0) imported++; else skipped++;
      }
    });
    importAll();
    return { imported, skipped };
  });
};
