/**
 * License Controller
 * Handles activation, validation, online renewal, and digital license issuance.
 */

const { getCollection } = require('../config/database');
const { issueSignedLicense } = require('../services/cryptoService');
const crypto = require('crypto');

/**
 * POST /api/v1/licenses/activate
 * Client sends license key + hardware device ID.
 */
async function activate(req, res, next) {
  try {
    const { licenseKey, deviceId, pharmacyName, customerEmail, customerPhone } = req.body;

    if (!licenseKey || !deviceId) {
      return res.status(400).json({ success: false, message: 'License key and Device ID are required.' });
    }

    const subscriptions = getCollection('subscriptions');
    const devices = getCollection('devices');
    const plans = getCollection('plans');
    const auditLogs = getCollection('auditLogs');
    const customers = getCollection('customers');

    // 1. Look for pre-created license key in subscriptions
    let sub = await subscriptions.findOne({ licenseKey: licenseKey.trim().toUpperCase() });

    // If license key not found, check if it's a standard pattern (or create a custom/demo entry)
    if (!sub) {
      // Check if key is formatted like PHD-YEARLY-... or PHD-MONTHLY-...
      const upper = licenseKey.trim().toUpperCase();
      let matchedPlanId = 'MONTHLY';
      if (upper.includes('YEARLY')) matchedPlanId = 'YEARLY';
      else if (upper.includes('LIFETIME')) matchedPlanId = 'LIFETIME';
      else if (upper.includes('TRIAL')) matchedPlanId = 'TRIAL';

      const planDoc = await plans.findOne({ id: matchedPlanId });
      const planDuration = planDoc ? planDoc.durationDays : 30;

      sub = {
        id: crypto.randomUUID(),
        licenseKey: upper,
        plan: matchedPlanId,
        durationDays: planDuration,
        isLifetime: matchedPlanId === 'LIFETIME',
        status: 'ACTIVE',
        pharmacyName: pharmacyName || 'PharmaDesk Store',
        customerEmail: customerEmail || null,
        customerPhone: customerPhone || null,
        maxDevices: planDoc?.maxDevices || 2,
        createdAt: new Date().toISOString(),
      };
      await subscriptions.insertOne(sub);
    }

    if (sub.status === 'REVOKED') {
      return res.status(403).json({ success: false, message: 'This license has been revoked by administration.' });
    }

    // 2. Check Device Binding Limit
    const boundDevices = await devices.find({ subscriptionId: sub.id, isActive: true });
    const isAlreadyBound = boundDevices.some(d => d.deviceId === deviceId);

    if (!isAlreadyBound && boundDevices.length >= (sub.maxDevices || 1)) {
      return res.status(403).json({
        success: false,
        message: `Device limit exceeded (${sub.maxDevices} device(s) max). Please contact admin to reset or unbind your old computer.`,
      });
    }

    // Register / update device record
    if (!isAlreadyBound) {
      await devices.insertOne({
        id: crypto.randomUUID(),
        subscriptionId: sub.id,
        licenseKey: sub.licenseKey,
        deviceId,
        pharmacyName: pharmacyName || sub.pharmacyName,
        boundAt: new Date().toISOString(),
        isActive: true,
      });
    }

    // Upsert customer record
    if (customerEmail || customerPhone || pharmacyName) {
      const existingCustomer = await customers.findOne({ phone: customerPhone });
      if (!existingCustomer && (customerPhone || customerEmail)) {
        await customers.insertOne({
          id: crypto.randomUUID(),
          name: pharmacyName || 'Pharmacy Owner',
          email: customerEmail || null,
          phone: customerPhone || null,
          pharmacyName: pharmacyName || 'My Pharmacy',
          registeredAt: new Date().toISOString(),
          activeLicenses: [sub.licenseKey],
        });
      }
    }

    // 3. Issue digitally signed Ed25519 license envelope
    const envelope = issueSignedLicense({
      licenseId: sub.licenseKey,
      customerId: sub.customerId || customerPhone || 'CUST-DEFAULT',
      pharmacyName: pharmacyName || sub.pharmacyName || 'PharmaDesk Store',
      deviceId,
      plan: sub.plan,
      durationDays: sub.durationDays,
      isLifetime: sub.isLifetime,
      customExpiryDate: sub.expiryDate || null,
    });

    // Update subscription record with issued license details
    await subscriptions.updateOne({ id: sub.id }, {
      $set: {
        activeDeviceId: deviceId,
        activatedAt: envelope.payload.activationDate,
        expiryDate: envelope.payload.expiryDate,
        lastIssuedEnvelope: envelope,
        updatedAt: new Date().toISOString(),
      }
    });

    // Audit Log
    await auditLogs.insertOne({
      id: crypto.randomUUID(),
      eventType: 'LICENSE_ACTIVATED',
      licenseKey: sub.licenseKey,
      deviceId,
      plan: sub.plan,
      details: `License activated for ${pharmacyName || sub.pharmacyName} on device ${deviceId}`,
      timestamp: new Date().toISOString(),
    });

    return res.json({
      success: true,
      message: 'License verified and activated successfully!',
      licenseEnvelope: envelope,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/licenses/status?deviceId=...
 * Check if the server has an active signed license ready for this device (e.g. after renewal approval).
 */
async function getStatus(req, res, next) {
  try {
    const { deviceId } = req.query;
    if (!deviceId) {
      return res.status(400).json({ success: false, message: 'deviceId parameter required.' });
    }

    const devices = getCollection('devices');
    const subscriptions = getCollection('subscriptions');
    const renewalRequests = getCollection('renewalRequests');

    // Check device record
    const dev = await devices.findOne({ deviceId, isActive: true });
    if (dev && dev.subscriptionId) {
      const sub = await subscriptions.findOne({ id: dev.subscriptionId });
      if (sub && sub.lastIssuedEnvelope) {
        return res.json({
          success: true,
          hasActiveLicense: true,
          licenseEnvelope: sub.lastIssuedEnvelope,
        });
      }
    }

    // Check if there are pending renewal requests
    const pending = await renewalRequests.find({ deviceId, status: 'PENDING' });

    return res.json({
      success: true,
      hasActiveLicense: false,
      pendingRequests: pending.length,
      message: pending.length > 0
        ? 'Your renewal request is pending administrator verification.'
        : 'No active license found for this device.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/licenses/deactivate
 * Unbind device from license.
 */
async function deactivate(req, res, next) {
  try {
    const { deviceId, licenseKey } = req.body;
    const devices = getCollection('devices');
    const auditLogs = getCollection('auditLogs');

    await devices.updateOne({ deviceId, licenseKey }, { $set: { isActive: false, unbindAt: new Date().toISOString() } });

    await auditLogs.insertOne({
      id: crypto.randomUUID(),
      eventType: 'DEVICE_DEACTIVATED',
      licenseKey,
      deviceId,
      timestamp: new Date().toISOString(),
    });

    return res.json({ success: true, message: 'Device unbind successful.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  activate,
  getStatus,
  deactivate,
};

