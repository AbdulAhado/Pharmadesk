const express = require('express');
const router = express.Router();
const planController = require('../controllers/planController');
const { requireAdminAuth } = require('../middleware/auth');

// Public Desktop Endpoint
router.get('/', planController.getPlans);

// Admin Management Endpoints
router.post('/', requireAdminAuth, planController.createPlan);
router.put('/:id', requireAdminAuth, planController.updatePlan);

module.exports = router;

