const { contextBridge, ipcRenderer } = require('electron');

// Expose a minimal, validated API surface to the renderer
contextBridge.exposeInMainWorld('api', {
  // ── Medicines ──────────────────────────────────────────────────────────────
  medicines: {
    getAll: (filters) => ipcRenderer.invoke('medicines:getAll', filters),
    getById: (id) => ipcRenderer.invoke('medicines:getById', id),
    create: (data) => ipcRenderer.invoke('medicines:create', data),
    update: (id, data) => ipcRenderer.invoke('medicines:update', id, data),
    deactivate: (id) => ipcRenderer.invoke('medicines:deactivate', id),
    reactivate: (id) => ipcRenderer.invoke('medicines:reactivate', id),
    searchByBarcode: (barcode) => ipcRenderer.invoke('medicines:searchByBarcode', barcode),
    getBarcodes: (medicineId) => ipcRenderer.invoke('medicines:getBarcodes', medicineId),
    addBarcode: (data) => ipcRenderer.invoke('medicines:addBarcode', data),
    removeBarcode: (id) => ipcRenderer.invoke('medicines:removeBarcode', id),
    getCategories: () => ipcRenderer.invoke('medicines:getCategories'),
    importCSV: (rows) => ipcRenderer.invoke('medicines:importCSV', rows),
  },

  // ── Inventory ──────────────────────────────────────────────────────────────
  inventory: {
    getOverview: (filters) => ipcRenderer.invoke('inventory:getOverview', filters),
    getBatches: (medicineId) => ipcRenderer.invoke('inventory:getBatches', medicineId),
    getAllBatches: (filters) => ipcRenderer.invoke('inventory:getAllBatches', filters),
    adjustStock: (data) => ipcRenderer.invoke('inventory:adjustStock', data),
    writeOffExpired: (data) => ipcRenderer.invoke('inventory:writeOffExpired', data),
    getMovements: (filters) => ipcRenderer.invoke('inventory:getMovements', filters),
    getLowStock: () => ipcRenderer.invoke('inventory:getLowStock'),
    getExpiryAlerts: (days) => ipcRenderer.invoke('inventory:getExpiryAlerts', days),
    returnToSupplier: (data) => ipcRenderer.invoke('inventory:returnToSupplier', data),
  },

  // ── POS ───────────────────────────────────────────────────────────────────
  pos: {
    searchMedicine: (query) => ipcRenderer.invoke('pos:searchMedicine', query),
    getGenericSubstitutes: (params) => ipcRenderer.invoke('pos:getGenericSubstitutes', params),
    getAvailableBatches: (medicineId) => ipcRenderer.invoke('pos:getAvailableBatches', medicineId),
    completeSale: (saleData) => ipcRenderer.invoke('pos:completeSale', saleData),
  },

  // ── Purchases ─────────────────────────────────────────────────────────────
  purchases: {
    getAll: (filters) => ipcRenderer.invoke('purchases:getAll', filters),
    getById: (id) => ipcRenderer.invoke('purchases:getById', id),
    create: (data) => ipcRenderer.invoke('purchases:create', data),
    getSuppliers: (filters) => ipcRenderer.invoke('purchases:getSuppliers', filters),
    getSupplierById: (id) => ipcRenderer.invoke('purchases:getSupplierById', id),
    createSupplier: (data) => ipcRenderer.invoke('purchases:createSupplier', data),
    updateSupplier: (id, data) => ipcRenderer.invoke('purchases:updateSupplier', id, data),
    recordPayment: (data) => ipcRenderer.invoke('purchases:recordPayment', data),
    getPayments: (supplierId) => ipcRenderer.invoke('purchases:getPayments', supplierId),
  },

  // ── Sales ─────────────────────────────────────────────────────────────────
  sales: {
    getAll: (filters) => ipcRenderer.invoke('sales:getAll', filters),
    getById: (id) => ipcRenderer.invoke('sales:getById', id),
    getItems: (saleId) => ipcRenderer.invoke('sales:getItems', saleId),
    processReturn: (data) => ipcRenderer.invoke('sales:processReturn', data),
    getReturns: (filters) => ipcRenderer.invoke('sales:getReturns', filters),
  },

  // ── Expenses ──────────────────────────────────────────────────────────────
  expenses: {
    getAll: (filters) => ipcRenderer.invoke('expenses:getAll', filters),
    create: (data) => ipcRenderer.invoke('expenses:create', data),
    update: (id, data) => ipcRenderer.invoke('expenses:update', id, data),
    delete: (id) => ipcRenderer.invoke('expenses:delete', id),
    getCategories: () => ipcRenderer.invoke('expenses:getCategories'),
    getCashSession: () => ipcRenderer.invoke('expenses:getCashSession'),
    openCashSession: (data) => ipcRenderer.invoke('expenses:openCashSession', data),
    closeCashSession: (data) => ipcRenderer.invoke('expenses:closeCashSession', data),
  },

  // ── Reports ───────────────────────────────────────────────────────────────
  reports: {
    getSalesSummary: (filters) => ipcRenderer.invoke('reports:getSalesSummary', filters),
    getSalesByMedicine: (filters) => ipcRenderer.invoke('reports:getSalesByMedicine', filters),
    getProfitReport: (filters) => ipcRenderer.invoke('reports:getProfitReport', filters),
    getInventoryValuation: () => ipcRenderer.invoke('reports:getInventoryValuation'),
    getPurchaseReport: (filters) => ipcRenderer.invoke('reports:getPurchaseReport', filters),
    getExpenseReport: (filters) => ipcRenderer.invoke('reports:getExpenseReport', filters),
    getCashReport: (date) => ipcRenderer.invoke('reports:getCashReport', date),
    getSupplierBalances: () => ipcRenderer.invoke('reports:getSupplierBalances'),
    getLowStockReport: () => ipcRenderer.invoke('reports:getLowStockReport'),
    getExpiryReport: (filters) => ipcRenderer.invoke('reports:getExpiryReport', filters),
  },

  // ── Dashboard ─────────────────────────────────────────────────────────────
  dashboard: {
    getStats: (period) => ipcRenderer.invoke('dashboard:getStats', period),
    getChartData: (period) => ipcRenderer.invoke('dashboard:getChartData', period),
    getRecentInvoices: () => ipcRenderer.invoke('dashboard:getRecentInvoices'),
    getTopMedicines: (period) => ipcRenderer.invoke('dashboard:getTopMedicines', period),
    getAlerts: () => ipcRenderer.invoke('dashboard:getAlerts'),
    getCategorySales: (period) => ipcRenderer.invoke('dashboard:getCategorySales', period),
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', key),
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
    setBulk: (data) => ipcRenderer.invoke('settings:setBulk', data),
  },

  // ── Backup ────────────────────────────────────────────────────────────────
  backup: {
    create: (destPath) => ipcRenderer.invoke('backup:create', destPath),
    restore: (srcPath) => ipcRenderer.invoke('backup:restore', srcPath),
    list: (dirPath) => ipcRenderer.invoke('backup:list', dirPath),
    getDefaultDir: () => ipcRenderer.invoke('backup:getDefaultDir'),
    getMongoConfig: () => ipcRenderer.invoke('backup:getMongoConfig'),
    testMongo: (uri, dbName) => ipcRenderer.invoke('backup:testMongo', uri, dbName),
    backupToAtlas: (options) => ipcRenderer.invoke('backup:backupToAtlas', options),
    restoreFromAtlas: (options) => ipcRenderer.invoke('backup:restoreFromAtlas', options),
    checkScheduledCloudBackup: () => ipcRenderer.invoke('backup:checkScheduledCloudBackup'),
  },

  // ── System ────────────────────────────────────────────────────────────────
  dialog: {
    openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
    saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),
    showMessage: (options) => ipcRenderer.invoke('dialog:showMessage', options),
  },
  shell: {
    openPath: (p) => ipcRenderer.invoke('shell:openPath', p),
  },
  app: {
    getPath: (name) => ipcRenderer.invoke('app:getPath', name),
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
  },
  print: {
    receipt: (html) => ipcRenderer.invoke('print:receipt', html),
  },

  // ── Auto-Updater ──────────────────────────────────────────────────────────
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.invoke('updater:download'),
    install: (isTransactionInProgress) => ipcRenderer.invoke('updater:install', isTransactionInProgress),
    getConfig: () => ipcRenderer.invoke('updater:getConfig'),
    setConfig: (config) => ipcRenderer.invoke('updater:setConfig', config),
    onStatus: (callback) => {
      const handler = (_, data) => callback(data);
      ipcRenderer.on('updater:status', handler);
      return () => ipcRenderer.removeListener('updater:status', handler);
    },
  },

  // ── Subscription & Licensing ──────────────────────────────────────────────
  license: {
    getStatus: () => ipcRenderer.invoke('license:getStatus'),
    getDeviceInfo: () => ipcRenderer.invoke('license:getDeviceInfo'),
    getPlans: () => ipcRenderer.invoke('license:getPlans'),
    activate: (data) => ipcRenderer.invoke('license:activate', data),
    requestRenewal: (data) => ipcRenderer.invoke('license:requestRenewal', data),
    checkRenewalStatus: () => ipcRenderer.invoke('license:checkRenewalStatus'),
    importOfflineLicense: (raw) => ipcRenderer.invoke('license:importOfflineLicense', raw),
    deactivate: () => ipcRenderer.invoke('license:deactivate'),
    setServerUrl: (url) => ipcRenderer.invoke('license:setServerUrl', url),
    getServerUrl: () => ipcRenderer.invoke('license:getServerUrl'),
  },
});
