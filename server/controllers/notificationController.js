const db = require('../config/db');

// Internal Helper: Create Notification
const createNotification = async (userId, title, message, type = 'SYSTEM') => {
    try {
        await db.query(
            "INSERT INTO Notification (UserID, Title, Message, Type) VALUES (?, ?, ?, ?)",
            [userId, title, message, type]
        );
    } catch (err) {
        console.error("Failed to create notification", err);
    }
};

// API: Get My Notifications
const getMyNotifications = async (req, res) => {
    const userId = req.user.id;
    try {
        const [notifications] = await db.query(
            "SELECT * FROM Notification WHERE UserID = ? ORDER BY CreatedAt DESC LIMIT 50",
            [userId]
        );
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ message: "Error fetching notifications" });
    }
};

// API: Mark as Read
const markAsRead = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    try {
        await db.query(
            "UPDATE Notification SET IsRead = TRUE WHERE NotificationID = ? AND UserID = ?",
            [id, userId]
        );
        res.json({ message: "Marked as read" });
    } catch (err) {
        res.status(500).json({ message: "Error updating notification" });
    }
};

module.exports = { createNotification, getMyNotifications, markAsRead };
