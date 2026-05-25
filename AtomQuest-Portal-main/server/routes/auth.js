const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const CycleConfig = require('../models/CycleConfig');
const { auth } = require('../middleware/auth');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email, isActive: true });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);
    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        designation: user.designation,
        employeeId: user.employeeId,
        manager: user.manager
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user._id).populate('manager', 'name email role department');
  res.json({ success: true, user });
});

// POST /api/auth/seed — seeds demo users + cycle config (run once)
router.post('/seed', async (req, res, next) => {
  try {
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      return res.status(400).json({ success: false, message: 'Data already seeded.' });
    }

    // Create Admin
    const admin = await User.create({
      employeeId: 'EMP001',
      name: 'Admin User',
      email: 'admin@atomquest.com',
      password: 'Admin@123',
      role: 'admin',
      department: 'HR',
      designation: 'HR Manager'
    });

    // Create Manager
    const manager = await User.create({
      employeeId: 'EMP002',
      name: 'Priya Sharma',
      email: 'manager@atomquest.com',
      password: 'Manager@123',
      role: 'manager',
      department: 'Engineering',
      designation: 'Engineering Manager',
      manager: admin._id
    });

    // Create Employees
    const emp1 = await User.create({
      employeeId: 'EMP003',
      name: 'Rahul Verma',
      email: 'employee@atomquest.com',
      password: 'Employee@123',
      role: 'employee',
      department: 'Engineering',
      designation: 'Software Engineer',
      manager: manager._id
    });

    const emp2 = await User.create({
      employeeId: 'EMP004',
      name: 'Sneha Patel',
      email: 'sneha@atomquest.com',
      password: 'Employee@123',
      role: 'employee',
      department: 'Engineering',
      designation: 'Senior Engineer',
      manager: manager._id
    });

    // Create Cycle Config for current year
    const currentYear = new Date().getFullYear();
    await CycleConfig.create({
      year: currentYear,
      goalSettingOpen: new Date(`${currentYear}-05-01`),
      goalSettingClose: new Date(`${currentYear}-05-31`),
      quarters: {
        q1: { label: 'Q1 (Apr–Jun)', windowOpen: new Date(`${currentYear}-07-01`), windowClose: new Date(`${currentYear}-07-31`) },
        q2: { label: 'Q2 (Jul–Sep)', windowOpen: new Date(`${currentYear}-10-01`), windowClose: new Date(`${currentYear}-10-31`) },
        q3: { label: 'Q3 (Oct–Dec)', windowOpen: new Date(`${currentYear+1}-01-01`), windowClose: new Date(`${currentYear+1}-01-31`) },
        q4: { label: 'Q4 Annual', windowOpen: new Date(`${currentYear+1}-03-01`), windowClose: new Date(`${currentYear+1}-04-30`) }
      },
      thrustAreas: [
        { name: 'Revenue Growth', description: 'Initiatives driving top-line revenue' },
        { name: 'Customer Excellence', description: 'Customer satisfaction and NPS' },
        { name: 'Operational Efficiency', description: 'Process improvement and cost reduction' },
        { name: 'People & Culture', description: 'Team development and engagement' },
        { name: 'Innovation', description: 'New product and technology initiatives' },
        { name: 'Compliance & Risk', description: 'Regulatory compliance and risk management' }
      ],
      escalationRules: { goalSubmissionDays: 7, goalApprovalDays: 5, checkinDays: 7 },
      isActive: true,
      createdBy: admin._id
    });

    res.json({
      success: true,
      message: 'Demo data seeded successfully!',
      credentials: [
        { role: 'Admin', email: 'admin@atomquest.com', password: 'Admin@123' },
        { role: 'Manager', email: 'manager@atomquest.com', password: 'Manager@123' },
        { role: 'Employee', email: 'employee@atomquest.com', password: 'Employee@123' }
      ]
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;