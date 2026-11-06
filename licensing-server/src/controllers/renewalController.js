/**
 * Renewal Controller
 * Manages manual & verified renewal request workflow.
 */

const { getCollection } = require('../config/database');
const { issueSignedLicense } = require('../services/cryptoService');
const crypto = require('crypto');

/**
 * POST /api/v1/renewal-requests
 * Desktop application sends renewal request.
 */
async function createRenewalRequest(req, res, next) {
  try {
    const { requestNumber, deviceId, requestedPlan, customerName, customerPhone, paymentReference, notes } = req.body;

    if (!deviceId || !requestedPlan) {
      return res.status(400).json({ success: false, message: 'Device ID and requested plan are required.' });
    }

    const renewalRequests = getCollection('renewalRequests');
    const plans = getCollection('plans');
    const planDoc = await plans.findOne({ id: requestedPlan });

    const newRequest = {
      id: crypto.randomUUID(),
      requestNumber: requestNumber || `RNW-${Date.now().toString().slice(-6)}`,
      deviceId,
      requestedPlan,
      planName: planDoc?.name || requestedPlan,
      pricePKR: planDoc?.pricePKR || 0,
      customerName: customerName || 'Pharmacy Owner',
      customerPhone: customerPhone || 'N/A',
      paymentReference: paymentReference || 'N/A',
      notes: notes || '',
      status: 'PENDING', // 'PENDING', 'APPROVED', 'REJECTED'
      createdAt: new Date().toISOString(),
    };

    await renewalRequests.insertOne(newRequest);

    return res.json({
      success: true,
      message: 'Renewal request recorded. Awaiting administrator approval.',
      request: newRequest,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/renewal-requests (Admin Only)
 */
async function listRequests(req, res, next) {
  try {
    const { status } = req.query;
    const renewalRequests = getCollection('renewalRequests');
    const filter = status ? { status } : {};
    const list = await renewalRequests.find(filter);
    return res.json({ success: true, requests: list });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/renewal-requests/:id/approve (Admin Only)
 * Approves a renewal request, signs new Ed25519 license envelope, and updates device binding.
 */
async function approveRequest(req, res, next) {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    const renewalRequests = getCollection('renewalRequests');
    const subscriptions = getCollection('subscriptions');
    const devices = getCollection('devices');
    const plans = getCollection('plans');
    const auditLogs = getCollection('auditLogs');

    const request = await renewalRequests.findOne({ id });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Renewal request not found.' });
    }

    if (request.status === 'APPROVED') {
      return res.status(400).json({ success: false, message: 'Request is already approved.' });
    }

    // Determine plan duration
    const planDoc = await plans.findOne({ id: request.requestedPlan });
    const isLifetime = request.requestedPlan === 'LIFETIME' || planDoc?.durationDays === null;
    const durationDays = planDoc ? planDoc.durationDays : (request.requestedPlan === 'YEARLY' ? 365 : 30);

    // Look for existing subscription for this device or create a new one
    let dev = await devices.findOne({ deviceId: request.deviceId, isActive: true });
    let sub = null;
    if (dev && dev.subscriptionId) {
      sub = await subscriptions.findOne({ id: dev.subscriptionId });
    }

    const licenseKey = sub ? sub.licenseKey : `PHD-${request.requestedPlan}-${Date.now().toString().slice(-6)}`;

    // Issue digitally signed Ed25519 license envelope
    const envelope = issueSignedLicense({
      licenseId: licenseKey,
      customerId: request.customerPhone,
      pharmacyName: request.customerName,
      deviceId: request.deviceId,
      plan: request.requestedPlan,
      durationDays,
      isLifetime,
    });

    // Update or insert subscription
    if (sub) {
      await subscriptions.updateOne({ id: sub.id }, {
        $set: {
          plan: request.requestedPlan,
          durationDays,
          isLifetime,
          status: 'ACTIVE',
          expiryDate: envelope.payload.expiryDate,
          lastIssuedEnvelope: envelope,
          updatedAt: new Date().toISOString(),
        }
      });
    } else {
      const newSubId = crypto.randomUUID();
      await subscriptions.insertOne({
        id: newSubId,
        licenseKey,
        customerId: request.customerPhone,
        pharmacyName: request.customerName,
        plan: request.requestedPlan,
        durationDays,
        isLifetime,
        status: 'ACTIVE',
        maxDevices: planDoc?.maxDevices || 2,
        activeDeviceId: request.deviceId,
        expiryDate: envelope.payload.expiryDate,
        lastIssuedEnvelope: envelope,
        createdAt: new Date().toISOString(),
      });

      // Bind device
      if (!dev) {
        await devices.insertOne({
          id: crypto.randomUUID(),
          subscriptionId: newSubId,
          licenseKey,
          deviceId: request.deviceId,
          pharmacyName: request.customerName,
          boundAt: new Date().toISOString(),
          isActive: true,
        });
      }
    }

    // Mark renewal request approved
    await renewalRequests.updateOne({ id }, {
      $set: {
        status: 'APPROVED',
        adminNotes: adminNotes || 'Approved by administrator',
        approvedAt: new Date().toISOString(),
        issuedLicenseKey: licenseKey,
      }
    });

    // Audit log
    await auditLogs.insertOne({
      id: crypto.randomUUID(),
      eventType: 'RENEWAL_APPROVED',
      licenseKey,
      deviceId: request.deviceId,
      plan: request.requestedPlan,
      details: `Renewal approved for ${request.customerName} (${request.requestNumber})`,
      timestamp: new Date().toISOString(),
    });

    return res.json({
      success: true,
      message: 'Renewal approved and signed Ed25519 license generated successfully!',
      licenseEnvelope: envelope,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/renewal-requests/:id/reject (Admin Only)
 */
async function rejectRequest(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const renewalRequests = getCollection('renewalRequests');
    const auditLogs = getCollection('auditLogs');

    await renewalRequests.updateOne({ id }, {
      $set: {
        status: 'REJECTED',
        rejectionReason: reason || 'Payment could not be verified',
        rejectedAt: new Date().toISOString(),
      }
    });

    await auditLogs.insertOne({
      id: crypto.randomUUID(),
      eventType: 'RENEWAL_REJECTED',
      details: `Renewal request ${id} rejected: ${reason || 'Unverified'}`,
      timestamp: new Date().toISOString(),
    });

    return res.json({ success: true, message: 'Renewal request rejected.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createRenewalRequest,
  listRequests,
  approveRequest,
  rejectRequest,
};

