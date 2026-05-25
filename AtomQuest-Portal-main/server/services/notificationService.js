const Notification = require('../models/Notification');

const createNotification = async ({ recipient, type, title, message, link, relatedGoalSheet }) => {
  try {
    await Notification.create({ recipient, type, title, message, link, relatedGoalSheet });
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
};

module.exports = { createNotification };