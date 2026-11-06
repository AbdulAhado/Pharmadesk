/**
 * Admin Controller
 * Manages SaaS Dashboard operations, customer directory, manual license issuance, and device resets.
 */

const { getCollection } = require('../config/database');
const { issueSignedLicense } = require('../services/cryptoService');
const { JWT_SECRET } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Admin Login
 */
async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    const adminUsers = getCollection('adminUsers');

    const defaultUser = process.env.ADMIN_USERNAME;
    const defaultPass = process.env.ADMIN_PASSWORD;

    if (!defaultUser || !defaultPass) {
      return res.status(500).json({ success: false, message: 'Server admin credentials not configured in environment.' });
    }

    let user = await adminUsers.findOne({ username });

    // Fallback default admin if none seeded
    if (!user && username === defaultUser && password === defaultPass) {
      user = { id: 'admin-1', username, role: 'SUPER_ADMIN', name: 'Software Owner' };
    } else if (!user || user.password !== password) {
      return res.status(401).json({ success: false, message: 'Invalid admin username or password.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role || 'ADMIN' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      admin: { id: user.id, username: user.username, name: user.name || 'Admin', role: user.role },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Dashboard KPIs & Statistics
 */
async function getStats(req, res, next) {
  try {
    const subscriptions = getCollection('subscriptions');
    const customers = getCollection('customers');
    const devices = getCollection('devices');
    const renewalRequests = getCollection('renewalRequests');
    const auditLogs = getCollection('auditLogs');

    const allSubs = await subscriptions.find();
    const now = new Date().getTime();

    let activeCount = 0;
    let expiredCount = 0;
    let lifetimeCount = 0;
    let trialCount = 0;

    for (const sub of allSubs) {
      if (sub.isLifetime) {
        lifetimeCount++;
        activeCount++;
      } else if (sub.expiryDate) {
        if (new Date(sub.expiryDate).getTime() > now) {
          activeCount++;
        } else {
          expiredCount++;
        }
      } else {
        trialCount++;
      }
    }

    const totalCustomers = await customers.countDocuments();
    const totalDevices = await devices.countDocuments();
    const pendingRenewals = await renewalRequests.find({ status: 'PENDING' });
    const recentLogs = await auditLogs.find();

    return res.json({
      success: true,
      stats: {
        totalCustomers,
        totalSubscriptions: allSubs.length,
        activeSubscriptions: activeCount,
        expiredSubscriptions: expiredCount,
        lifetimeSubscriptions: lifetimeCount,
        freeTrialUsers: trialCount,
        registeredDevices: totalDevices,
        pendingRenewalsCount: pendingRenewals.length,
      },
      recentActivity: recentLogs.slice(0, 10),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Customers Directory
 */
async function getCustomers(req, res, next) {
  try {
    const customers = getCollection('customers');
    const list = await customers.find();
    return res.json({ success: true, customers: list });
  } catch (err) {
    next(err);
  }
}

async function createCustomer(req, res, next) {
  try {
    const { name, pharmacyName, phone, email, address, notes } = req.body;
    if (!name || !pharmacyName) {
      return res.status(400).json({ success: false, message: 'Customer name and Pharmacy name are required.' });
    }

    const customers = getCollection('customers');
    const newCust = {
      id: crypto.randomUUID(),
      name,
      pharmacyName,
      phone: phone || '',
      email: email || '',
      address: address || '',
      notes: notes || '',
      registeredAt: new Date().toISOString(),
      activeLicenses: [],
    };

    await customers.insertOne(newCust);
    return res.json({ success: true, customer: newCust, message: 'Customer added successfully.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Subscriptions List & Management
 */
async function getSubscriptions(req, res, next) {
  try {
    const subscriptions = getCollection('subscriptions');
    const list = await subscriptions.find();
    return res.json({ success: true, subscriptions: list });
  } catch (err) {
    next(err);
  }
}

/**
 * Manually issue a new signed license for a customer/pharmacy
 */
async function issueManualLicense(req, res, next) {
  try {
    const { pharmacyName, customerPhone, deviceId, plan, durationDays, isLifetime } = req.body;

    if (!pharmacyName || !deviceId) {
      return res.status(400).json({ success: false, message: 'Pharmacy name and Device ID are required.' });
    }

    const subscriptions = getCollection('subscriptions');
    const devices = getCollection('devices');
    const auditLogs = getCollection('auditLogs');

    const licenseKey = `PHD-${plan || 'YEARLY'}-${Date.now().toString().slice(-6)}`;
    const subId = crypto.randomUUID();

    const envelope = issueSignedLicense({
      licenseId: licenseKey,
      customerId: customerPhone || 'CUST-MANUAL',
      pharmacyName,
      deviceId,
      plan: plan || 'YEARLY',
      durationDays: isLifetime ? null : (parseInt(durationDays, 10) || 365),
      isLifetime: Boolean(isLifetime),
    });

    await subscriptions.insertOne({
      id: subId,
      licenseKey,
      customerId: customerPhone,
      pharmacyName,
      deviceId,
      plan: plan || 'YEARLY',
      durationDays: isLifetime ? null : (parseInt(durationDays, 10) || 365),
      isLifetime: Boolean(isLifetime),
      status: 'ACTIVE',
      expiryDate: envelope.payload.expiryDate,
      lastIssuedEnvelope: envelope,
      createdAt: new Date().toISOString(),
    });

    await devices.insertOne({
      id: crypto.randomUUID(),
      subscriptionId: subId,
      licenseKey,
      deviceId,
      pharmacyName,
      boundAt: new Date().toISOString(),
      isActive: true,
    });

    await auditLogs.insertOne({
      id: crypto.randomUUID(),
      eventType: 'MANUAL_LICENSE_ISSUED',
      licenseKey,
      deviceId,
      plan,
      details: `Admin issued manual license for ${pharmacyName} on ${deviceId}`,
      timestamp: new Date().toISOString(),
    });

    return res.json({
      success: true,
      message: 'License issued and signed successfully!',
      licenseKey,
      licenseEnvelope: envelope,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Extend an existing subscription by X days
 */
async function extendSubscription(req, res, next) {
  try {
    const { id } = req.params;
    const { additionalDays } = req.body;
    const days = parseInt(additionalDays, 10) || 30;

    const subscriptions = getCollection('subscriptions');
    const auditLogs = getCollection('auditLogs');

    const sub = await subscriptions.findOne({ id });
    if (!sub) return res.status(404).json({ success: false, message: 'Subscription not found.' });

    const currentExpiry = sub.expiryDate ? new Date(sub.expiryDate) : new Date();
    const baseTime = currentExpiry.getTime() > Date.now() ? currentExpiry.getTime() : Date.now();
    const newExpiry = new Date(baseTime + (days * 24 * 60 * 60 * 1000)).toISOString();

    // Re-issue signed license with updated expiry date
    const envelope = issueSignedLicense({
      licenseId: sub.licenseKey,
      customerId: sub.customerId,
      pharmacyName: sub.pharmacyName,
      deviceId: sub.deviceId || sub.activeDeviceId,
      plan: sub.plan,
      isLifetime: false,
      customExpiryDate: newExpiry,
    });

    await subscriptions.updateOne({ id }, {
      $set: {
        expiryDate: newExpiry,
        status: 'ACTIVE',
        lastIssuedEnvelope: envelope,
        updatedAt: new Date().toISOString(),
      }
    });

    await auditLogs.insertOne({
      id: crypto.randomUUID(),
      eventType: 'SUBSCRIPTION_EXTENDED',
      licenseKey: sub.licenseKey,
      details: `Extended by ${days} days until ${newExpiry.slice(0, 10)}`,
      timestamp: new Date().toISOString(),
    });

    return res.json({
      success: true,
      message: `Subscription extended by ${days} days!`,
      newExpiryDate: newExpiry,
      licenseEnvelope: envelope,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Devices List & Reset
 */
async function getDevices(req, res, next) {
  try {
    const devices = getCollection('devices');
    const list = await devices.find();
    return res.json({ success: true, devices: list });
  } catch (err) {
    next(err);
  }
}

async function resetDevice(req, res, next) {
  try {
    const { id } = req.params;
    const devices = getCollection('devices');
    const auditLogs = getCollection('auditLogs');

    const dev = await devices.findOne({ id });
    if (!dev) return res.status(404).json({ success: false, message: 'Device binding not found.' });

    await devices.updateOne({ id }, { $set: { isActive: false, unbindReason: 'Admin Reset' } });

    await auditLogs.insertOne({
      id: crypto.randomUUID(),
      eventType: 'DEVICE_RESET',
      deviceId: dev.deviceId,
      licenseKey: dev.licenseKey,
      details: `Admin reset device binding for ${dev.deviceId}`,
      timestamp: new Date().toISOString(),
    });

    return res.json({ success: true, message: 'Device unbind completed. License can now be activated on another PC.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Audit Logs
 */
async function getAuditLogs(req, res, next) {
  try {
    const auditLogs = getCollection('auditLogs');
    const list = await auditLogs.find();
    return res.json({ success: true, logs: list.reverse() });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  getStats,
  getCustomers,
  createCustomer,
  getSubscriptions,
  issueManualLicense,
  extendSubscription,
  getDevices,
  resetDevice,
  getAuditLogs,
};

