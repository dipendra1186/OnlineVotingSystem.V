const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification');

// Create a notification
router.post('/', notificationController.createNotification);

// Get all notifications
router.get('/', notificationController.getAllNotifications);

// Delete a notification
router.delete('/:id', notificationController.deleteNotification);

// Update a notification
router.put('/:id', notificationController.updateNotification);

module.exports = router;
