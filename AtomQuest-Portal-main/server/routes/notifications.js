const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

// GET /api/notifications — get user's notifications
router.get('/', auth, async (req, res, next) => {
  try {
    const { unread } = req.query;
    const query = { recipient: req.user._id };
    if (unread === 'true') query.isRead = false;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
    res.json({ success: true, notifications, unreadCount });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/read-all — mark all as read
router.put('/read-all', auth, async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', auth, async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true }
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;