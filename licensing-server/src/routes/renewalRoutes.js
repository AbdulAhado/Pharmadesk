const express = require('express');
const router = express.Router();
const renewalController = require('../controllers/renewalController');
const { requireAdminAuth } = require('../middleware/auth');

// Desktop Client Endpoint
router.post('/', renewalController.createRenewalRequest);

// Admin Management Endpoints
router.get('/', requireAdminAuth, renewalController.listRequests);
router.post('/:id/approve', requireAdminAuth, renewalController.approveRequest);
router.post('/:id/reject', requireAdminAuth, renewalController.rejectRequest);

module.exports = router;

