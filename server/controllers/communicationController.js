const db = require('../config/db');

// Send Message (Chat)
const sendMessage = async (req, res) => {
    const { receiverId, message } = req.body;
    const senderId = req.user.id;

    try {
        const chatId = 'MSG' + Date.now().toString().slice(-8) + Math.random().toString(36).substring(2, 5);
        await db.query(
            "INSERT INTO Chat (ChatID, SenderID, ReceiverID, Message, Timestamp, IsRead) VALUES (?, ?, ?, ?, NOW(), FALSE)",
            [chatId, senderId, receiverId, message]
        );
        res.json({ message: "Message sent" });
    } catch (err) {
        res.status(500).json({ message: "Error sending message" });
    }
};

// Get Chat History
const getChatHistory = async (req, res) => {
    const userId = req.user.id;
    const { contactId } = req.params;

    try {
        const [chats] = await db.query(`
            SELECT * FROM Chat 
            WHERE (SenderID = ? AND ReceiverID = ?) OR (SenderID = ? AND ReceiverID = ?)
            ORDER BY Timestamp ASC
        `, [userId, contactId, contactId, userId]);
        res.json(chats);
    } catch (err) {
        res.status(500).json({ message: "Error fetching chat" });
    }
};

// NEW: Delete Chat
const deleteChat = async (req, res) => {
    const userId = req.user.id;
    const { contactId } = req.params;

    try {
        // Deleting *all* messages between these two users
        // Note: Ideally, you might want to only "hide" them for the deleter, or delete only if both agree.
        // For this request, we'll hard delete the conversation for both to keep it simple as implied "delete chat".
        // Or if we want "delete for me", we need a new column. 
        // Assuming "Delete Chat" means clearing history.
        await db.query(`
            DELETE FROM Chat 
            WHERE (SenderID = ? AND ReceiverID = ?) OR (SenderID = ? AND ReceiverID = ?)
        `, [userId, contactId, contactId, userId]);

        res.json({ message: "Chat deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error deleting chat" });
    }
};

// Get Chat Contacts
const getChatContacts = async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role; // Assuming role is available in request

    try {
        console.log("Fetching contacts for User:", userId, "Role:", userRole);
        let query = `
            SELECT DISTINCT u.UserID AS ContactID, u.FullName AS ContactName, u.Role, s.SubjectName
            FROM Chat c
            JOIN User u ON (c.SenderID = u.UserID OR c.ReceiverID = u.UserID)
            LEFT JOIN TeacherSubject ts ON u.UserID = ts.TeacherID
            LEFT JOIN Subject s ON ts.SubjectID = s.SubjectID
            WHERE (c.SenderID = ? OR c.ReceiverID = ?)
            AND u.UserID != ?
        `;
        const params = [userId, userId, userId];

        // If Tutor, also fetch ALL parents of enrolled students
        if (userRole === 'tutor' || userRole === 'teacher') {
            query += `
                UNION
                SELECT DISTINCT u.UserID AS ContactID, u.FullName AS ContactName, 'parent' as Role, sub.SubjectName
                FROM TeacherSubject ts
                JOIN Subject sub ON ts.SubjectID = sub.SubjectID
                JOIN SubjectGrade sg ON sub.SubjectID = sg.SubjectID
                JOIN Enrollment e ON sg.SubjectGradeID = e.SubjectGradeID
                JOIN Student st ON e.StudentID = st.StudentID
                JOIN User u ON st.ParentID = u.UserID
                WHERE ts.TeacherID = ?
             `;
            params.push(userId);
        }

        const [contacts] = await db.query(query, params);

        console.log("Contacts found:", contacts.length);
        res.json(contacts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching contacts" });
    }
};

// Get Unread Count
const getUnreadCount = async (req, res) => {
    const userId = req.user.id;
    try {
        const [rows] = await db.query(`
            SELECT COUNT(*) as count FROM Chat 
            WHERE ReceiverID = ? AND IsRead = FALSE
        `, [userId]);
        res.json({ count: rows[0].count });
    } catch (err) {
        res.status(500).json({ message: "Error fetching unread count" });
    }
};

// Create Announcement (Admin)
const createAnnouncement = async (req, res) => {
    const { title, content, targetGroup } = req.body;
    // const adminId = req.user.id; // Not needed in new schema if no CreatorID

    try {
        await db.query(
            "INSERT INTO Announcement (Title, Content, Date) VALUES (?, ?, NOW())",
            [title, content]
        );
        res.status(201).json({ message: "Announcement published" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error creating announcement" });
    }
};

// Get Announcements (User)
const getAnnouncements = async (req, res) => {
    try {
        const [announcements] = await db.query("SELECT * FROM Announcement ORDER BY Date DESC");
        res.json(announcements);
    } catch (err) {
        res.status(500).json({ message: "Error fetching announcements" });
    }
};

// Get Notifications
const getNotifications = async (req, res) => {
    const userId = req.user.id;
    try {
        const [notes] = await db.query("SELECT * FROM Communication WHERE Type = 'Notification' AND ReceiverID = ? ORDER BY Timestamp DESC", [userId]);
        res.json(notes);
    } catch (err) {
        res.status(500).json({ message: "Error fetching notifications" });
    }
};

// Create Notification (Internal Helper)
const createNotification = async (receiverId, title, message) => {
    try {
        await db.query(
            "INSERT INTO Communication (Type, ReceiverID, Title, Content) VALUES ('Notification', ?, ?, ?)",
            [receiverId, title, message]
        );
    } catch (err) {
        console.error("Notification Error:", err);
    }
};

module.exports = {
    sendMessage,
    getChatHistory,
    getChatContacts,
    getUnreadCount,
    createAnnouncement,
    getAnnouncements,
    getNotifications,
    createNotification,
    deleteChat
};
