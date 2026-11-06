
import { MongoClient, Db, Collection, Document } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI!;
const DB_NAME = 'pharmadesk_licensing';

if (!MONGODB_URI) {
  throw new Error('[MongoDB] MONGODB_URI environment variable is not set');
}

let cached: { client: MongoClient; db: Db } | null = null;

export async function connectDB(): Promise<Db> {
  // Reuse existing connection
  if (cached) {
    console.log('[MongoDB] Using existing database connection');
    return cached.db;
  }

  console.log('========================================');
  console.log('[MongoDB] Starting database connection...');
  console.log(`[MongoDB] Database: ${DB_NAME}`);
  console.log(`[MongoDB] Node.js: ${process.version}`);
  console.log(`[MongoDB] OpenSSL: ${process.versions.openssl}`);
  console.log('========================================');

  const startTime = Date.now();

  const client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 8000,
    tls: true,
  });

  try {
    await client.connect();

    const db = client.db(DB_NAME);

    // Verify database connection with ping
    await db.command({ ping: 1 });

    cached = { client, db };

    const duration = Date.now() - startTime;

    console.log('========================================');
    console.log('[MongoDB] CONNECTION SUCCESSFUL');
    console.log(`[MongoDB] Database: ${DB_NAME}`);
    console.log(`[MongoDB] Connection time: ${duration}ms`);
    console.log('[MongoDB] Ping: Successful');
    console.log('========================================');

    return db;

  } catch (error: unknown) {
    const duration = Date.now() - startTime;

    console.error('========================================');
    console.error('[MongoDB] CONNECTION FAILED');
    console.error(`[MongoDB] Database: ${DB_NAME}`);
    console.error(`[MongoDB] Failed after: ${duration}ms`);

    if (error instanceof Error) {
      console.error('[MongoDB] Error Name:', error.name);
      console.error('[MongoDB] Error Message:', error.message);
      console.error('[MongoDB] Error Stack:', error.stack);
      console.error('[MongoDB] Full Error:', error);
    } else {
      console.error('[MongoDB] Unknown Error:', error);
    }

    console.error('========================================');

    await client.close().catch((closeError) => {
      console.error('[MongoDB] Client cleanup failed:', closeError);
    });

    throw error;
  }
}

export async function getCollection<T extends Document = Document>(
  name: string
): Promise<Collection<T>> {
  const db = await connectDB();
  return db.collection<T>(name);
}

export const COLLECTIONS = {
  CUSTOMERS: 'customers',
  SUBSCRIPTIONS: 'subscriptions',
  DEVICES: 'devices',
  PLANS: 'plans',
  RENEWAL_REQUESTS: 'renewalRequests',
  AUDIT_LOGS: 'auditLogs',
  ADMIN_USERS: 'adminUsers',
  SETTINGS: 'settings',
} as const;
