/**
 * PharmaDesk Updater IPC Handlers
 * Secure bridge between renderer and electron-updater
 */

const updaterService = require('../services/updater');

module.exports = function (ipcMain) {
  ipcMain.handle('updater:check', async () => {
    return await updaterService.checkForUpdates(true);
  });

  ipcMain.handle('updater:download', async () => {
    return await updaterService.downloadUpdate();
  });

  ipcMain.handle('updater:install', async (_, isTransactionInProgress) => {
    return await updaterService.installUpdate(isTransactionInProgress);
  });

  ipcMain.handle('updater:getConfig', async () => {
    return updaterService.getConfig();
  });

  ipcMain.handle('updater:setConfig', async (_, config) => {
    return updaterService.setConfig(config);
  });
};

