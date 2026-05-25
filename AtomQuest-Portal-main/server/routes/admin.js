const express = require('express');
const router = express.Router();
const User = require('../models/User');
const GoalSheet = require('../models/GoalSheet');
const CycleConfig = require('../models/CycleConfig');
const { auth, requireRole } = require('../middleware/auth');
const { createNotification } = require('../services/notificationService');

// GET /api/admin/cycle — get current cycle config
router.get('/cycle', auth, async (req, res, next) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    const cycle = await CycleConfig.findOne({ year: parseInt(year) });
    res.json({ success: true, cycle });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/cycle — update cycle config
router.put('/cycle', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { year, ...updates } = req.body;
    const cycle = await CycleConfig.findOneAndUpdate(
      { year: year || new Date().getFullYear() },
      { ...updates, createdBy: req.user._id },
      { new: true, upsert: true }
    );
    res.json({ success: true, cycle });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users — list all users with hierarchy
router.get('/users', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { role, department } = req.query;
    const query = { isActive: true };
    if (role) query.role = role;
    if (department) query.department = department;

    const users = await User.find(query)
      .populate('manager', 'name email employeeId')
      .sort({ role: 1, name: 1 });

    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/users — create user
router.post('/users', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { employeeId, name, email, password, role, department, designation, managerId } = req.body;

    const existing = await User.findOne({ $or: [{ email }, { employeeId }] });
    if (existing) return res.status(400).json({ success: false, message: 'User with this email or ID already exists.' });

    const user = await User.create({
      employeeId, name, email,
      password: password || 'Welcome@123',
      role, department, designation,
      manager: managerId || null
    });

    res.status(201).json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/users/:id — update user
router.put('/users/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { password, ...updates } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).populate('manager', 'name email');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/audit — audit trail for all goal sheets
router.get('/audit', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { cycle, employeeId } = req.query;
    const currentCycle = cycle || new Date().getFullYear().toString();

    const query = { cycle: currentCycle };
    if (employeeId) query.employee = employeeId;

    const sheets = await GoalSheet.find(query)
      .populate('employee', 'name email employeeId')
      .populate('auditLog.changedBy', 'name email role')
      .select('employee cycle auditLog status');

    const allLogs = [];
    for (const sheet of sheets) {
      for (const log of sheet.auditLog) {
        allLogs.push({
          employee: sheet.employee,
          cycle: sheet.cycle,
          field: log.field,
          oldValue: log.oldValue,
          newValue: log.newValue,
          reason: log.reason,
          changedBy: log.changedBy,
          timestamp: log.timestamp
        });
      }
    }

    allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({ success: true, logs: allLogs, total: allLogs.length });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/org-chart — org hierarchy data
router.get('/org-chart', auth, requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const users = await User.find({ isActive: true })
      .populate('manager', 'name role department')
      .select('name email role department designation employeeId manager');

    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/broadcast-notification
router.post('/broadcast', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { title, message, targetRole, link } = req.body;

    const query = { isActive: true };
    if (targetRole && targetRole !== 'all') query.role = targetRole;

    const users = await User.find(query).select('_id');

    const notifications = users.map(u => ({
      recipient: u._id,
      type: 'cycle_opened',
      title,
      message,
      link: link || '/'
    }));

    const { createNotification } = require('../services/notificationService');
    for (const n of notifications) await createNotification(n);

    res.json({ success: true, message: `Notification sent to ${users.length} users.` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;