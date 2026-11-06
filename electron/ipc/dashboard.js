const { getDb } = require('../services/database');

module.exports = function(ipcMain) {

  ipcMain.handle('dashboard:getStats', (_, period = 'today') => {
    const db = getDb();
    let dateFilter;
    let priorFilter;
    let expenseFilter;
    let priorExpenseFilter;
    let periodLabel;

    if (period === 'today') {
      dateFilter = `date(s.sold_at) = date('now')`;
      priorFilter = `date(s.sold_at) = date('now', '-1 day')`;
      expenseFilter = `date(expense_date) = date('now')`;
      priorExpenseFilter = `date(expense_date) = date('now', '-1 day')`;
      periodLabel = 'vs yesterday';
    } else if (period === 'week') {
      dateFilter = `date(s.sold_at) >= date('now', '-7 days')`;
      priorFilter = `date(s.sold_at) >= date('now', '-14 days') AND date(s.sold_at) < date('now', '-7 days')`;
      expenseFilter = `date(expense_date) >= date('now', '-7 days')`;
      priorExpenseFilter = `date(expense_date) >= date('now', '-14 days') AND date(expense_date) < date('now', '-7 days')`;
      periodLabel = 'vs last week';
    } else if (period === 'month') {
      dateFilter = `date(s.sold_at) >= date('now', '-30 days')`;
      priorFilter = `date(s.sold_at) >= date('now', '-60 days') AND date(s.sold_at) < date('now', '-30 days')`;
      expenseFilter = `date(expense_date) >= date('now', '-30 days')`;
      priorExpenseFilter = `date(expense_date) >= date('now', '-60 days') AND date(expense_date) < date('now', '-30 days')`;
      periodLabel = 'vs last month';
    } else {
      dateFilter = `1=1`;
      priorFilter = `1=0`;
      expenseFilter = `1=1`;
      priorExpenseFilter = `1=0`;
      periodLabel = '';
    }

    const sales = db.prepare(`
      SELECT
        COALESCE(SUM(s.total_amount), 0) AS total_sales,
        COALESCE(SUM(s.total_amount - COALESCE(si_costs.total_cost, 0)), 0) AS gross_profit,
        COUNT(s.id) AS invoice_count
      FROM sales s
      LEFT JOIN (
        SELECT sale_id, SUM(recorded_unit_cost * quantity) AS total_cost
        FROM sale_items GROUP BY sale_id
      ) si_costs ON si_costs.sale_id = s.id
      WHERE s.status='COMPLETED' AND ${dateFilter}
    `).get();

    const priorSales = db.prepare(`
      SELECT
        COALESCE(SUM(s.total_amount), 0) AS total_sales,
        COALESCE(SUM(s.total_amount - COALESCE(si_costs.total_cost, 0)), 0) AS gross_profit
      FROM sales s
      LEFT JOIN (
        SELECT sale_id, SUM(recorded_unit_cost * quantity) AS total_cost
        FROM sale_items GROUP BY sale_id
      ) si_costs ON si_costs.sale_id = s.id
      WHERE s.status='COMPLETED' AND ${priorFilter}
    `).get();

    const expenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS total_expenses
      FROM expenses
      WHERE ${expenseFilter}
    `).get();

    const priorExpenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS total_expenses
      FROM expenses
      WHERE ${priorExpenseFilter}
    `).get();

    const currentNetProfit = sales.gross_profit - expenses.total_expenses;
    const priorNetProfit = priorSales.gross_profit - priorExpenses.total_expenses;

    const calcChange = (curr, prior) => {
      if (!prior || prior === 0) {
        return curr > 0 ? 100 : 0;
      }
      return Math.round(((curr - prior) / Math.abs(prior)) * 1000) / 10;
    };

    const salesChange = calcChange(sales.total_sales, priorSales.total_sales);
    const grossProfitChange = calcChange(sales.gross_profit, priorSales.gross_profit);
    const netProfitChange = calcChange(currentNetProfit, priorNetProfit);

    const grossMarginPct = sales.total_sales > 0
      ? Math.round((sales.gross_profit / sales.total_sales) * 1000) / 10
      : 0;

    const inventoryValue = db.prepare(`
      SELECT
        COALESCE(SUM(b.available_quantity * b.purchase_cost), 0) AS value,
        COALESCE(SUM(b.available_quantity * b.selling_price), 0) AS retail_value,
        COUNT(DISTINCT b.medicine_id) AS active_items
      FROM batches b
      WHERE b.available_quantity > 0
    `).get();

    const lowStockCount = db.prepare(`
      SELECT COUNT(*) AS count FROM (
        SELECT m.id FROM medicines m
        LEFT JOIN batches b ON b.medicine_id = m.id AND date(b.expiry_date)>date('now')
        WHERE m.is_active=1
        GROUP BY m.id
        HAVING COALESCE(SUM(b.available_quantity),0) <= m.minimum_stock_level
      )
    `).get();

    const expiredCount = db.prepare(`
      SELECT COUNT(*) AS count FROM batches WHERE date(expiry_date) <= date('now') AND available_quantity > 0
    `).get();

    const nearExpiryCount = db.prepare(`
      SELECT COUNT(*) AS count FROM batches
      WHERE available_quantity > 0
        AND date(expiry_date) > date('now')
        AND date(expiry_date) <= date('now', '+30 days')
    `).get();

    return {
      total_sales: sales.total_sales,
      gross_profit: sales.gross_profit,
      total_expenses: expenses.total_expenses,
      net_profit: currentNetProfit,
      gross_margin_pct: grossMarginPct,
      sales_change: salesChange,
      gross_profit_change: grossProfitChange,
      net_profit_change: netProfitChange,
      period_label: periodLabel,
      invoice_count: sales.invoice_count,
      inventory_value: inventoryValue.value,
      stock_value: inventoryValue.value,
      stock_retail_value: inventoryValue.retail_value,
      active_items_count: inventoryValue.active_items,
      low_stock_count: lowStockCount.count,
      expired_count: expiredCount.count,
      near_expiry_count: nearExpiryCount.count,
    };
  });

  ipcMain.handle('dashboard:getChartData', (_, period = 'week') => {
    const db = getDb();
    let days = period === 'today' ? 1 : period === 'week' ? 7 : 30;

    const rows = db.prepare(`
      WITH RECURSIVE dates(d) AS (
        SELECT date('now', '-' || (? - 1) || ' days')
        UNION ALL SELECT date(d, '+1 day') FROM dates WHERE d < date('now')
      )
      SELECT
        d AS date,
        COALESCE(SUM(s.total_amount), 0) AS sales,
        COALESCE(SUM(s.total_amount - COALESCE(costs.total_cost, 0)), 0) AS profit
      FROM dates
      LEFT JOIN sales s ON date(s.sold_at) = d AND s.status='COMPLETED'
      LEFT JOIN (
        SELECT si.sale_id, SUM(si.recorded_unit_cost * si.quantity) AS total_cost
        FROM sale_items si GROUP BY si.sale_id
      ) costs ON costs.sale_id = s.id
      GROUP BY d
      ORDER BY d
    `).all(days);

    return rows;
  });

  ipcMain.handle('dashboard:getRecentInvoices', () => {
    const db = getDb();
    return db.prepare(`
      SELECT s.*, COUNT(si.id) AS item_count
      FROM sales s
      LEFT JOIN sale_items si ON si.sale_id=s.id
      WHERE s.status='COMPLETED'
      GROUP BY s.id
      ORDER BY s.sold_at DESC
      LIMIT 10
    `).all();
  });

  ipcMain.handle('dashboard:getTopMedicines', (_, period = 'month') => {
    const db = getDb();
    let dateFilter = period === 'week' ? `date(s.sold_at) >= date('now','-7 days')` :
                     period === 'today' ? `date(s.sold_at) = date('now')` :
                     `date(s.sold_at) >= date('now','-30 days')`;
    return db.prepare(`
      SELECT m.name, m.brand, m.category,
        SUM(si.quantity) AS total_qty,
        SUM(si.line_total) AS total_revenue
      FROM sale_items si
      JOIN medicines m ON m.id=si.medicine_id
      JOIN sales s ON s.id=si.sale_id
      WHERE s.status='COMPLETED' AND ${dateFilter}
      GROUP BY si.medicine_id
      ORDER BY total_qty DESC
      LIMIT 10
    `).all();
  });

  ipcMain.handle('dashboard:getAlerts', () => {
    const db = getDb();
    const lowStock = db.prepare(`
      SELECT m.id, m.name, m.brand, m.minimum_stock_level,
        COALESCE(SUM(CASE WHEN date(b.expiry_date)>date('now') THEN b.available_quantity ELSE 0 END),0) AS total_stock
      FROM medicines m
      LEFT JOIN batches b ON b.medicine_id=m.id
      WHERE m.is_active=1
      GROUP BY m.id
      HAVING total_stock <= m.minimum_stock_level
      ORDER BY total_stock ASC
      LIMIT 10
    `).all();

    const nearExpiry = db.prepare(`
      SELECT b.*, m.name AS medicine_name, m.brand,
        CAST(julianday(b.expiry_date) - julianday('now') AS INTEGER) AS days_until_expiry
      FROM batches b JOIN medicines m ON m.id=b.medicine_id
      WHERE b.available_quantity > 0
        AND date(b.expiry_date) > date('now')
        AND date(b.expiry_date) <= date('now', '+30 days')
      ORDER BY b.expiry_date ASC
      LIMIT 10
    `).all();

    const expired = db.prepare(`
      SELECT b.*, m.name AS medicine_name, m.brand,
        CAST(julianday('now') - julianday(b.expiry_date) AS INTEGER) AS days_expired
      FROM batches b JOIN medicines m ON m.id=b.medicine_id
      WHERE b.available_quantity > 0 AND date(b.expiry_date) <= date('now')
      ORDER BY b.expiry_date ASC
      LIMIT 5
    `).all();

    return { lowStock, nearExpiry, expired };
  });

  ipcMain.handle('dashboard:getCategorySales', (_, period = 'today') => {
    const db = getDb();
    let dateFilter = period === 'week' ? `date(s.sold_at) >= date('now','-7 days')` :
                     period === 'today' ? `date(s.sold_at) = date('now')` :
                     `date(s.sold_at) >= date('now','-30 days')`;
    const rows = db.prepare(`
      SELECT
        COALESCE(m.category, 'General') AS category,
        COALESCE(SUM(si.line_total), 0) AS total_revenue,
        COALESCE(SUM(si.quantity), 0) AS total_qty
      FROM sale_items si
      JOIN medicines m ON m.id = si.medicine_id
      JOIN sales s ON s.id = si.sale_id
      WHERE s.status = 'COMPLETED' AND ${dateFilter}
      GROUP BY m.category
      ORDER BY total_revenue DESC
      LIMIT 5
    `).all();
    return rows;
  });
};
