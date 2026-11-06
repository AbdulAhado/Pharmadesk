const { getDb } = require('../services/database');

module.exports = function(ipcMain) {

  ipcMain.handle('reports:getSalesSummary', (_, filters = {}) => {
    const db = getDb();
    const from = filters.from || '2000-01-01';
    const to = filters.to || '2099-12-31';
    return db.prepare(`
      SELECT
        date(s.sold_at) AS sale_date,
        COUNT(s.id) AS invoice_count,
        SUM(s.subtotal) AS subtotal,
        SUM(s.discount_amount) AS discount,
        SUM(s.total_amount) AS net_sales,
        SUM(costs.total_cost) AS cogs,
        SUM(s.total_amount) - SUM(COALESCE(costs.total_cost, 0)) AS gross_profit
      FROM sales s
      LEFT JOIN (
        SELECT sale_id, SUM(recorded_unit_cost * quantity) AS total_cost
        FROM sale_items GROUP BY sale_id
      ) costs ON costs.sale_id=s.id
      WHERE s.status='COMPLETED'
        AND date(s.sold_at) BETWEEN ? AND ?
      GROUP BY date(s.sold_at)
      ORDER BY sale_date DESC
    `).all(from, to);
  });

  ipcMain.handle('reports:getSalesByMedicine', (_, filters = {}) => {
    const db = getDb();
    const from = filters.from || '2000-01-01';
    const to = filters.to || '2099-12-31';
    return db.prepare(`
      SELECT m.name, m.brand, m.category, m.dosage_form,
        SUM(si.quantity) AS total_qty,
        SUM(si.line_total) AS total_revenue,
        SUM(si.recorded_unit_cost * si.quantity) AS total_cost,
        SUM(si.line_total) - SUM(si.recorded_unit_cost * si.quantity) AS gross_profit
      FROM sale_items si
      JOIN medicines m ON m.id=si.medicine_id
      JOIN sales s ON s.id=si.sale_id
      WHERE s.status='COMPLETED' AND date(s.sold_at) BETWEEN ? AND ?
      GROUP BY si.medicine_id
      ORDER BY total_revenue DESC
    `).all(from, to);
  });

  ipcMain.handle('reports:getProfitReport', (_, filters = {}) => {
    const db = getDb();
    const from = filters.from || '2000-01-01';
    const to = filters.to || '2099-12-31';

    const sales = db.prepare(`
      SELECT
        SUM(s.total_amount) AS net_sales,
        SUM(costs.total_cost) AS cogs,
        SUM(s.total_amount) - SUM(COALESCE(costs.total_cost,0)) AS gross_profit
      FROM sales s
      LEFT JOIN (
        SELECT sale_id, SUM(recorded_unit_cost*quantity) AS total_cost
        FROM sale_items GROUP BY sale_id
      ) costs ON costs.sale_id=s.id
      WHERE s.status='COMPLETED' AND date(s.sold_at) BETWEEN ? AND ?
    `).get(from, to);

    const expenses = db.prepare(`
      SELECT COALESCE(SUM(amount),0) AS total_expenses
      FROM expenses
      WHERE date(expense_date) BETWEEN ? AND ?
    `).get(from, to);

    return {
      ...sales,
      total_expenses: expenses.total_expenses,
      net_operating_profit: (sales.gross_profit || 0) - (expenses.total_expenses || 0),
    };
  });

  ipcMain.handle('reports:getInventoryValuation', () => {
    const db = getDb();
    return db.prepare(`
      SELECT m.name, m.brand, m.category, m.dosage_form,
        b.batch_number, b.expiry_date, b.available_quantity,
        b.purchase_cost, b.selling_price,
        b.available_quantity * b.purchase_cost AS cost_value,
        b.available_quantity * b.selling_price AS retail_value,
        CASE WHEN date(b.expiry_date) < date('now') THEN 1 ELSE 0 END AS is_expired
      FROM batches b
      JOIN medicines m ON m.id=b.medicine_id
      WHERE b.available_quantity > 0
      ORDER BY m.name, b.expiry_date
    `).all();
  });

  ipcMain.handle('reports:getPurchaseReport', (_, filters = {}) => {
    const db = getDb();
    const from = filters.from || '2000-01-01';
    const to = filters.to || '2099-12-31';
    return db.prepare(`
      SELECT p.*, s.name AS supplier_name, COUNT(pi.id) AS item_count
      FROM purchases p
      LEFT JOIN suppliers s ON s.id=p.supplier_id
      LEFT JOIN purchase_items pi ON pi.purchase_id=p.id
      WHERE date(p.purchase_date) BETWEEN ? AND ?
      GROUP BY p.id
      ORDER BY p.purchase_date DESC
    `).all(from, to);
  });

  ipcMain.handle('reports:getExpenseReport', (_, filters = {}) => {
    const db = getDb();
    const from = filters.from || '2000-01-01';
    const to = filters.to || '2099-12-31';
    return db.prepare(`
      SELECT category,
        SUM(amount) AS total,
        COUNT(id) AS count,
        GROUP_CONCAT(DISTINCT payment_method) AS methods
      FROM expenses
      WHERE date(expense_date) BETWEEN ? AND ?
      GROUP BY category
      ORDER BY total DESC
    `).all(from, to);
  });

  ipcMain.handle('reports:getCashReport', (_, date) => {
    const db = getDb();
    const d = date || new Date().toISOString().split('T')[0];
    const cashSales = db.prepare(`
      SELECT COALESCE(SUM(total_amount),0) AS total FROM sales
      WHERE payment_method='CASH' AND date(sold_at)=? AND status='COMPLETED'
    `).get(d);
    const cardSales = db.prepare(`
      SELECT COALESCE(SUM(total_amount),0) AS total FROM sales
      WHERE payment_method='CARD' AND date(sold_at)=? AND status='COMPLETED'
    `).get(d);
    const cashExpenses = db.prepare(`
      SELECT COALESCE(SUM(amount),0) AS total FROM expenses
      WHERE payment_method='CASH' AND date(expense_date)=?
    `).get(d);
    return { date: d, cash_sales: cashSales.total, card_sales: cardSales.total, cash_expenses: cashExpenses.total };
  });

  ipcMain.handle('reports:getSupplierBalances', () => {
    const db = getDb();
    return db.prepare(`
      SELECT s.id, s.name, s.phone,
        COALESCE(SUM(p.total_amount),0) AS total_purchases,
        COALESCE(SUM(p.paid_amount),0) AS total_paid,
        COALESCE(SUM(p.outstanding_amount),0) AS outstanding
      FROM suppliers s
      LEFT JOIN purchases p ON p.supplier_id=s.id
      WHERE s.is_active=1
      GROUP BY s.id
      ORDER BY outstanding DESC
    `).all();
  });

  ipcMain.handle('reports:getLowStockReport', () => {
    const db = getDb();
    return db.prepare(`
      SELECT m.id, m.name, m.brand, m.category, m.minimum_stock_level,
        COALESCE(SUM(CASE WHEN date(b.expiry_date)>date('now') THEN b.available_quantity ELSE 0 END),0) AS current_stock
      FROM medicines m
      LEFT JOIN batches b ON b.medicine_id=m.id
      WHERE m.is_active=1
      GROUP BY m.id
      HAVING current_stock <= m.minimum_stock_level
      ORDER BY current_stock, m.name
    `).all();
  });

  ipcMain.handle('reports:getExpiryReport', (_, filters = {}) => {
    const db = getDb();
    const days = filters.days || 30;
    let sql = `
      SELECT b.*, m.name AS medicine_name, m.brand, m.category,
        CAST(julianday(b.expiry_date) - julianday('now') AS INTEGER) AS days_until_expiry,
        b.available_quantity * b.purchase_cost AS cost_value,
        CASE WHEN date(b.expiry_date) < date('now') THEN 1 ELSE 0 END AS is_expired
      FROM batches b JOIN medicines m ON m.id=b.medicine_id
      WHERE b.available_quantity > 0
    `;
    if (filters.expiredOnly) {
      sql += ` AND date(b.expiry_date) < date('now')`;
    } else {
      sql += ` AND date(b.expiry_date) <= date('now', '+' || ${parseInt(days)} || ' days')`;
    }
    sql += ` ORDER BY b.expiry_date`;
    return db.prepare(sql).all();
  });
};
