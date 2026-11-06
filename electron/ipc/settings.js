const { getDb } = require('../services/database');

module.exports = function(ipcMain) {

  ipcMain.handle('settings:get', (_, key) => {
    const db = getDb();
    return db.prepare('SELECT value FROM settings WHERE key=?').get(key)?.value ?? null;
  });

  ipcMain.handle('settings:getAll', () => {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM settings').all();
    return Object.fromEntries(rows.map(r => [r.key, r.value]));
  });

  ipcMain.handle('settings:set', (_, key, value) => {
    const db = getDb();
    db.prepare('INSERT OR REPLACE INTO settings(key, value) VALUES(?, ?)').run(key, String(value));
    return { success: true };
  });

  ipcMain.handle('settings:setBulk', (_, data) => {
    const db = getDb();
    const upsert = db.prepare('INSERT OR REPLACE INTO settings(key, value) VALUES(?, ?)');
    const tx = db.transaction(() => {
      for (const [key, value] of Object.entries(data)) {
        upsert.run(key, String(value));
      }
    });
    tx();
    return { success: true };
  });
};
