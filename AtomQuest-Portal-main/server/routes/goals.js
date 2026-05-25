const express = require('express');
const router = express.Router();
const GoalSheet = require('../models/GoalSheet');
const User = require('../models/User');
const CycleConfig = require('../models/CycleConfig');
const { auth, requireRole } = require('../middleware/auth');
const { createNotification } = require('../services/notificationService');

// GET /api/goals/my — employee: get own goal sheet
router.get('/my', auth, async (req, res, next) => {
  try {
    const { cycle } = req.query;
    const currentCycle = cycle || new Date().getFullYear().toString();

    let sheet = await GoalSheet.findOne({ employee: req.user._id, cycle: currentCycle })
      .populate('employee', 'name email employeeId department')
      .populate('manager', 'name email')
      .populate('goals.sharedFrom', 'name')
      .populate('checkins.conductedBy', 'name')
      .populate('auditLog.changedBy', 'name email');

    if (!sheet) {
      // Auto-create draft if manager exists
      const manager = await User.findById(req.user.manager);
      if (!manager) {
        return res.json({ success: true, sheet: null, message: 'No manager assigned' });
      }
      sheet = await GoalSheet.create({
        employee: req.user._id,
        manager: manager._id,
        cycle: currentCycle,
        goals: [],
        status: 'draft'
      });
      sheet = await GoalSheet.findById(sheet._id)
        .populate('employee', 'name email employeeId department')
        .populate('manager', 'name email');
    }

    res.json({ success: true, sheet });
  } catch (err) {
    next(err);
  }
});

// PUT /api/goals/my — save/update goals (draft only, or rework state)
router.put('/my', auth, requireRole('employee', 'admin'), async (req, res, next) => {
  try {
    const { goals, cycle } = req.body;
    const currentCycle = cycle || new Date().getFullYear().toString();

    let sheet = await GoalSheet.findOne({ employee: req.user._id, cycle: currentCycle });
    if (!sheet) {
      return res.status(404).json({ success: false, message: 'Goal sheet not found.' });
    }

    if (sheet.isLocked && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Goal sheet is locked. Contact admin.' });
    }

    if (!['draft', 'rework_requested'].includes(sheet.status) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot edit goals after submission.' });
    }

    // Validation
    if (!goals || !Array.isArray(goals)) {
      return res.status(400).json({ success: false, message: 'Goals array required.' });
    }

    if (goals.length > 8) {
      return res.status(400).json({ success: false, message: 'Maximum 8 goals allowed.' });
    }

    if (goals.length > 0) {
      for (const g of goals) {
        if (g.weightage < 10) {
          return res.status(400).json({ success: false, message: `Goal "${g.title}" has minimum weightage of 10%.` });
        }
      }

      const totalWeightage = goals.reduce((sum, g) => sum + Number(g.weightage), 0);
      if (Math.abs(totalWeightage - 100) > 0.01) {
        return res.status(400).json({
          success: false,
          message: `Total weightage must equal 100%. Current total: ${totalWeightage}%`
        });
      }
    }

    sheet.goals = goals;
    await sheet.save();

    res.json({ success: true, message: 'Goals saved successfully.', sheet });
  } catch (err) {
    next(err);
  }
});

// POST /api/goals/submit — submit for manager approval
router.post('/submit', auth, requireRole('employee'), async (req, res, next) => {
  try {
    const { cycle } = req.body;
    const currentCycle = cycle || new Date().getFullYear().toString();

    const sheet = await GoalSheet.findOne({ employee: req.user._id, cycle: currentCycle });
    if (!sheet) return res.status(404).json({ success: false, message: 'Goal sheet not found.' });

    if (sheet.isLocked) {
      return res.status(403).json({ success: false, message: 'Goal sheet is locked.' });
    }

    if (sheet.goals.length === 0) {
      return res.status(400).json({ success: false, message: 'Add at least one goal before submitting.' });
    }

    if (!sheet.validateWeightage()) {
      return res.status(400).json({ success: false, message: 'Total weightage must equal 100%.' });
    }

    sheet.status = 'submitted';
    sheet.submittedAt = new Date();
    await sheet.save();

    // Notify manager
    await createNotification({
      recipient: sheet.manager,
      type: 'goal_submitted',
      title: 'Goal Sheet Submitted',
      message: `${req.user.name} has submitted their goal sheet for ${currentCycle} and awaits your approval.`,
      link: `/manager/team/${req.user._id}/goals`,
      relatedGoalSheet: sheet._id
    });

    res.json({ success: true, message: 'Goals submitted for approval.', sheet });
  } catch (err) {
    next(err);
  }
});

// GET /api/goals/team — manager: get all team members' goal sheets
router.get('/team', auth, requireRole('manager', 'admin'), async (req, res, next) => {
  try {
    const { cycle, status } = req.query;
    const currentCycle = cycle || new Date().getFullYear().toString();

    const query = { cycle: currentCycle };
    if (req.user.role === 'manager') {
      query.manager = req.user._id;
    }
    if (status) query.status = status;

    const sheets = await GoalSheet.find(query)
      .populate('employee', 'name email employeeId department designation')
      .populate('manager', 'name email')
      .sort({ updatedAt: -1 });

    res.json({ success: true, sheets });
  } catch (err) {
    next(err);
  }
});

// GET /api/goals/:id — get specific goal sheet
router.get('/:id', auth, async (req, res, next) => {
  try {
    const sheet = await GoalSheet.findById(req.params.id)
      .populate('employee', 'name email employeeId department designation')
      .populate('manager', 'name email')
      .populate('checkins.conductedBy', 'name')
      .populate('auditLog.changedBy', 'name email')
      .populate('goals.sharedFrom', 'name');

    if (!sheet) return res.status(404).json({ success: false, message: 'Goal sheet not found.' });

    // Access control
    const isOwner = sheet.employee._id.toString() === req.user._id.toString();
    const isManager = sheet.manager._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isManager && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    res.json({ success: true, sheet });
  } catch (err) {
    next(err);
  }
});

// PUT /api/goals/:id/approve — manager approves/rejects
router.put('/:id/approve', auth, requireRole('manager', 'admin'), async (req, res, next) => {
  try {
    const { action, comment, editedGoals } = req.body;
    // action: 'approve' | 'reject' | 'rework'

    const sheet = await GoalSheet.findById(req.params.id)
      .populate('employee', 'name email');

    if (!sheet) return res.status(404).json({ success: false, message: 'Goal sheet not found.' });

    const isManager = sheet.manager.toString() === req.user._id.toString();
    if (!isManager && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the assigned manager can approve.' });
    }

    if (!['submitted', 'under_review'].includes(sheet.status)) {
      return res.status(400).json({ success: false, message: 'Sheet is not pending review.' });
    }

    if (action === 'approve') {
      // Manager may edit targets/weightages inline before approving
      if (editedGoals && Array.isArray(editedGoals)) {
        // Log changes in audit trail
        for (let i = 0; i < editedGoals.length; i++) {
          const edited = editedGoals[i];
          const original = sheet.goals.id ? sheet.goals[i] : null;
          if (original) {
            if (original.target !== edited.target) {
              sheet.auditLog.push({ changedBy: req.user._id, field: `goals[${i}].target`, oldValue: original.target, newValue: edited.target, reason: 'Manager edit during approval' });
            }
            if (original.weightage !== edited.weightage) {
              sheet.auditLog.push({ changedBy: req.user._id, field: `goals[${i}].weightage`, oldValue: original.weightage, newValue: edited.weightage, reason: 'Manager edit during approval' });
            }
          }
        }
        sheet.goals = editedGoals;
      }

      sheet.status = 'approved';
      sheet.isLocked = true;
      sheet.approvedAt = new Date();
      sheet.managerComment = comment || '';

      await createNotification({
        recipient: sheet.employee._id,
        type: 'goal_approved',
        title: 'Goals Approved ✅',
        message: `Your goal sheet for ${sheet.cycle} has been approved by your manager.`,
        link: '/employee/goals',
        relatedGoalSheet: sheet._id
      });
    } else if (action === 'rework') {
      sheet.status = 'rework_requested';
      sheet.managerComment = comment || 'Please revise your goals.';

      await createNotification({
        recipient: sheet.employee._id,
        type: 'goal_rework',
        title: 'Goal Sheet Needs Revision',
        message: `Your manager has requested changes: "${comment}"`,
        link: '/employee/goals',
        relatedGoalSheet: sheet._id
      });
    }

    await sheet.save();
    res.json({ success: true, message: `Goal sheet ${action}d successfully.`, sheet });
  } catch (err) {
    next(err);
  }
});

// PUT /api/goals/:id/achievement — update quarterly achievement
router.put('/:id/achievement', auth, async (req, res, next) => {
  try {
    const { quarter, goalIndex, actual, status } = req.body;

    if (!['q1', 'q2', 'q3', 'q4'].includes(quarter)) {
      return res.status(400).json({ success: false, message: 'Invalid quarter.' });
    }

    const sheet = await GoalSheet.findById(req.params.id);
    if (!sheet) return res.status(404).json({ success: false, message: 'Goal sheet not found.' });

    const isOwner = sheet.employee.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isManager) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update achievement.'
      });
    }

    if (sheet.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Goals must be approved before logging achievements.' });
    }

    if (goalIndex < 0 || goalIndex >= sheet.goals.length) {
      return res.status(400).json({ success: false, message: 'Invalid goal index.' });
    }

    const goal = sheet.goals[goalIndex];

   

    goal.achievements[quarter].actual = actual;
    goal.achievements[quarter].status = status;
    goal.achievements[quarter].updatedAt = new Date();
    goal.achievements[quarter].score = GoalSheet.computeScore(goal.uomType, goal.target, actual);

    // If primary owner of shared goal, sync other sheets
    if (goal.isShared && goal.primaryOwner) {
      const sharedSheets = await GoalSheet.find({
        'goals.primaryOwner': goal.primaryOwner,
        'goals.title': goal.title,
        _id: { $ne: sheet._id }
      });
      for (const sharedSheet of sharedSheets) {
        for (const sharedGoal of sharedSheet.goals) {
          if (sharedGoal.title === goal.title && sharedGoal.primaryOwner?.toString() === goal.primaryOwner?.toString()) {
            sharedGoal.achievements[quarter].actual = actual;
            sharedGoal.achievements[quarter].status = status;
            sharedGoal.achievements[quarter].score = goal.achievements[quarter].score;
          }
        }
        sharedSheet.computeOverallScore(quarter);
        await sharedSheet.save();
      }
    }

    sheet.computeOverallScore(quarter);
    sheet.markModified('goals');
    await sheet.save();

    res.json({ success: true, message: 'Achievement updated.', sheet });
  } catch (err) {
    next(err);
  }
});

router.post('/share', auth, requireRole('manager', 'admin'), async (req, res, next) => {
  try {
    const { goal, employeeIds, cycle } = req.body;
    const currentCycle = cycle || new Date().getFullYear().toString();

    const results = [];

    for (const empId of employeeIds) {

      // Find existing sheet OR create one automatically
      let sheet = await GoalSheet.findOne({
        employee: empId,
        cycle: currentCycle
      });

      if (!sheet) {
        sheet = await GoalSheet.create({
          employee: empId,
          manager: req.user._id,
          cycle: currentCycle,
          goals: [],
          status: 'draft'
        });
      }

      if (sheet.isLocked) continue;
      if (sheet.goals.length >= 8) continue;

      const sharedGoal = {
        ...goal,
        isShared: true,
        sharedFrom: req.user._id,
        primaryOwner: req.user._id,
        isReadOnly: true
      };

      sheet.goals.push(sharedGoal);

      await sheet.save();

      await createNotification({
        recipient: empId,
        type: 'shared_goal',
        title: 'New Shared Goal Added',
        message: `A departmental KPI "${goal.title}" has been added to your goal sheet.`,
        link: '/employee/goals',
        relatedGoalSheet: sheet._id
      });

      results.push(empId);
    }

    res.json({
      success: true,
      message: `Shared goal pushed to ${results.length} employees.`,
      affected: results.length
    });

  } catch (err) {
    next(err);
  }
});

// POST /api/goals/:id/unlock — admin unlocks a goal sheet
router.post('/:id/unlock', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { reason } = req.body;
    const sheet = await GoalSheet.findById(req.params.id).populate('employee', 'name email');
    if (!sheet) return res.status(404).json({ success: false, message: 'Goal sheet not found.' });

    sheet.isLocked = false;
    sheet.status = 'rework_requested';
    sheet.auditLog.push({
      changedBy: req.user._id,
      field: 'isLocked',
      oldValue: true,
      newValue: false,
      reason: reason || 'Admin unlock'
    });

    await sheet.save();

    await createNotification({
      recipient: sheet.employee._id,
      type: 'goal_unlocked',
      title: 'Goal Sheet Unlocked',
      message: `Admin has unlocked your goal sheet for editing. Reason: ${reason || 'Exception handling'}`,
      link: '/employee/goals',
      relatedGoalSheet: sheet._id
    });

    res.json({ success: true, message: 'Goal sheet unlocked.', sheet });
  } catch (err) {
    next(err);
  }
});

module.exports = router;