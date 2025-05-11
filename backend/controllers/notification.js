const db = require('../config/db'); // your promise pool


// Get all notifications
exports.getAllNotifications = async (req, res) => {
    try {
        // Query to get all notifications
        db.query('SELECT * FROM notifications ORDER BY created_at DESC', (err, results) => {
            if (err) {
                console.error('Error fetching notifications:', err);
                return res.status(500).send('Error fetching notifications');
            }
            res.json(results); // Send notifications as JSON
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).send('Error fetching notifications');
    }
};

// Create a notification
exports.createNotification = async (req, res) => {
    const { title, message } = req.body;

    if (!title || !message) {
        return res.status(400).send('Title and message are required');
    }

    try {
        // Query to insert a new notification
        db.query('INSERT INTO notifications (title, message) VALUES (?, ?)', [title, message], (err, results) => {
            if (err) {
                console.error('Error creating notification:', err);
                return res.status(500).send('Error creating notification');
            }
            res.status(201).send('Notification created successfully');
        });
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).send('Error creating notification');
    }
};

// Delete a notification
exports.deleteNotification = async (req, res) => {
    const { id } = req.params;

    try {
        // Query to delete the notification by id
        db.query('DELETE FROM notifications WHERE id = ?', [id], (err, results) => {
            if (err) {
                console.error('Error deleting notification:', err);
                return res.status(500).send('Error deleting notification');
            }
            if (results.affectedRows === 0) {
                return res.status(404).send('Notification not found');
            }
            res.send('Notification deleted successfully');
        });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).send('Error deleting notification');
    }
};

// Update a notification
exports.updateNotification = async (req, res) => {
    const { id } = req.params;
    const { title, message } = req.body;

    if (!title || !message) {
        return res.status(400).send('Title and message are required');
    }

    try {
        // Query to update the notification by id
        db.query('UPDATE notifications SET title = ?, message = ? WHERE id = ?', [title, message, id], (err, results) => {
            if (err) {
                console.error('Error updating notification:', err);
                return res.status(500).send('Error updating notification');
            }
            if (results.affectedRows === 0) {
                return res.status(404).send('Notification not found');
            }
            res.send('Notification updated successfully');
        });
    } catch (error) {
        console.error('Error updating notification:', error);
        res.status(500).send('Error updating notification');
    }
};
