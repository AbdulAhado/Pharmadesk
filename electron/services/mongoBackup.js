const { MongoClient } = require('mongodb');
const { getDb, getDbPath } = require('./database');
const fs = require('fs');

/**
 * MongoDB Atlas Cloud Backup Service
 * Designed for offline-first operation:
 * - Local desktop operations run 100% offline via local SQLite.
 * - Backups sync to MongoDB Atlas on a schedule (daily, weekly, monthly) or on-demand when online.
 * - Restores pull from MongoDB Atlas only when online and explicitly requested.
 */

async function getMongoConfig() {
  const db = getDb();
  const rows = db.prepare(`SELECT key, value FROM settings WHERE key IN (
    'mongo_uri', 'mongo_db_name', 'cloud_backup_frequency', 'cloud_auto_backup', 'cloud_last_backup_at'
  )`).all();
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
  return {
    uri: map.mongo_uri || '',
    dbName: map.mongo_db_name || 'pharmadesk_cloud',
    frequency: map.cloud_backup_frequency || 'daily', // 'daily' | 'weekly' | 'monthly' | 'manual'
    autoBackup: map.cloud_auto_backup ?? '1',
    lastBackupAt: map.cloud_last_backup_at || null,
  };
}

async function testConnection(customUri, customDbName) {
  const config = await getMongoConfig();
  const uri = customUri || config.uri;
  const dbName = customDbName || config.dbName || 'pharmadesk_cloud';

  if (!uri || !uri.trim()) {
    throw new Error('MongoDB Atlas Connection URI is required.');
  }

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 7000,
    connectTimeoutMS: 7000,
  });

  try {
    await client.connect();
    const adminDb = client.db(dbName);
    await adminDb.command({ ping: 1 });
    return {
      success: true,
      message: `Connected successfully to MongoDB Atlas database "${dbName}"!`
    };
  } finally {
    await client.close().catch(() => {});
  }
}

async function backupToAtlas(options = {}) {
  const config = await getMongoConfig();
  const uri = options.uri || config.uri;
  const dbName = options.dbName || config.dbName || 'pharmadesk_cloud';

  if (!uri || !uri.trim()) {
    throw new Error('MongoDB Atlas URI is not configured in Settings.');
  }

  const sqliteDb = getDb();
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });

  try {
    await client.connect();
    const atlasDb = client.db(dbName);

    // Read all tables from local SQLite
    const medicines = sqliteDb.prepare('SELECT * FROM medicines').all();
    const batches = sqliteDb.prepare('SELECT * FROM batches').all();
    const sales = sqliteDb.prepare('SELECT * FROM sales').all();
    const saleItems = sqliteDb.prepare('SELECT * FROM sale_items').all();
    const expenses = sqliteDb.prepare('SELECT * FROM expenses').all();
    const suppliers = sqliteDb.prepare('SELECT * FROM suppliers').all();
    const settings = sqliteDb.prepare('SELECT * FROM settings').all();

    // Helper: Bulk upsert documents into a collection
    async function syncCollection(collName, rows, idKey = 'id') {
      if (!rows || rows.length === 0) return 0;
      const coll = atlasDb.collection(collName);
      const operations = rows.map(row => ({
        updateOne: {
          filter: { [idKey]: row[idKey] },
          update: { $set: { ...row, _synced_at: new Date() } },
          upsert: true
        }
      }));
      if (operations.length > 0) {
        await coll.bulkWrite(operations, { ordered: false });
      }
      return rows.length;
    }

    const counts = {
      medicines: await syncCollection('medicines', medicines, 'id'),
      batches: await syncCollection('batches', batches, 'id'),
      sales: await syncCollection('sales', sales, 'id'),
      sale_items: await syncCollection('sale_items', saleItems, 'id'),
      expenses: await syncCollection('expenses', expenses, 'id'),
      suppliers: await syncCollection('suppliers', suppliers, 'id'),
      settings: await syncCollection('settings', settings, 'key'),
    };

    // Store backup history log in MongoDB Atlas
    const timestamp = new Date().toISOString();
    await atlasDb.collection('backup_history').insertOne({
      timestamp,
      backup_type: options.type || 'manual',
      counts,
      source: 'PharmaDesk Desktop'
    });

    // Update last backup timestamp in local SQLite
    sqliteDb.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES ('cloud_last_backup_at', ?)`).run(timestamp);
    sqliteDb.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES ('cloud_last_backup_status', ?)`).run('Success');

    return {
      success: true,
      timestamp,
      counts,
      message: `Successfully backed up ${medicines.length} medicines, ${batches.length} batches, ${sales.length} sales to MongoDB Atlas.`
    };
  } finally {
    await client.close().catch(() => {});
  }
}

async function restoreFromAtlas(options = {}) {
  const config = await getMongoConfig();
  const uri = options.uri || config.uri;
  const dbName = options.dbName || config.dbName || 'pharmadesk_cloud';

  if (!uri || !uri.trim()) {
    throw new Error('MongoDB Atlas URI is required to pull data.');
  }

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });

  try {
    await client.connect();
    const atlasDb = client.db(dbName);

    // Fetch collections from Atlas
    const cloudMedicines = await atlasDb.collection('medicines').find({}).toArray();
    const cloudBatches = await atlasDb.collection('batches').find({}).toArray();
    const cloudSales = await atlasDb.collection('sales').find({}).toArray();
    const cloudSaleItems = await atlasDb.collection('sale_items').find({}).toArray();
    const cloudExpenses = await atlasDb.collection('expenses').find({}).toArray();
    const cloudSuppliers = await atlasDb.collection('suppliers').find({}).toArray();

    if (cloudMedicines.length === 0 && cloudBatches.length === 0) {
      throw new Error(`No pharmacy data found in MongoDB Atlas database "${dbName}".`);
    }

    const sqliteDb = getDb();
    const dbPath = getDbPath();

    // Create a safety local backup of current SQLite database
    const safetyBackup = `${dbPath}.pre_cloud_restore_${Date.now()}.bak`;
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, safetyBackup);
    }

    // Restore inside transaction
    const restoreTx = sqliteDb.transaction(() => {
      // Restore medicines
      const insMed = sqliteDb.prepare(`
        INSERT OR REPLACE INTO medicines (
          id, name, generic_name, brand, manufacturer, strength, dosage_form,
          category, pack_size, default_purchase_price, default_selling_price,
          minimum_stock_level, preferred_supplier_id, is_active, created_at, updated_at
        ) VALUES (
          @id, @name, @generic_name, @brand, @manufacturer, @strength, @dosage_form,
          @category, @pack_size, @default_purchase_price, @default_selling_price,
          @minimum_stock_level, @preferred_supplier_id, @is_active, @created_at, @updated_at
        )
      `);
      for (const m of cloudMedicines) {
        const clean = { ...m };
        delete clean._id;
        delete clean._synced_at;
        insMed.run(clean);
      }

      // Restore batches
      const insBatch = sqliteDb.prepare(`
        INSERT OR REPLACE INTO batches (
          id, medicine_id, batch_number, expiry_date, purchase_cost,
          selling_price, received_quantity, available_quantity, supplier_id,
          created_at, updated_at
        ) VALUES (
          @id, @medicine_id, @batch_number, @expiry_date, @purchase_cost,
          @selling_price, @received_quantity, @available_quantity, @supplier_id,
          @created_at, @updated_at
        )
      `);
      for (const b of cloudBatches) {
        const clean = { ...b };
        delete clean._id;
        delete clean._synced_at;
        insBatch.run(clean);
      }

      // Restore suppliers
      const insSupp = sqliteDb.prepare(`
        INSERT OR REPLACE INTO suppliers (
          id, name, contact_person, phone, email, address, balance, created_at, updated_at
        ) VALUES (
          @id, @name, @contact_person, @phone, @email, @address, @balance, @created_at, @updated_at
        )
      `);
      for (const s of cloudSuppliers) {
        const clean = { ...s };
        delete clean._id;
        delete clean._synced_at;
        insSupp.run(clean);
      }

      // Restore sales
      const insSale = sqliteDb.prepare(`
        INSERT OR REPLACE INTO sales (
          id, invoice_number, sold_at, subtotal, discount_amount,
          tax_amount, total_amount, payment_method, amount_paid, change_given,
          customer_name, customer_phone, notes, status, created_at, updated_at
        ) VALUES (
          @id, @invoice_number, @sold_at, @subtotal, @discount_amount,
          @tax_amount, @total_amount, @payment_method, @amount_paid, @change_given,
          @customer_name, @customer_phone, @notes, @status, @created_at, @updated_at
        )
      `);
      for (const sl of cloudSales) {
        const clean = { ...sl };
        delete clean._id;
        delete clean._synced_at;
        insSale.run(clean);
      }

      // Restore sale items
      const insSi = sqliteDb.prepare(`
        INSERT OR REPLACE INTO sale_items (
          id, sale_id, medicine_id, batch_id, quantity, unit_selling_price,
          discount_amount, recorded_unit_cost, line_total, created_at
        ) VALUES (
          @id, @sale_id, @medicine_id, @batch_id, @quantity, @unit_selling_price,
          @discount_amount, @recorded_unit_cost, @line_total, @created_at
        )
      `);
      for (const si of cloudSaleItems) {
        const clean = { ...si };
        delete clean._id;
        delete clean._synced_at;
        insSi.run(clean);
      }

      // Restore expenses
      const insExp = sqliteDb.prepare(`
        INSERT OR REPLACE INTO expenses (
          id, category, amount, description, expense_date, payment_method,
          created_by, created_at, updated_at
        ) VALUES (
          @id, @category, @amount, @description, @expense_date, @payment_method,
          @created_by, @created_at, @updated_at
        )
      `);
      for (const e of cloudExpenses) {
        const clean = { ...e };
        delete clean._id;
        delete clean._synced_at;
        insExp.run(clean);
      }
    });

    restoreTx();

    return {
      success: true,
      restored: {
        medicines: cloudMedicines.length,
        batches: cloudBatches.length,
        sales: cloudSales.length,
        saleItems: cloudSaleItems.length,
        expenses: cloudExpenses.length,
        suppliers: cloudSuppliers.length
      },
      safetyBackup
    };
  } finally {
    await client.close().catch(() => {});
  }
}

async function checkScheduledCloudBackup() {
  try {
    const config = await getMongoConfig();
    if (!config.uri || config.autoBackup === '0' || config.frequency === 'manual') {
      return { skipped: true, reason: 'Auto backup disabled or manual only.' };
    }

    const intervals = {
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000,
      monthly: 30 * 24 * 60 * 60 * 1000
    };

    const requiredInterval = intervals[config.frequency] || intervals.daily;
    const lastBackupTime = config.lastBackupAt ? new Date(config.lastBackupAt).getTime() : 0;
    const now = Date.now();

    if (now - lastBackupTime >= requiredInterval) {
      console.log(`[CloudBackup] Triggering automated ${config.frequency} backup to MongoDB Atlas...`);
      const result = await backupToAtlas({ type: `scheduled_${config.frequency}` });
      return { triggered: true, result };
    }

    return { skipped: true, reason: 'Interval not yet reached.' };
  } catch (err) {
    console.error('[CloudBackup] Scheduled backup check skipped or failed:', err.message);
    return { error: err.message };
  }
}

module.exports = {
  getMongoConfig,
  testConnection,
  backupToAtlas,
  restoreFromAtlas,
  checkScheduledCloudBackup
};

