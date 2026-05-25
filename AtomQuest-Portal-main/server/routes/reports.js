const express = require('express');
const router = express.Router();
const GoalSheet = require('../models/GoalSheet');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');
const XLSX = require('xlsx');

// GET /api/reports/achievement — achievement report
router.get('/achievement', auth, requireRole('manager', 'admin'), async (req, res, next) => {
  try {
    const { cycle, format, department } = req.query;
    const currentCycle = cycle || new Date().getFullYear().toString();

    const query = { cycle: currentCycle };
    if (req.user.role === 'manager') query.manager = req.user._id;

    const sheets = await GoalSheet.find(query)
      .populate('employee', 'name email employeeId department designation')
      .populate('manager', 'name email');

    // Build report data
    const reportData = [];
    for (const sheet of sheets) {
      if (department && sheet.employee?.department !== department) continue;

      for (const goal of sheet.goals) {
        ['q1', 'q2', 'q3', 'q4'].forEach(q => {
          const ach = goal.achievements[q];
          reportData.push({
            'Employee ID': sheet.employee?.employeeId,
            'Employee Name': sheet.employee?.name,
            'Department': sheet.employee?.department,
            'Manager': sheet.manager?.name,
            'Cycle': sheet.cycle,
            'Quarter': q.toUpperCase(),
            'Thrust Area': goal.thrustArea,
            'Goal Title': goal.title,
            'UoM Type': goal.uomType,
            'Target': goal.target,
            'Weightage (%)': goal.weightage,
            'Actual Achievement': ach?.actual ?? 'N/A',
            'Status': ach?.status?.replace(/_/g, ' ') ?? 'Not Started',
            'Score (%)': ach?.score ?? 0
          });
        });
      }
    }

    if (format === 'excel') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(reportData);
      XLSX.utils.book_append_sheet(wb, ws, 'Achievement Report');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="achievement_report_${currentCycle}.xlsx"`);
      return res.send(buffer);
    }

    // CSV
    if (format === 'csv') {
      if (reportData.length === 0) return res.send('No data');
      const headers = Object.keys(reportData[0]);
      const csvRows = [headers.join(',')];
      for (const row of reportData) {
        csvRows.push(headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','));
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="achievement_report_${currentCycle}.csv"`);
      return res.send(csvRows.join('\n'));
    }

    res.json({ success: true, data: reportData, total: reportData.length });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/completion — completion dashboard
router.get('/completion', auth, requireRole('manager', 'admin'), async (req, res, next) => {
  try {
    const { cycle } = req.query;
    const currentCycle = cycle || new Date().getFullYear().toString();

    const query = { cycle: currentCycle };
    if (req.user.role === 'manager') query.manager = req.user._id;

    const sheets = await GoalSheet.find(query)
      .populate('employee', 'name email department')
      .populate('manager', 'name email');

    const byStatus = { draft: 0, submitted: 0, under_review: 0, approved: 0, rework_requested: 0 };
    const byDepartment = {};
    const checkinCompletion = { q1: 0, q2: 0, q3: 0, q4: 0 };
    const total = sheets.length;

    for (const sheet of sheets) {
      byStatus[sheet.status] = (byStatus[sheet.status] || 0) + 1;

      const dept = sheet.employee?.department || 'Unknown';
      if (!byDepartment[dept]) byDepartment[dept] = { total: 0, approved: 0 };
      byDepartment[dept].total++;
      if (sheet.status === 'approved') byDepartment[dept].approved++;

      ['q1', 'q2', 'q3', 'q4'].forEach(q => {
        if (sheet.checkins.some(c => c.quarter === q)) checkinCompletion[q]++;
      });
    }

    const overallCompletion = total > 0 ? Math.round((byStatus.approved / total) * 100) : 0;

    // Manager effectiveness
    const managerStats = {};
    for (const sheet of sheets) {
      const mgr = sheet.manager;
      if (!mgr) continue;
      const mgrId = mgr._id.toString();
      if (!managerStats[mgrId]) {
        managerStats[mgrId] = { name: mgr.name, total: 0, approved: 0, checkins: { q1: 0, q2: 0, q3: 0, q4: 0 } };
      }
      managerStats[mgrId].total++;
      if (sheet.status === 'approved') managerStats[mgrId].approved++;
      ['q1', 'q2', 'q3', 'q4'].forEach(q => {
        if (sheet.checkins.some(c => c.quarter === q)) managerStats[mgrId].checkins[q]++;
      });
    }

    res.json({
      success: true,
      summary: {
        total,
        overallCompletion,
        byStatus,
        byDepartment,
        checkinCompletion: {
          q1: total > 0 ? Math.round((checkinCompletion.q1 / total) * 100) : 0,
          q2: total > 0 ? Math.round((checkinCompletion.q2 / total) * 100) : 0,
          q3: total > 0 ? Math.round((checkinCompletion.q3 / total) * 100) : 0,
          q4: total > 0 ? Math.round((checkinCompletion.q4 / total) * 100) : 0
        }
      },
      sheets: sheets.map(s => ({
        employee: s.employee,
        manager: s.manager,
        status: s.status,
        overallScores: s.overallScores,
        checkinCount: s.checkins.length,
        submittedAt: s.submittedAt,
        approvedAt: s.approvedAt
      })),
      managerEffectiveness: Object.values(managerStats)
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/analytics — QoQ trends, heatmaps
router.get('/analytics', auth, requireRole('manager', 'admin'), async (req, res, next) => {
  try {
    const { cycle } = req.query;
    const currentCycle = cycle || new Date().getFullYear().toString();

    const query = { cycle: currentCycle, status: 'approved' };
    if (req.user.role === 'manager') query.manager = req.user._id;

    const sheets = await GoalSheet.find(query)
      .populate('employee', 'name department');

    // QoQ average scores
    const qoqTrends = { q1: [], q2: [], q3: [], q4: [] };
    const thrustAreaBreakdown = {};
    const departmentScores = {};
    const employeeTrends = [];

    for (const sheet of sheets) {
      const empTrend = {
        employee: sheet.employee?.name,
        department: sheet.employee?.department,
        scores: { q1: sheet.overallScores.q1, q2: sheet.overallScores.q2, q3: sheet.overallScores.q3, q4: sheet.overallScores.q4 }
      };
      employeeTrends.push(empTrend);

      ['q1', 'q2', 'q3', 'q4'].forEach(q => {
        if (sheet.overallScores[q] > 0) qoqTrends[q].push(sheet.overallScores[q]);
      });

      // Thrust area breakdown
      for (const goal of sheet.goals) {
        if (!thrustAreaBreakdown[goal.thrustArea]) {
          thrustAreaBreakdown[goal.thrustArea] = { count: 0, totalScore: 0, uomTypes: {} };
        }
        thrustAreaBreakdown[goal.thrustArea].count++;
        const avgScore = (sheet.overallScores.q1 + sheet.overallScores.q2 + sheet.overallScores.q3 + sheet.overallScores.q4) / 4;
        thrustAreaBreakdown[goal.thrustArea].totalScore += avgScore;
        thrustAreaBreakdown[goal.thrustArea].uomTypes[goal.uomType] = (thrustAreaBreakdown[goal.thrustArea].uomTypes[goal.uomType] || 0) + 1;

        // Department scores
        const dept = sheet.employee?.department || 'Unknown';
        if (!departmentScores[dept]) departmentScores[dept] = [];
        departmentScores[dept].push(avgScore);
      }
    }

    const avgQoQ = {};
    ['q1', 'q2', 'q3', 'q4'].forEach(q => {
      avgQoQ[q] = qoqTrends[q].length > 0
        ? Math.round(qoqTrends[q].reduce((a, b) => a + b, 0) / qoqTrends[q].length)
        : 0;
    });

    const deptAvgScores = {};
    for (const [dept, scores] of Object.entries(departmentScores)) {
      deptAvgScores[dept] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }

    res.json({
      success: true,
      analytics: {
        qoqAverageScores: avgQoQ,
        thrustAreaBreakdown,
        departmentScores: deptAvgScores,
        employeeTrends,
        totalEmployees: sheets.length
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;