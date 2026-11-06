/**
 * Plan Controller
 * Manages subscription plans, prices, durations, and device limits.
 */

const { getCollection } = require('../config/database');
const crypto = require('crypto');

async function getPlans(req, res, next) {
  try {
    const plansCollection = getCollection('plans');
    const list = await plansCollection.find();
    return res.json({ success: true, plans: list });
  } catch (err) {
    next(err);
  }
}

async function createPlan(req, res, next) {
  try {
    const { id, name, durationDays, pricePKR, maxDevices, description } = req.body;
    if (!id || !name) {
      return res.status(400).json({ success: false, message: 'Plan ID and Name are required.' });
    }

    const plansCollection = getCollection('plans');
    const existing = await plansCollection.findOne({ id: id.toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Plan ID already exists.' });
    }

    const newPlan = {
      id: id.toUpperCase(),
      name,
      durationDays: durationDays !== undefined ? parseInt(durationDays, 10) : 30,
      pricePKR: parseFloat(pricePKR) || 0,
      maxDevices: parseInt(maxDevices, 10) || 1,
      isEnabled: true,
      description: description || '',
      createdAt: new Date().toISOString(),
    };

    await plansCollection.insertOne(newPlan);
    return res.json({ success: true, plan: newPlan, message: 'Plan created successfully.' });
  } catch (err) {
    next(err);
  }
}

async function updatePlan(req, res, next) {
  try {
    const { id } = req.params;
    const { name, durationDays, pricePKR, maxDevices, isEnabled, description } = req.body;

    const plansCollection = getCollection('plans');
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (durationDays !== undefined) updateFields.durationDays = durationDays === null ? null : parseInt(durationDays, 10);
    if (pricePKR !== undefined) updateFields.pricePKR = parseFloat(pricePKR);
    if (maxDevices !== undefined) updateFields.maxDevices = parseInt(maxDevices, 10);
    if (isEnabled !== undefined) updateFields.isEnabled = Boolean(isEnabled);
    if (description !== undefined) updateFields.description = description;

    await plansCollection.updateOne({ id }, { $set: updateFields });
    return res.json({ success: true, message: 'Plan updated successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPlans,
  createPlan,
  updatePlan,
};

