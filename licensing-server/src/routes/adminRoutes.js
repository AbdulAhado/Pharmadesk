const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdminAuth } = require('../middleware/auth');

// Public Login Endpoint
router.post('/login', adminController.login);

// Protected Admin Endpoints
router.get('/stats', requireAdminAuth, adminController.getStats);
router.get('/customers', requireAdminAuth, adminController.getCustomers);
router.post('/customers', requireAdminAuth, adminController.createCustomer);
router.get('/subscriptions', requireAdminAuth, adminController.getSubscriptions);
router.post('/subscriptions/issue', requireAdminAuth, adminController.issueManualLicense);
router.post('/subscriptions/:id/extend', requireAdminAuth, adminController.extendSubscription);
router.get('/devices', requireAdminAuth, adminController.getDevices);
router.post('/devices/:id/reset', requireAdminAuth, adminController.resetDevice);
router.get('/audits', requireAdminAuth, adminController.getAuditLogs);

module.exports = router;

