const { getDb, getDbPath } = require('../services/database');
const mongoBackup = require('../services/mongoBackup');
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

module.exports = function(ipcMain) {

  // ── Local SQLite Backup Handlers ──
  ipcMain.handle('backup:getDefaultDir', () => {
    return path.join(app.getPath('documents'), 'PharmaDesk', 'Backups');
  });

  ipcMain.handle('backup:create', async (_, destDir) => {
    const db = getDb();
    const backupDir = destDir || path.join(app.getPath('documents'), 'PharmaDesk', 'Backups');

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('Z')[0];
    const backupFile = path.join(backupDir, `pharmadesk_backup_${timestamp}.db`);

    // Use SQLite backup API (online backup)
    await db.backup(backupFile);

    // Verify
    if (!fs.existsSync(backupFile)) throw new Error('Backup file was not created.');
    const stat = fs.statSync(backupFile);
    if (stat.size < 1024) throw new Error('Backup file appears to be too small — possible corruption.');

    return { success: true, path: backupFile, fileName: path.basename(backupFile), size: stat.size, timestamp };
  });

  ipcMain.handle('backup:restore', async (_, srcPath) => {
    if (!fs.existsSync(srcPath)) throw new Error('Backup file not found.');

    const dbPath = getDbPath();

    // Validate backup file by trying to open it
    let testDb;
    try {
      const Database = require('better-sqlite3');
      testDb = new Database(srcPath, { readonly: true });
      const tbls = testDb.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all();
      const tableNames = tbls.map(t => t.name);
      if (!tableNames.includes('medicines') || !tableNames.includes('sales')) {
        throw new Error('Invalid backup file: required tables missing.');
      }
    } finally {
      if (testDb) testDb.close();
    }

    // Create a safety backup of current DB
    const safetyBackup = dbPath + `.pre_restore_${Date.now()}.bak`;
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, safetyBackup);
    }

    // Replace database
    fs.copyFileSync(srcPath, dbPath);

    return { success: true, safetyBackup };
  });

  ipcMain.handle('backup:list', async (_, dirPath) => {
    const backupDir = dirPath || path.join(app.getPath('documents'), 'PharmaDesk', 'Backups');
    if (!fs.existsSync(backupDir)) return [];

    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.db') && f.startsWith('pharmadesk_backup_'))
      .map(f => {
        const fullPath = path.join(backupDir, f);
        const stat = fs.statSync(fullPath);
        return { name: f, path: fullPath, size: stat.size, modified: stat.mtime.toISOString(), created_at: stat.mtime.toLocaleString() };
      })
      .sort((a, b) => new Date(b.modified) - new Date(a.modified));

    return files;
  });

  // ── MongoDB Atlas Cloud Backup Handlers ──
  ipcMain.handle('backup:getMongoConfig', async () => {
    return await mongoBackup.getMongoConfig();
  });

  ipcMain.handle('backup:testMongo', async (_, customUri, customDbName) => {
    return await mongoBackup.testConnection(customUri, customDbName);
  });

  ipcMain.handle('backup:backupToAtlas', async (_, options) => {
    return await mongoBackup.backupToAtlas(options);
  });

  ipcMain.handle('backup:restoreFromAtlas', async (_, options) => {
    return await mongoBackup.restoreFromAtlas(options);
  });

  ipcMain.handle('backup:checkScheduledCloudBackup', async () => {
    return await mongoBackup.checkScheduledCloudBackup();
  });
};
