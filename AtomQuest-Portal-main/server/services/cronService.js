const cron = require('node-cron');
const GoalSheet = require('../models/GoalSheet');
const User = require('../models/User');
const CycleConfig = require('../models/CycleConfig');
const { createNotification } = require('./notificationService');

const startCronJobs = () => {
  // Daily at 9 AM — check for escalations
  cron.schedule('0 9 * * *', async () => {
    console.log('🔔 Running escalation checks...');
    await checkGoalSubmissionEscalations();
    await checkApprovalEscalations();
    await checkCheckinEscalations();
  });

  console.log('✅ Cron jobs started');
};

const checkGoalSubmissionEscalations = async () => {
  try {
    const cycle = await CycleConfig.findOne({ isActive: true });
    if (!cycle) return;

    const { goalSubmissionDays } = cycle.escalationRules;
    const openDate = new Date(cycle.goalSettingOpen);
    const daysSinceOpen = Math.floor((new Date() - openDate) / (1000 * 60 * 60 * 24));

    if (daysSinceOpen < goalSubmissionDays) return;

    // Find employees with draft sheets
    const draftSheets = await GoalSheet.find({
      cycle: cycle.year.toString(),
      status: 'draft',
      goals: { $exists: true, $not: { $size: 0 } }
    }).populate('employee', 'name').populate('manager', 'name');

    for (const sheet of draftSheets) {
      await createNotification({
        recipient: sheet.employee._id,
        type: 'escalation',
        title: '⚠️ Action Required: Submit Your Goals',
        message: `Your goals are still in draft. Please submit them for manager approval. Cycle deadline is approaching.`,
        link: '/employee/goals'
      });

      await createNotification({
        recipient: sheet.manager._id,
        type: 'escalation',
        title: `⚠️ Escalation: ${sheet.employee?.name} has not submitted goals`,
        message: `${sheet.employee?.name} has not submitted their goals ${daysSinceOpen} days after the cycle opened.`,
        link: `/manager/team`
      });
    }
  } catch (err) {
    console.error('Escalation check failed:', err.message);
  }
};

const checkApprovalEscalations = async () => {
  try {
    const cycle = await CycleConfig.findOne({ isActive: true });
    if (!cycle) return;

    const { goalApprovalDays } = cycle.escalationRules;
    const cutoff = new Date(Date.now() - goalApprovalDays * 24 * 60 * 60 * 1000);

    const pendingSheets = await GoalSheet.find({
      status: 'submitted',
      submittedAt: { $lt: cutoff }
    }).populate('manager', 'name').populate('employee', 'name');

    for (const sheet of pendingSheets) {
      await createNotification({
        recipient: sheet.manager._id,
        type: 'escalation',
        title: `⚠️ Pending Approval: ${sheet.employee?.name}`,
        message: `${sheet.employee?.name}'s goal sheet has been pending your approval for more than ${goalApprovalDays} days.`,
        link: `/manager/goals/${sheet._id}`
      });
    }
  } catch (err) {
    console.error('Approval escalation check failed:', err.message);
  }
};

const checkCheckinEscalations = async () => {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const cycle = await CycleConfig.findOne({ isActive: true });
    if (!cycle) return;

    // Determine if we're in an active check-in window
    let activeQuarter = null;
    for (const [q, data] of Object.entries(cycle.quarters)) {
      if (data.windowOpen && data.windowClose) {
        const open = new Date(data.windowOpen);
        const close = new Date(data.windowClose);
        if (now >= open && now <= close) {
          activeQuarter = q;
          break;
        }
      }
    }

    if (!activeQuarter) return;

    const { checkinDays } = cycle.escalationRules;
    const windowOpen = new Date(cycle.quarters[activeQuarter].windowOpen);
    const daysSinceOpen = Math.floor((now - windowOpen) / (1000 * 60 * 60 * 24));

    if (daysSinceOpen < checkinDays) return;

    // Find approved sheets with no check-in this quarter
    const approvedSheets = await GoalSheet.find({
      cycle: cycle.year.toString(),
      status: 'approved'
    }).populate('employee', 'name').populate('manager', 'name');

    for (const sheet of approvedSheets) {
      const hasCheckin = sheet.checkins.some(c => c.quarter === activeQuarter);
      if (!hasCheckin) {
        await createNotification({
          recipient: sheet.manager._id,
          type: 'checkin_reminder',
          title: `⏰ Check-in Reminder: ${sheet.employee?.name}`,
          message: `You haven't completed the ${activeQuarter.toUpperCase()} check-in for ${sheet.employee?.name}. Please schedule it soon.`,
          link: `/manager/goals/${sheet._id}`
        });
      }
    }
  } catch (err) {
    console.error('Check-in escalation failed:', err.message);
  }
};

module.exports = { startCronJobs };