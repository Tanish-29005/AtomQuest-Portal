const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');

// GET /api/users/team — manager's direct reports
router.get('/team', auth, requireRole('manager', 'admin'), async (req, res, next) => {
  try {
    const query = req.user.role === 'manager'
      ? { manager: req.user._id, isActive: true }
      : { isActive: true, role: 'employee' };

    const team = await User.find(query)
      .populate('manager', 'name email')
      .select('-password');

    res.json({ success: true, team });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/managers — list all managers (for assignment)
router.get('/managers', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const managers = await User.find({ role: 'manager', isActive: true }).select('name email department employeeId');
    res.json({ success: true, managers });
  } catch (err) {
    next(err);
  }
});

module.exports = router;