const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: [
      'goal_submitted', 'goal_approved', 'goal_rejected', 'goal_rework',
      'checkin_reminder', 'checkin_completed', 'escalation',
      'shared_goal', 'goal_unlocked', 'cycle_opened'
    ],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String }, // deep link to relevant page
  isRead: { type: Boolean, default: false },
  relatedGoalSheet: { type: mongoose.Schema.Types.ObjectId, ref: 'GoalSheet' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);