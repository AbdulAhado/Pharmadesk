const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development';

// Keep a global reference of the window object
let mainWindow;

function createWindow() {
  const iconCandidates = [
    path.join(__dirname, '../public/icon.ico'),
    path.join(__dirname, '../build/icon.ico'),
    path.join(__dirname, '../dist-renderer/favicon.ico'),
    path.join(__dirname, '../assets/pharma-removebg-preview.ico'),
  ];
  const chosenIcon = iconCandidates.find((p) => fs.existsSync(p));

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    titleBarStyle: 'default',
    title: 'PharmaDesk',
    icon: chosenIcon,
    show: false,
    backgroundColor: '#F4F7F8',
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    if (process.env.OPEN_DEVTOOLS === 'true') {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  } else {
    const prodHtml = path.join(__dirname, '../dist-renderer/index.html');
    const fallbackHtml = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(fs.existsSync(prodHtml) ? prodHtml : fallbackHtml);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Set Windows Application User Model ID for proper taskbar grouping & icon
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.pharmadesk.desktop');
  }

  createWindow();

  // Initialize database
  const db = require('./services/database');
  db.initialize();

  // Initialize auto-updater service with main window reference
  try {
    const updaterService = require('./services/updater');
    updaterService.init(mainWindow);
  } catch (e) {
    console.warn('[Updater] Initialization warning:', e.message);
  }

  // Automated scheduled MongoDB Atlas cloud backup check (runs in background)
  setTimeout(() => {
    try {
      const mongoBackup = require('./services/mongoBackup');
      mongoBackup.checkScheduledCloudBackup().catch(() => {});
    } catch (e) {
      console.warn('Initial cloud backup check skipped:', e.message);
    }
  }, 10000);

  // Periodic hourly check
  setInterval(() => {
    try {
      const mongoBackup = require('./services/mongoBackup');
      mongoBackup.checkScheduledCloudBackup().catch(() => {});
    } catch (e) {
      console.warn('Periodic cloud backup check skipped:', e.message);
    }
  }, 60 * 60 * 1000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC Handlers ───────────────────────────────────────────────────────────

// Database operations are wired via handlers in each service module
require('./ipc/medicines')(ipcMain);
require('./ipc/inventory')(ipcMain);
require('./ipc/pos')(ipcMain);
require('./ipc/purchases')(ipcMain);
require('./ipc/sales')(ipcMain);
require('./ipc/expenses')(ipcMain);
require('./ipc/reports')(ipcMain);
require('./ipc/settings')(ipcMain);
require('./ipc/backup')(ipcMain);
require('./ipc/dashboard')(ipcMain);
require('./ipc/updater')(ipcMain);
require('./ipc/license')(ipcMain);

// File dialogs
ipcMain.handle('dialog:openFile', async (_, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

ipcMain.handle('dialog:saveFile', async (_, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('dialog:showMessage', async (_, options) => {
  const result = await dialog.showMessageBox(mainWindow, options);
  return result;
});

ipcMain.handle('shell:openPath', async (_, filePath) => {
  await shell.openPath(filePath);
});

ipcMain.handle('app:getPath', (_, name) => {
  return app.getPath(name);
});

ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

// Print
ipcMain.handle('print:receipt', async (_, htmlContent) => {
  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true }
  });
  await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
  return new Promise((resolve) => {
    printWindow.webContents.print({ silent: false, printBackground: true }, (success, error) => {
      printWindow.close();
      resolve({ success, error });
    });
  });
});
