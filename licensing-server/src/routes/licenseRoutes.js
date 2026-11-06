const express = require('express');
const router = express.Router();
const licenseController = require('../controllers/licenseController');

// Public Desktop Client Endpoints
router.post('/activate', licenseController.activate);
router.get('/status', licenseController.getStatus);
router.post('/deactivate', licenseController.deactivate);

module.exports = router;

