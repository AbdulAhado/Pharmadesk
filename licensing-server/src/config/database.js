/**
 * PharmaDesk Licensing Database Connector
 * Connects to MongoDB Atlas when configured, with embedded JSON store fallback.
 */

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

let mongoClient = null;
let mongoDb = null;
let isUsingFallback = false;

const FALLBACK_DB_PATH = path.join(__dirname, '../../data/licensing_db.json');

// Default In-Memory / File-based Database State
let localDb = {
  customers: [],
  subscriptions: [],
  devices: [],
  plans: [
    { id: 'TRIAL', name: 'Free Trial', durationDays: 14, pricePKR: 0, maxDevices: 1, isEnabled: true, description: '14-Day Free Evaluation' },
    { id: 'MONTHLY', name: 'Monthly Plan', durationDays: 30, pricePKR: 2500, maxDevices: 1, isEnabled: true, description: 'Standard Monthly Pharmacy License' },
    { id: 'YEARLY', name: 'Yearly Plan (Recommended)', durationDays: 365, pricePKR: 24000, maxDevices: 2, isEnabled: true, description: 'Annual License with Priority Support' },
    { id: 'LIFETIME', name: 'Lifetime Membership', durationDays: null, pricePKR: 75000, maxDevices: 3, isEnabled: true, description: 'One-Time Payment, Lifetime Access' },
  ],
  renewalRequests: [],
  auditLogs: [],
  adminUsers: [],
  settings: {
    supportEmail: 'support@pharmadesk.pk',
    supportWhatsapp: '+92 300 1234567',
    paymentInstructions: 'Bank: Meezan Bank Ltd | Account: 010203040506 | Title: PharmaDesk Tech | IBAN: PK98MEZN00010203040506',
  },
};

function saveFallback() {
  try {
    const dir = path.dirname(FALLBACK_DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(localDb, null, 2), 'utf8');
  } catch (e) {
    console.warn('[DB] Fallback write error:', e.message);
  }
}

function loadFallback() {
  if (fs.existsSync(FALLBACK_DB_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(FALLBACK_DB_PATH, 'utf8'));
      localDb = { ...localDb, ...data };
    } catch (_) {}
  }
}

async function connectDatabase() {
  const uri = process.env.MONGODB_URI;

  if (uri && !uri.includes('<username>')) {
    try {
      console.log('[DB] Connecting to MongoDB Atlas...');
      mongoClient = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
      await mongoClient.connect();
      mongoDb = mongoClient.db('pharmadesk_licensing');
      console.log('[DB] Connected to MongoDB Atlas successfully.');
      isUsingFallback = false;
      return mongoDb;
    } catch (err) {
      console.warn('[DB] MongoDB Atlas connection failed:', err.message);
      console.log('[DB] Switching to embedded persistent JSON storage.');
    }
  } else {
    console.log('[DB] No valid MONGODB_URI found. Using embedded persistent JSON storage.');
  }

  isUsingFallback = true;
  loadFallback();
  saveFallback();
  return null;
}

/**
 * Universal Repository Wrapper providing unified API for MongoDB or Embedded Store.
 */
function getCollection(name) {
  if (!isUsingFallback && mongoDb) {
    const col = mongoDb.collection(name);
    return {
      find: async (query = {}) => col.find(query).toArray(),
      findOne: async (query) => col.findOne(query),
      insertOne: async (doc) => {
        const res = await col.insertOne(doc);
        return { ...doc, _id: res.insertedId };
      },
      updateOne: async (filter, update) => col.updateOne(filter, update),
      deleteOne: async (filter) => col.deleteOne(filter),
      countDocuments: async (query = {}) => col.countDocuments(query),
    };
  }

  // Fallback Collection implementation
  if (!localDb[name]) localDb[name] = [];
  const list = localDb[name];

  return {
    find: async (filter = {}) => {
      return list.filter(item => {
        for (const k of Object.keys(filter)) {
          if (item[k] !== filter[k]) return false;
        }
        return true;
      });
    },
    findOne: async (filter) => {
      return list.find(item => {
        for (const k of Object.keys(filter)) {
          if (item[k] !== filter[k]) return false;
        }
        return true;
      }) || null;
    },
    insertOne: async (doc) => {
      const record = { ...doc, _id: doc.id || Date.now().toString() };
      list.unshift(record);
      saveFallback();
      return record;
    },
    updateOne: async (filter, update) => {
      const item = list.find(it => {
        for (const k of Object.keys(filter)) {
          if (it[k] !== filter[k]) return false;
        }
        return true;
      });
      if (item && update.$set) {
        Object.assign(item, update.$set);
        saveFallback();
        return { modifiedCount: 1 };
      }
      return { modifiedCount: 0 };
    },
    deleteOne: async (filter) => {
      const idx = list.findIndex(it => {
        for (const k of Object.keys(filter)) {
          if (it[k] !== filter[k]) return false;
        }
        return true;
      });
      if (idx !== -1) {
        list.splice(idx, 1);
        saveFallback();
        return { deletedCount: 1 };
      }
      return { deletedCount: 0 };
    },
    countDocuments: async (filter = {}) => {
      return list.filter(item => {
        for (const k of Object.keys(filter)) {
          if (item[k] !== filter[k]) return false;
        }
        return true;
      }).length;
    },
  };
}

module.exports = {
  connectDatabase,
  getCollection,
  isFallback: () => isUsingFallback,
};

