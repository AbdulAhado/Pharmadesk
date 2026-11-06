/**
 * Database Seed Script for PharmaDesk Licensing Server
 * Run: node scripts/seedAdmin.js
 */

require('dotenv').config();
const { connectDatabase, getCollection } = require('../src/config/database');

async function seed() {
  console.log('Seeding PharmaDesk Licensing Database...');
  await connectDatabase();

  const adminUsers = getCollection('adminUsers');
  const plans = getCollection('plans');
  const customers = getCollection('customers');

  // 1. Seed Admin User
  const adminEmail = process.env.ADMIN_USERNAME || 'admin@pharmadesk.pk';
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('❌ Error: ADMIN_PASSWORD environment variable is required to seed admin user.');
    process.exit(1);
  }

  const existingAdmin = await adminUsers.findOne({ username: adminEmail });
  if (!existingAdmin) {
    await adminUsers.insertOne({
      id: 'admin-super-1',
      username: adminEmail,
      password: adminPassword,
      name: 'PharmaDesk System Administrator',
      role: 'SUPER_ADMIN',
      createdAt: new Date().toISOString(),
    });
    console.log(`✓ Admin user created: ${adminEmail}`);
  } else {
    console.log(`✓ Admin user already exists: ${adminEmail}`);
  }

  // 2. Seed Default Plans
  const defaultPlans = [
    { id: 'TRIAL', name: 'Free Trial', durationDays: 14, pricePKR: 0, maxDevices: 1, isEnabled: true, description: '14-Day Free Evaluation' },
    { id: 'MONTHLY', name: 'Monthly Plan', durationDays: 30, pricePKR: 2500, maxDevices: 1, isEnabled: true, description: 'Standard Monthly Pharmacy License' },
    { id: 'YEARLY', name: 'Yearly Plan (Recommended)', durationDays: 365, pricePKR: 24000, maxDevices: 2, isEnabled: true, description: 'Annual License with Priority Support' },
    { id: 'LIFETIME', name: 'Lifetime Membership', durationDays: null, pricePKR: 75000, maxDevices: 3, isEnabled: true, description: 'One-Time Payment, Lifetime Access' },
  ];

  for (const p of defaultPlans) {
    const existing = await plans.findOne({ id: p.id });
    if (!existing) {
      await plans.insertOne(p);
      console.log(`✓ Seeded plan: ${p.name}`);
    }
  }

  // 3. Seed Sample Demonstration Customer
  const sampleCustomer = await customers.findOne({ phone: '0300-1234567' });
  if (!sampleCustomer) {
    await customers.insertOne({
      id: 'cust-demo-1',
      name: 'Dr. Tariq Mahmood',
      pharmacyName: 'Al-Shifa Medicos',
      phone: '0300-1234567',
      email: 'tariq@alshifapharmacy.pk',
      address: 'Main Commercial Area, Lahore',
      registeredAt: new Date().toISOString(),
      activeLicenses: ['PHD-YEARLY-DEMO1'],
    });
    console.log(`✓ Seeded sample customer: Al-Shifa Medicos`);
  }

  console.log('\nSeed process complete. Server is ready!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});

