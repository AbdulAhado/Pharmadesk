const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged && process.env.NODE_ENV === 'development';

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

  // Ensure window is shown even if ready-to-show event takes longer
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.show();
      mainWindow.maximize();
    }
  }, 1500);

  // Allow F12 or Ctrl+Shift+I to toggle DevTools (helps debugging if any issue occurs)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  // Log and handle load failures (fallback to local bundle if dev URL is unreachable)
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Electron] Failed to load ${validatedURL}: ${errorDescription} (Code: ${errorCode})`);
    if (validatedURL && validatedURL.startsWith('http://localhost')) {
      const prodHtml = path.join(__dirname, '../dist-renderer/index.html');
      const fallbackHtml = path.join(__dirname, '../dist/index.html');
      const target = fs.existsSync(prodHtml) ? prodHtml : (fs.existsSync(fallbackHtml) ? fallbackHtml : null);
      if (target) {
        mainWindow.loadFile(target);
      }
    }
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
      mongoBackup.checkScheduledCloudBackup().catch(() => { });
    } catch (e) {
      console.warn('Initial cloud backup check skipped:', e.message);
    }
  }, 10000);

  // Periodic hourly check
  setInterval(() => {
    try {
      const mongoBackup = require('./services/mongoBackup');
      mongoBackup.checkScheduledCloudBackup().catch(() => { });
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
require('./ipc/batches')(ipcMain);
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

// ── Print System ─────────────────────────────────────────────────────────────

ipcMain.handle('print:getPrinters', async () => {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      return await mainWindow.webContents.getPrintersAsync();
    }
  } catch (err) {
    console.error('[Print] getPrinters error:', err);
  }
  return [];
});

ipcMain.handle('print:receipt', async (_, htmlContent) => {
  let paperSize = '58mm';
  let printerName = '';
  let silentPrint = false;

  try {
    const { getDb } = require('./services/database');
    const db = getDb();
    const rows = db.prepare("SELECT key, value FROM settings WHERE key IN ('paper_size', 'printer_name', 'silent_print')").all();
    for (const r of rows) {
      if (r.key === 'paper_size' && r.value) paperSize = r.value;
      if (r.key === 'printer_name' && r.value) printerName = r.value.trim();
      if (r.key === 'silent_print') silentPrint = (r.value === '1' || r.value === 'true');
    }
  } catch (_) { }

  const is58mm = (paperSize === '58mm');
  const printableWidth = is58mm ? '48mm' : '72mm';
  const paperRollSize = is58mm ? '58mm' : '80mm';

  // Sanitize Unicode characters that corrupt thermal printer character ROMs
  // e.g. bullet points (•), smart quotes, non-breaking spaces
  const rawHtml = typeof htmlContent === 'string' ? htmlContent : '';
  const sanitizedContent = rawHtml
    .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/&bull;/g, '-')
    .replace(/&nbsp;/g, ' ');

  const fullHtml = sanitizedContent.includes('<html')
    ? sanitizedContent
    : `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt</title>
  <style>
    @page {
      margin: 0 !important;
      size: ${paperRollSize} auto !important;
    }
    *, *::before, *::after {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #FFFFFF !important;
      color: #000000 !important;
    }
    body {
      width: ${printableWidth} !important;
      max-width: ${printableWidth} !important;
      padding: 1mm 0 !important;
      font-family: 'Courier New', Courier, 'Lucida Console', monospace !important;
      font-size: ${is58mm ? '11px' : '12px'} !important;
      line-height: 1.25 !important;
      word-break: break-all;
    }
    table {
      width: 100% !important;
      border-collapse: collapse !important;
    }
    th, td {
      padding: 2px 0 !important;
      color: #000000 !important;
    }
    /* Strip shadow and gray borders to prevent halftone dithering speckled noise on thermal paper */
    #receipt-print-area {
      box-shadow: none !important;
      border: none !important;
      padding: 0 !important;
      width: 100% !important;
    }
  </style>
</head>
<body>
  ${sanitizedContent}
</body>
</html>`;

  const printWindow = new BrowserWindow({
    show: false,
    width: is58mm ? 384 : 576,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
    }
  });

  await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`);

  return new Promise((resolve) => {
    printWindow.webContents.on('did-finish-load', () => {
      // Allow DOM and font layout to fully settle
      setTimeout(() => {
        const printOptions = {
          silent: silentPrint && Boolean(printerName),
          printBackground: true,
          margins: { marginType: 'none' },
        };

        if (printerName) {
          printOptions.deviceName = printerName;
        }

        printWindow.webContents.print(printOptions, (success, errorType) => {
          // Delay window close by 1500ms to allow Windows Spooler to finish transmission
          setTimeout(() => {
            if (printWindow && !printWindow.isDestroyed()) {
              printWindow.close();
            }
          }, 1500);

          if (!success && errorType && errorType !== 'cancelled') {
            console.error('[Print] Print failed with error:', errorType);
          }
          resolve({ success, error: errorType });
        });
      }, 250);
    });
  });
});

ipcMain.handle('print:testReceipt', async () => {
  let paperSize = '58mm';
  try {
    const { getDb } = require('./services/database');
    const db = getDb();
    const row = db.prepare("SELECT value FROM settings WHERE key = 'paper_size'").get();
    if (row?.value) paperSize = row.value;
  } catch (_) { }

  const is58mm = (paperSize === '58mm');
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const testContent = `
    <div style="text-align: center; font-family: 'Courier New', monospace; font-size: ${is58mm ? '11px' : '12px'}; padding: 2px;">
      <div style="font-weight: 800; font-size: 14px; text-transform: uppercase;">PHARMADESK PHARMACY</div>
      <div style="font-size: 10px; margin-top: 2px;">Thermal Receipt Test</div>
      <div style="font-size: 10px;">${dateStr}</div>
      <div style="border-bottom: 1px dashed #000; margin: 6px 0;"></div>
      <div style="text-align: left; font-size: 10.5px; line-height: 1.4;">
        <div>Paper Width: <strong>${is58mm ? '58mm (Compact)' : '80mm (Standard)'}</strong></div>
        <div>Print Engine: <strong>Chromium Direct</strong></div>
        <div>Status: <strong>ONLINE &amp; READY</strong></div>
      </div>
      <div style="border-bottom: 1px dashed #000; margin: 6px 0;"></div>
      <div style="font-size: 9.5px; line-height: 1.3;">
        If this receipt prints clean and readable without Chinese or garbage symbols, your thermal printer is configured perfectly!
      </div>
      <div style="margin-top: 8px; font-weight: bold; font-size: 11px;">*** TEST SUCCESSFUL ***</div>
    </div>
  `;

  // Delegate to print:receipt handler logic
  const printReceiptHandler = ipcMain._invokeHandlers?.get('print:receipt');
  if (printReceiptHandler) {
    return await printReceiptHandler(null, testContent);
  }
  return { success: false, error: 'Handler not found' };
});
