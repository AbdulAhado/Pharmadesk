/**
 * PharmaDesk Database Service
 * Manages SQLite connection, schema migrations, and provides the DB instance.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let db = null;

function getDbPath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'pharmadesk.db');
}

function getDb() {
  if (!db) throw new Error('Database not initialized. Call initialize() first.');
  return db;
}

function initialize() {
  const dbPath = getDbPath();
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  console.log('[DB] Opening database at:', dbPath);

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -64000'); // 64MB cache

  runMigrations();
  seedDefaultSettings();
  seedSampleData();
  console.log('[DB] Database initialized successfully.');
  return db;
}

// ─── Schema Migrations ───────────────────────────────────────────────────────

const migrations = [
  {
    version: 1,
    description: 'Initial schema',
    up: (db) => {
      // Settings
      db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
          key   TEXT PRIMARY KEY,
          value TEXT
        );
      `);

      // Schema migrations tracker
      db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version    INTEGER PRIMARY KEY,
          applied_at TEXT DEFAULT (datetime('now'))
        );
      `);

      // Suppliers
      db.exec(`
        CREATE TABLE IF NOT EXISTS suppliers (
          id              TEXT PRIMARY KEY,
          name            TEXT NOT NULL,
          phone           TEXT,
          address         TEXT,
          opening_balance REAL DEFAULT 0,
          is_active       INTEGER DEFAULT 1,
          created_at      TEXT DEFAULT (datetime('now')),
          updated_at      TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
      `);

      // Medicines
      db.exec(`
        CREATE TABLE IF NOT EXISTS medicines (
          id                    TEXT PRIMARY KEY,
          name                  TEXT NOT NULL,
          generic_name          TEXT,
          brand                 TEXT,
          manufacturer          TEXT,
          strength              TEXT,
          dosage_form           TEXT,
          category              TEXT,
          pack_size             INTEGER DEFAULT 1,
          default_purchase_price REAL DEFAULT 0,
          default_selling_price  REAL DEFAULT 0,
          minimum_stock_level   INTEGER DEFAULT 10,
          preferred_supplier_id TEXT REFERENCES suppliers(id),
          is_active             INTEGER DEFAULT 1,
          created_at            TEXT DEFAULT (datetime('now')),
          updated_at            TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_medicines_name     ON medicines(name);
        CREATE INDEX IF NOT EXISTS idx_medicines_brand    ON medicines(brand);
        CREATE INDEX IF NOT EXISTS idx_medicines_category ON medicines(category);
        CREATE INDEX IF NOT EXISTS idx_medicines_active   ON medicines(is_active);
      `);

      // Barcodes
      db.exec(`
        CREATE TABLE IF NOT EXISTS barcodes (
          id              TEXT PRIMARY KEY,
          medicine_id     TEXT NOT NULL REFERENCES medicines(id),
          barcode_value   TEXT NOT NULL UNIQUE,
          unit_type       TEXT DEFAULT 'PACK',
          unit_multiplier INTEGER DEFAULT 1,
          created_at      TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_barcodes_value      ON barcodes(barcode_value);
        CREATE INDEX IF NOT EXISTS idx_barcodes_medicine   ON barcodes(medicine_id);
      `);

      // Batches
      db.exec(`
        CREATE TABLE IF NOT EXISTS batches (
          id                  TEXT PRIMARY KEY,
          medicine_id         TEXT NOT NULL REFERENCES medicines(id),
          batch_number        TEXT NOT NULL,
          expiry_date         TEXT NOT NULL,
          purchase_cost       REAL NOT NULL DEFAULT 0,
          selling_price       REAL NOT NULL DEFAULT 0,
          received_quantity   INTEGER NOT NULL DEFAULT 0,
          available_quantity  INTEGER NOT NULL DEFAULT 0,
          supplier_id         TEXT REFERENCES suppliers(id),
          created_at          TEXT DEFAULT (datetime('now')),
          updated_at          TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_batches_medicine    ON batches(medicine_id);
        CREATE INDEX IF NOT EXISTS idx_batches_expiry      ON batches(expiry_date);
        CREATE INDEX IF NOT EXISTS idx_batches_available   ON batches(available_quantity);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_batches_unique ON batches(medicine_id, batch_number);
      `);

      // Stock movements
      db.exec(`
        CREATE TABLE IF NOT EXISTS stock_movements (
          id             TEXT PRIMARY KEY,
          medicine_id    TEXT NOT NULL REFERENCES medicines(id),
          batch_id       TEXT NOT NULL REFERENCES batches(id),
          movement_type  TEXT NOT NULL CHECK(movement_type IN (
            'PURCHASE','SALE','ADJUSTMENT_IN','ADJUSTMENT_OUT',
            'DAMAGE','EXPIRY_WRITEOFF','OPENING'
          )),
          quantity_change INTEGER NOT NULL,
          unit_cost      REAL,
          reference_type TEXT,
          reference_id   TEXT,
          reason         TEXT,
          created_at     TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_movements_medicine ON stock_movements(medicine_id);
        CREATE INDEX IF NOT EXISTS idx_movements_batch    ON stock_movements(batch_id);
        CREATE INDEX IF NOT EXISTS idx_movements_type     ON stock_movements(movement_type);
        CREATE INDEX IF NOT EXISTS idx_movements_date     ON stock_movements(created_at);
      `);

      // Purchases
      db.exec(`
        CREATE TABLE IF NOT EXISTS purchases (
          id                 TEXT PRIMARY KEY,
          invoice_number     TEXT NOT NULL UNIQUE,
          supplier_id        TEXT REFERENCES suppliers(id),
          purchase_date      TEXT NOT NULL,
          subtotal           REAL DEFAULT 0,
          discount           REAL DEFAULT 0,
          additional_costs   REAL DEFAULT 0,
          total_amount       REAL DEFAULT 0,
          paid_amount        REAL DEFAULT 0,
          outstanding_amount REAL DEFAULT 0,
          payment_status     TEXT DEFAULT 'UNPAID' CHECK(payment_status IN ('PAID','PARTIAL','UNPAID')),
          notes              TEXT,
          created_at         TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
        CREATE INDEX IF NOT EXISTS idx_purchases_date     ON purchases(purchase_date);
      `);

      // Purchase items
      db.exec(`
        CREATE TABLE IF NOT EXISTS purchase_items (
          id                  TEXT PRIMARY KEY,
          purchase_id         TEXT NOT NULL REFERENCES purchases(id),
          medicine_id         TEXT NOT NULL REFERENCES medicines(id),
          batch_id            TEXT NOT NULL REFERENCES batches(id),
          quantity            INTEGER NOT NULL,
          unit_purchase_cost  REAL NOT NULL,
          unit_selling_price  REAL NOT NULL,
          line_total          REAL NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase  ON purchase_items(purchase_id);
        CREATE INDEX IF NOT EXISTS idx_purchase_items_medicine  ON purchase_items(medicine_id);
      `);

      // Supplier payments
      db.exec(`
        CREATE TABLE IF NOT EXISTS supplier_payments (
          id           TEXT PRIMARY KEY,
          supplier_id  TEXT NOT NULL REFERENCES suppliers(id),
          purchase_id  TEXT REFERENCES purchases(id),
          amount       REAL NOT NULL,
          payment_date TEXT NOT NULL,
          method       TEXT DEFAULT 'CASH',
          notes        TEXT,
          created_at   TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_sp_supplier ON supplier_payments(supplier_id);
      `);

      // Sales
      db.exec(`
        CREATE TABLE IF NOT EXISTS sales (
          id              TEXT PRIMARY KEY,
          invoice_number  TEXT NOT NULL UNIQUE,
          sold_at         TEXT DEFAULT (datetime('now')),
          subtotal        REAL DEFAULT 0,
          discount_amount REAL DEFAULT 0,
          total_amount    REAL DEFAULT 0,
          payment_method  TEXT DEFAULT 'CASH',
          amount_paid     REAL DEFAULT 0,
          change_given    REAL DEFAULT 0,
          status          TEXT DEFAULT 'COMPLETED',
          created_at      TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_sales_date    ON sales(sold_at);
        CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales(invoice_number);
      `);

      // Sale items
      db.exec(`
        CREATE TABLE IF NOT EXISTS sale_items (
          id                  TEXT PRIMARY KEY,
          sale_id             TEXT NOT NULL REFERENCES sales(id),
          medicine_id         TEXT NOT NULL REFERENCES medicines(id),
          batch_id            TEXT NOT NULL REFERENCES batches(id),
          quantity            INTEGER NOT NULL,
          unit_selling_price  REAL NOT NULL,
          discount_amount     REAL DEFAULT 0,
          recorded_unit_cost  REAL NOT NULL,
          line_total          REAL NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_sale_items_sale     ON sale_items(sale_id);
        CREATE INDEX IF NOT EXISTS idx_sale_items_medicine ON sale_items(medicine_id);
      `);

      // Expenses
      db.exec(`
        CREATE TABLE IF NOT EXISTS expenses (
          id              TEXT PRIMARY KEY,
          category        TEXT NOT NULL,
          description     TEXT,
          amount          REAL NOT NULL,
          payment_method  TEXT DEFAULT 'CASH',
          expense_date    TEXT NOT NULL,
          created_at      TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_expenses_date     ON expenses(expense_date);
        CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
      `);

      // Cash sessions
      db.exec(`
        CREATE TABLE IF NOT EXISTS cash_sessions (
          id                   TEXT PRIMARY KEY,
          opened_at            TEXT NOT NULL,
          opening_cash         REAL DEFAULT 0,
          closed_at            TEXT,
          expected_closing_cash REAL,
          counted_closing_cash  REAL,
          cash_difference       REAL,
          status               TEXT DEFAULT 'OPEN' CHECK(status IN ('OPEN','CLOSED'))
        );
      `);

      // Sync outbox
      db.exec(`
        CREATE TABLE IF NOT EXISTS sync_outbox (
          id             TEXT PRIMARY KEY,
          event_id       TEXT NOT NULL UNIQUE,
          entity_type    TEXT NOT NULL,
          entity_id      TEXT NOT NULL,
          operation_type TEXT NOT NULL,
          payload        TEXT NOT NULL,
          created_at     TEXT DEFAULT (datetime('now')),
          attempts       INTEGER DEFAULT 0,
          last_error     TEXT,
          sync_status    TEXT DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING','SYNCED','FAILED'))
        );
        CREATE INDEX IF NOT EXISTS idx_outbox_status ON sync_outbox(sync_status);
      `);

      // Sync state
      db.exec(`
        CREATE TABLE IF NOT EXISTS sync_state (
          id                   INTEGER PRIMARY KEY CHECK(id = 1),
          last_successful_sync TEXT,
          last_server_cursor   TEXT,
          last_error           TEXT
        );
        INSERT OR IGNORE INTO sync_state(id) VALUES(1);
      `);
    }
  },
  {
    version: 2,
    description: 'Add shelf location, pharmacy regulations, sales returns, customer details, and supplier return claims',
    up: (db) => {
      const safeAddColumn = (table, colName, colDef) => {
        const info = db.prepare(`PRAGMA table_info(${table})`).all();
        if (!info.some(c => c.name === colName)) {
          db.exec(`ALTER TABLE ${table} ADD COLUMN ${colName} ${colDef}`);
        }
      };

      // 1. Medicines enhancements
      safeAddColumn('medicines', 'rack_shelf', 'TEXT');
      safeAddColumn('medicines', 'reorder_level', 'INTEGER DEFAULT 20');
      safeAddColumn('medicines', 'requires_prescription', 'INTEGER DEFAULT 0');
      safeAddColumn('medicines', 'is_narcotic', 'INTEGER DEFAULT 0');
      safeAddColumn('medicines', 'unit_of_measure', "TEXT DEFAULT 'Pcs'");

      // 2. Sales enhancements (Customer details & cash session link)
      safeAddColumn('sales', 'customer_name', "TEXT DEFAULT 'Walk-in'");
      safeAddColumn('sales', 'customer_phone', 'TEXT');
      safeAddColumn('sales', 'tax_amount', 'REAL DEFAULT 0');
      safeAddColumn('sales', 'discount_rate', 'REAL DEFAULT 0');
      safeAddColumn('sales', 'notes', 'TEXT');
      safeAddColumn('sales', 'cash_session_id', 'TEXT');

      // 3. Purchases enhancements (Distributor invoice reference)
      safeAddColumn('purchases', 'supplier_invoice_no', 'TEXT');

      // 4. Sales Returns & Refunds tables
      db.exec(`
        CREATE TABLE IF NOT EXISTS sale_returns (
          id                  TEXT PRIMARY KEY,
          sale_id             TEXT REFERENCES sales(id),
          invoice_number      TEXT NOT NULL,
          returned_at         TEXT DEFAULT (datetime('now')),
          total_refund_amount REAL NOT NULL DEFAULT 0,
          payment_method      TEXT DEFAULT 'CASH',
          reason              TEXT,
          cash_session_id     TEXT,
          created_at          TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_returns_sale ON sale_returns(sale_id);
        CREATE INDEX IF NOT EXISTS idx_returns_date ON sale_returns(returned_at);

        CREATE TABLE IF NOT EXISTS sale_return_items (
          id                 TEXT PRIMARY KEY,
          return_id          TEXT NOT NULL REFERENCES sale_returns(id),
          sale_item_id       TEXT REFERENCES sale_items(id),
          medicine_id        TEXT NOT NULL REFERENCES medicines(id),
          batch_id           TEXT NOT NULL REFERENCES batches(id),
          quantity           INTEGER NOT NULL,
          refund_unit_price  REAL NOT NULL,
          line_total         REAL NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_sri_return ON sale_return_items(return_id);
        CREATE INDEX IF NOT EXISTS idx_sri_batch  ON sale_return_items(batch_id);

        CREATE TABLE IF NOT EXISTS supplier_returns (
          id             TEXT PRIMARY KEY,
          supplier_id    TEXT NOT NULL REFERENCES suppliers(id),
          batch_id       TEXT NOT NULL REFERENCES batches(id),
          medicine_id    TEXT NOT NULL REFERENCES medicines(id),
          quantity       INTEGER NOT NULL,
          unit_cost      REAL NOT NULL DEFAULT 0,
          total_credit   REAL NOT NULL DEFAULT 0,
          claim_reason   TEXT DEFAULT 'EXPIRED',
          status         TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
          notes          TEXT,
          returned_at    TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_sup_ret_supplier ON supplier_returns(supplier_id);
      `);
    }
  },
  {
    version: 3,
    description: 'Add Subscription, Free Trial, Device Licensing, and Anti-Rollback Checkpoints schema',
    up: (db) => {
      // License State (singleton active license record)
      db.exec(`
        CREATE TABLE IF NOT EXISTS license_state (
          id                INTEGER PRIMARY KEY CHECK(id = 1),
          license_id        TEXT,
          customer_id       TEXT,
          pharmacy_name     TEXT,
          device_id         TEXT,
          plan              TEXT,
          activation_date   TEXT,
          expiry_date       TEXT,
          is_lifetime       INTEGER DEFAULT 0,
          status            TEXT DEFAULT 'INACTIVE' CHECK(status IN ('TRIAL', 'ACTIVE', 'WARNING', 'EXPIRED', 'INACTIVE', 'REVOKED')),
          signature         TEXT,
          raw_payload       TEXT,
          last_validated_at TEXT,
          updated_at        TEXT DEFAULT (datetime('now'))
        );
        INSERT OR IGNORE INTO license_state (id, status) VALUES (1, 'INACTIVE');
      `);

      // Free Trial State
      db.exec(`
        CREATE TABLE IF NOT EXISTS trial_state (
          id             INTEGER PRIMARY KEY CHECK(id = 1),
          device_id      TEXT NOT NULL,
          started_at     TEXT NOT NULL,
          expires_at     TEXT NOT NULL,
          duration_days  INTEGER DEFAULT 14,
          status         TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'EXPIRED')),
          salt_hash      TEXT,
          updated_at     TEXT DEFAULT (datetime('now'))
        );
      `);

      // Anti-clock rollback checkpoints
      db.exec(`
        CREATE TABLE IF NOT EXISTS time_checkpoints (
          id             INTEGER PRIMARY KEY AUTOINCREMENT,
          checkpoint_utc TEXT NOT NULL,
          source         TEXT DEFAULT 'SYSTEM_CHECK',
          created_at     TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_tcp_time ON time_checkpoints(checkpoint_utc);
      `);

      // License audit history
      db.exec(`
        CREATE TABLE IF NOT EXISTS license_history (
          id         TEXT PRIMARY KEY,
          license_id TEXT,
          plan       TEXT,
          event_type TEXT NOT NULL,
          details    TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_lh_time ON license_history(created_at);
      `);

      // Local renewal requests tracker
      db.exec(`
        CREATE TABLE IF NOT EXISTS renewal_requests (
          id                TEXT PRIMARY KEY,
          request_number    TEXT NOT NULL UNIQUE,
          customer_id       TEXT,
          pharmacy_name     TEXT,
          device_id         TEXT NOT NULL,
          requested_plan    TEXT NOT NULL,
          payment_reference TEXT,
          status            TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
          admin_notes       TEXT,
          created_at        TEXT DEFAULT (datetime('now')),
          updated_at        TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_rr_status ON renewal_requests(status);
      `);
    }
  }
];

function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const applied = db.prepare('SELECT version FROM schema_migrations').all().map(r => r.version);

  for (const migration of migrations) {
    if (!applied.includes(migration.version)) {
      console.log(`[DB] Applying migration v${migration.version}: ${migration.description}`);
      const applyMigration = db.transaction(() => {
        migration.up(db);
        db.prepare('INSERT INTO schema_migrations(version) VALUES(?)').run(migration.version);
      });
      applyMigration();
      console.log(`[DB] Migration v${migration.version} applied.`);
    }
  }
}

function seedDefaultSettings() {
  const defaults = {
    pharmacy_name: 'My Pharmacy',
    pharmacy_phone: '',
    pharmacy_address: '',
    pharmacy_city: '',
    currency_symbol: 'PKR',
    receipt_footer: 'Thank you for your visit!',
    low_stock_threshold: '10',
    expiry_warning_days: '30',
    expiry_critical_days: '10',
    backup_auto: 'false',
    backup_interval_days: '7',
    backup_location: '',
    cloud_sync_enabled: 'false',
    cloud_api_url: '',
    cloud_api_key: '',
    invoice_prefix: 'INV',
    invoice_counter: '1000',
    purchase_prefix: 'PO',
    purchase_counter: '1000',
  };

  const insert = db.prepare('INSERT OR IGNORE INTO settings(key, value) VALUES(?, ?)');
  const insertAll = db.transaction((entries) => {
    for (const [key, value] of entries) insert.run(key, value);
  });
  insertAll(Object.entries(defaults));
}

function seedSampleData() {
  const count = db.prepare('SELECT COUNT(*) as count FROM medicines').get().count;
  if (count > 0) return;

  console.log('[DB] Seeding initial sample medicines, batches, and suppliers...');
  const { v4: uuidv4 } = require('uuid');

  const supId1 = uuidv4();
  const supId2 = uuidv4();
  db.prepare(`
    INSERT INTO suppliers (id, name, phone, address, opening_balance)
    VALUES (?, ?, ?, ?, ?)
  `).run(supId1, 'Allied Pharmaceuticals Ltd', '0300-1122334', '14 Industrial Estate, Lahore', 0);

  db.prepare(`
    INSERT INTO suppliers (id, name, phone, address, opening_balance)
    VALUES (?, ?, ?, ?, ?)
  `).run(supId2, 'Premier Drug Distributors', '0321-9988776', 'Circular Road, Lahore', 0);

  const sampleMeds = [
    {
      id: uuidv4(),
      name: 'Panadol Extra 500mg',
      generic_name: 'Paracetamol + Caffeine',
      brand: 'Panadol',
      manufacturer: 'GSK Pakistan',
      strength: '500mg/65mg',
      dosage_form: 'Tablet',
      category: 'Analgesics',
      pack_size: 20,
      rack: 'Rack A-1',
      barcode: '896400010001',
      cost: 4.5,
      sale: 6.0,
      batches: [
        { batch_number: 'B2401', expiry: '2027-06-30', stock: 150 },
        { batch_number: 'B2390', expiry: '2026-12-15', stock: 50 }
      ]
    },
    {
      id: uuidv4(),
      name: 'Augmentin 625mg',
      generic_name: 'Amoxicillin + Clavulanic Acid',
      brand: 'Augmentin',
      manufacturer: 'GSK Pakistan',
      strength: '625mg',
      dosage_form: 'Tablet',
      category: 'Antibiotics',
      pack_size: 14,
      rack: 'Rack B-3',
      barcode: '896400020002',
      cost: 32.0,
      sale: 42.0,
      batches: [
        { batch_number: 'AUG-98', expiry: '2026-11-20', stock: 80 }
      ]
    },
    {
      id: uuidv4(),
      name: 'Brufen 400mg',
      generic_name: 'Ibuprofen',
      brand: 'Brufen',
      manufacturer: 'Abbott',
      strength: '400mg',
      dosage_form: 'Tablet',
      category: 'NSAID / Anti-inflammatory',
      pack_size: 30,
      rack: 'Rack A-2',
      barcode: '896400030003',
      cost: 7.0,
      sale: 9.5,
      batches: [
        { batch_number: 'BR-110', expiry: '2027-02-28', stock: 120 }
      ]
    },
    {
      id: uuidv4(),
      name: 'Cac-1000 Plus Effervescent',
      generic_name: 'Calcium + Vitamin C + D3 + B6',
      brand: 'Cac-1000',
      manufacturer: 'GSK Consumer',
      strength: '1000mg',
      dosage_form: 'Tablet',
      category: 'Vitamins & Minerals',
      pack_size: 10,
      rack: 'Rack C-1',
      barcode: '896400040004',
      cost: 25.0,
      sale: 35.0,
      batches: [
        { batch_number: 'CAC-45', expiry: '2026-10-15', stock: 40 }
      ]
    },
    {
      id: uuidv4(),
      name: 'Risek 20mg Capsule',
      generic_name: 'Omeprazole',
      brand: 'Risek',
      manufacturer: 'Getz Pharma',
      strength: '20mg',
      dosage_form: 'Capsule',
      category: 'Gastrointestinal',
      pack_size: 14,
      rack: 'Rack D-2',
      barcode: '896400050005',
      cost: 18.0,
      sale: 24.0,
      batches: [
        { batch_number: 'RS-772', expiry: '2027-08-31', stock: 100 }
      ]
    }
  ];

  const insertMed = db.prepare(`
    INSERT INTO medicines (id, name, generic_name, brand, manufacturer, strength, dosage_form, category, pack_size, default_purchase_price, default_selling_price, minimum_stock_level, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const insertBarcode = db.prepare(`
    INSERT INTO medicine_barcodes (id, medicine_id, barcode, is_primary)
    VALUES (?, ?, ?, 1)
  `);

  const insertBatch = db.prepare(`
    INSERT INTO batches (id, medicine_id, batch_number, expiry_date, purchase_price, sale_price, initial_stock, current_stock, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
  `);

  const insertMovement = db.prepare(`
    INSERT INTO stock_movements (id, medicine_id, batch_id, movement_type, quantity, balance_after, reference_number, notes)
    VALUES (?, ?, ?, 'PURCHASE', ?, ?, 'INITIAL-SEED', 'Opening inventory batch')
  `);

  const seedTx = db.transaction(() => {
    for (const med of sampleMeds) {
      insertMed.run(
        med.id, med.name, med.generic_name, med.brand, med.manufacturer,
        med.strength, med.dosage_form, med.category, med.pack_size,
        med.cost, med.sale, 15
      );
      insertBarcode.run(uuidv4(), med.id, med.barcode);

      for (const b of med.batches) {
        const batchId = uuidv4();
        insertBatch.run(
          batchId, med.id, b.batch_number, b.expiry, med.cost, med.sale, b.stock, b.stock
        );
        insertMovement.run(
          uuidv4(), med.id, batchId, b.stock, b.stock
        );
      }
    }
  });

  seedTx();
  console.log('[DB] Sample seed complete.');
}

function generateInvoiceNumber() {
  const db = getDb();
  const prefix = db.prepare("SELECT value FROM settings WHERE key='invoice_prefix'").get()?.value || 'INV';
  const counter = parseInt(db.prepare("SELECT value FROM settings WHERE key='invoice_counter'").get()?.value || '1000') + 1;
  db.prepare("UPDATE settings SET value=? WHERE key='invoice_counter'").run(String(counter));
  return `${prefix}-${String(counter).padStart(6, '0')}`;
}

function generatePurchaseNumber() {
  const db = getDb();
  const prefix = db.prepare("SELECT value FROM settings WHERE key='purchase_prefix'").get()?.value || 'PO';
  const counter = parseInt(db.prepare("SELECT value FROM settings WHERE key='purchase_counter'").get()?.value || '1000') + 1;
  db.prepare("UPDATE settings SET value=? WHERE key='purchase_counter'").run(String(counter));
  return `${prefix}-${String(counter).padStart(6, '0')}`;
}

module.exports = {
  initialize,
  getDb,
  getDbPath,
  generateInvoiceNumber,
  generatePurchaseNumber,
};
