const express = require('express');
const router = express.Router();
const GoalSheet = require('../models/GoalSheet');
const { auth, requireRole } = require('../middleware/auth');
const { createNotification } = require('../services/notificationService');

// POST /api/checkins/:sheetId — manager records check-in comment
router.post('/:sheetId', auth, requireRole('manager', 'admin'), async (req, res, next) => {
  try {
    const { quarter, comment } = req.body;

    if (!['q1', 'q2', 'q3', 'q4'].includes(quarter)) {
      return res.status(400).json({ success: false, message: 'Invalid quarter.' });
    }

    if (!comment || comment.trim().length < 5) {
      return res.status(400).json({ success: false, message: 'Check-in comment is required (min 5 chars).' });
    }

    const sheet = await GoalSheet.findById(req.params.sheetId)
      .populate('employee', 'name email');

    if (!sheet) return res.status(404).json({ success: false, message: 'Goal sheet not found.' });

    const isManager = sheet.manager.toString() === req.user._id.toString();
    if (!isManager && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only assigned manager can conduct check-in.' });
    }

    // Check if check-in already exists for this quarter
    const existing = sheet.checkins.find(c => c.quarter === quarter);
    if (existing) {
      existing.comment = comment;
      existing.conductedBy = req.user._id;
      existing.completedAt = new Date();
    } else {
      sheet.checkins.push({
        quarter,
        conductedBy: req.user._id,
        comment,
        completedAt: new Date()
      });
    }

    await sheet.save();

    await createNotification({
      recipient: sheet.employee._id,
      type: 'checkin_completed',
      title: `${quarter.toUpperCase()} Check-in Completed`,
      message: `Your manager has completed the ${quarter.toUpperCase()} check-in. Comment: "${comment.substring(0, 100)}..."`,
      link: '/employee/goals',
      relatedGoalSheet: sheet._id
    });

    res.json({ success: true, message: 'Check-in recorded successfully.', sheet });
  } catch (err) {
    next(err);
  }
});

// GET /api/checkins/team/status — manager: check-in completion status
router.get('/team/status', auth, requireRole('manager', 'admin'), async (req, res, next) => {
  try {
    const { cycle, quarter } = req.query;
    const currentCycle = cycle || new Date().getFullYear().toString();

    const query = { cycle: currentCycle, status: 'approved' };
    if (req.user.role === 'manager') query.manager = req.user._id;

    const sheets = await GoalSheet.find(query)
      .populate('employee', 'name email department')
      .select('employee checkins goals overallScores status');

    const statuses = sheets.map(sheet => {
      const qStatus = {};
      ['q1', 'q2', 'q3', 'q4'].forEach(q => {
        const checkin = sheet.checkins.find(c => c.quarter === q);
        qStatus[q] = {
          completed: !!checkin,
          completedAt: checkin?.completedAt,
          comment: checkin?.comment
        };
      });

      return {
        employee: sheet.employee,
        checkinStatus: qStatus,
        overallScores: sheet.overallScores,
        currentQuarterScore: quarter ? sheet.overallScores[quarter] : null
      };
    });

    res.json({ success: true, statuses });
  } catch (err) {
    next(err);
  }
});

module.exports = router;