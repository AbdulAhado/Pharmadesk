const { getDb } = require('../services/database');
const { v4: uuidv4 } = require('uuid');

const DEFAULT_CATEGORIES = ['Rent', 'Salaries', 'Electricity', 'Water', 'Internet',
  'Transport', 'Stationery', 'Repairs', 'Miscellaneous', 'Other'];

module.exports = function(ipcMain) {

  ipcMain.handle('expenses:getAll', (_, filters = {}) => {
    const db = getDb();
    let sql = `SELECT * FROM expenses`;
    const params = [];
    const where = [];
    if (filters.from) { where.push(`date(expense_date)>=?`); params.push(filters.from); }
    if (filters.to) { where.push(`date(expense_date)<=?`); params.push(filters.to); }
    if (filters.category) { where.push(`category=?`); params.push(filters.category); }
    if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
    sql += ` ORDER BY expense_date DESC, created_at DESC`;
    if (filters.limit) { sql += ` LIMIT ?`; params.push(filters.limit); }
    return db.prepare(sql).all(...params);
  });

  ipcMain.handle('expenses:create', (_, data) => {
    const db = getDb();
    const id = uuidv4();
    db.prepare(`
      INSERT INTO expenses (id, category, description, amount, payment_method, expense_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, data.category, data.description || null, data.amount,
      data.payment_method || 'CASH', data.expense_date);
    return { id };
  });

  ipcMain.handle('expenses:update', (_, id, data) => {
    const db = getDb();
    db.prepare(`
      UPDATE expenses SET category=?, description=?, amount=?, payment_method=?, expense_date=?
      WHERE id=?
    `).run(data.category, data.description || null, data.amount,
      data.payment_method || 'CASH', data.expense_date, id);
    return { success: true };
  });

  ipcMain.handle('expenses:delete', (_, id) => {
    const db = getDb();
    db.prepare('DELETE FROM expenses WHERE id=?').run(id);
    return { success: true };
  });

  ipcMain.handle('expenses:getCategories', () => {
    const db = getDb();
    const custom = db.prepare(`
      SELECT DISTINCT category FROM expenses WHERE category NOT IN (${DEFAULT_CATEGORIES.map(() => '?').join(',')})
    `).all(...DEFAULT_CATEGORIES).map(r => r.category);
    return [...DEFAULT_CATEGORIES, ...custom].sort();
  });

  ipcMain.handle('expenses:getCashSession', () => {
    const db = getDb();
    return db.prepare(`SELECT * FROM cash_sessions WHERE status='OPEN' ORDER BY opened_at DESC LIMIT 1`).get() || null;
  });

  ipcMain.handle('expenses:openCashSession', (_, data) => {
    const db = getDb();
    const existing = db.prepare(`SELECT id FROM cash_sessions WHERE status='OPEN'`).get();
    if (existing) throw new Error('A cash session is already open. Close it first.');
    const id = uuidv4();
    db.prepare(`
      INSERT INTO cash_sessions (id, opened_at, opening_cash, status)
      VALUES (?, datetime('now'), ?, 'OPEN')
    `).run(id, data.opening_cash || 0);
    return { id };
  });

  ipcMain.handle('expenses:closeCashSession', (_, data) => {
    const db = getDb();
    const session = db.prepare(`SELECT * FROM cash_sessions WHERE id=? AND status='OPEN'`).get(data.id);
    if (!session) throw new Error('No open cash session found with that ID.');

    // Calculate expected closing cash
    const today = new Date().toISOString().split('T')[0];
    const cashSales = db.prepare(`
      SELECT COALESCE(SUM(total_amount),0) AS total FROM sales
      WHERE payment_method='CASH' AND date(sold_at) >= date(?)
    `).get(session.opened_at)?.total || 0;

    const cashExpenses = db.prepare(`
      SELECT COALESCE(SUM(amount),0) AS total FROM expenses
      WHERE payment_method='CASH' AND expense_date >= date(?)
    `).get(session.opened_at)?.total || 0;

    const expected = session.opening_cash + cashSales - cashExpenses;

    db.prepare(`
      UPDATE cash_sessions
      SET closed_at=datetime('now'), expected_closing_cash=?, counted_closing_cash=?,
        cash_difference=?, status='CLOSED'
      WHERE id=?
    `).run(expected, data.counted_cash, data.counted_cash - expected, data.id);

    return { expected, counted: data.counted_cash, difference: data.counted_cash - expected };
  });
};
